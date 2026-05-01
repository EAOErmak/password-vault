use std::sync::Arc;
use std::thread;
use std::time::Duration;

use zeroize::Zeroize;

use crate::vault::error::VaultError;

pub const DEFAULT_CLIPBOARD_CLEAR_AFTER_SECONDS: u64 = 30;

pub trait ClipboardBackend: Send + Sync + 'static {
    fn get_text(&self) -> Result<Option<String>, VaultError>;
    fn set_text(&self, text: &str) -> Result<(), VaultError>;
    fn clear(&self) -> Result<(), VaultError>;
}

#[derive(Clone)]
pub struct ClipboardService<B: ClipboardBackend> {
    backend: Arc<B>,
}

impl<B: ClipboardBackend> ClipboardService<B> {
    pub fn new(backend: B) -> Self {
        Self {
            backend: Arc::new(backend),
        }
    }

    pub fn copy_text_with_auto_clear(
        &self,
        text: String,
        clear_after_seconds: Option<u64>,
    ) -> Result<(), VaultError> {
        let clear_after = Self::normalize_clear_after_seconds(clear_after_seconds);
        self.copy_text_with_auto_clear_after(text, clear_after)
    }

    fn normalize_clear_after_seconds(clear_after_seconds: Option<u64>) -> Duration {
        let seconds = clear_after_seconds
            .filter(|value| *value > 0)
            .unwrap_or(DEFAULT_CLIPBOARD_CLEAR_AFTER_SECONDS);
        Duration::from_secs(seconds)
    }

    fn copy_text_with_auto_clear_after(
        &self,
        mut text: String,
        clear_after: Duration,
    ) -> Result<(), VaultError> {
        if let Err(error) = self.backend.set_text(&text) {
            text.zeroize();
            return Err(error);
        }

        let backend = Arc::clone(&self.backend);
        thread::Builder::new()
            .name("vault-clipboard-clear".to_string())
            .spawn(move || {
                thread::sleep(clear_after);

                let mut clipboard_text = match backend.get_text() {
                    Ok(Some(current)) => current,
                    Ok(None) | Err(_) => {
                        text.zeroize();
                        return;
                    }
                };

                if clipboard_text == text {
                    let _ = backend.clear();
                }

                clipboard_text.zeroize();
                text.zeroize();
            })?;

        Ok(())
    }
}

impl ClipboardService<SystemClipboardBackend> {
    pub fn system() -> Self {
        Self::new(SystemClipboardBackend)
    }
}

#[derive(Clone, Copy, Default)]
pub struct SystemClipboardBackend;

#[cfg(not(target_os = "windows"))]
impl ClipboardBackend for SystemClipboardBackend {
    fn get_text(&self) -> Result<Option<String>, VaultError> {
        Err(clipboard_unavailable_error())
    }

    fn set_text(&self, _text: &str) -> Result<(), VaultError> {
        Err(clipboard_unavailable_error())
    }

    fn clear(&self) -> Result<(), VaultError> {
        Err(clipboard_unavailable_error())
    }
}

#[cfg(target_os = "windows")]
impl ClipboardBackend for SystemClipboardBackend {
    fn get_text(&self) -> Result<Option<String>, VaultError> {
        read_windows_clipboard_text()
    }

    fn set_text(&self, text: &str) -> Result<(), VaultError> {
        write_windows_clipboard_text(text)
    }

    fn clear(&self) -> Result<(), VaultError> {
        clear_windows_clipboard()
    }
}

fn clipboard_unavailable_error() -> VaultError {
    VaultError::Internal("Clipboard access is unavailable".to_string())
}

fn clipboard_copy_error() -> VaultError {
    VaultError::Internal("Unable to copy the selected secret".to_string())
}

#[cfg(target_os = "windows")]
mod windows_clipboard {
    use std::ptr::{copy_nonoverlapping, null_mut};
    use std::slice;
    use std::thread;
    use std::time::Duration;

    use windows_sys::Win32::Foundation::GlobalFree;
    use windows_sys::Win32::System::DataExchange::{
        CloseClipboard, EmptyClipboard, GetClipboardData, IsClipboardFormatAvailable,
        OpenClipboard, SetClipboardData,
    };
    use windows_sys::Win32::System::Memory::{
        GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE,
    };
    use windows_sys::Win32::System::Ole::CF_UNICODETEXT;

    use crate::clipboard_service::{clipboard_copy_error, clipboard_unavailable_error};
    use crate::vault::error::VaultError;

    const OPEN_CLIPBOARD_ATTEMPTS: usize = 10;
    const OPEN_CLIPBOARD_RETRY_DELAY: Duration = Duration::from_millis(10);

    pub(super) fn read_windows_clipboard_text() -> Result<Option<String>, VaultError> {
        let _clipboard = ClipboardGuard::open()?;

        unsafe {
            if IsClipboardFormatAvailable(CF_UNICODETEXT.into()) == 0 {
                return Ok(None);
            }

            let handle = GetClipboardData(CF_UNICODETEXT.into());
            if handle.is_null() {
                return Err(clipboard_unavailable_error());
            }

            let pointer = GlobalLock(handle) as *const u16;
            if pointer.is_null() {
                return Err(clipboard_unavailable_error());
            }

            let text = read_utf16(pointer);
            let _ = GlobalUnlock(handle);

            Ok(Some(text))
        }
    }

    pub(super) fn write_windows_clipboard_text(text: &str) -> Result<(), VaultError> {
        let wide_text: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
        let _clipboard = ClipboardGuard::open()?;

        unsafe {
            if EmptyClipboard() == 0 {
                return Err(clipboard_copy_error());
            }

            let byte_len = wide_text.len() * std::mem::size_of::<u16>();
            let handle = GlobalAlloc(GMEM_MOVEABLE, byte_len);
            if handle.is_null() {
                return Err(clipboard_copy_error());
            }

            let pointer = GlobalLock(handle) as *mut u16;
            if pointer.is_null() {
                let _ = GlobalFree(handle);
                return Err(clipboard_copy_error());
            }

            copy_nonoverlapping(wide_text.as_ptr(), pointer, wide_text.len());
            let _ = GlobalUnlock(handle);

            if SetClipboardData(CF_UNICODETEXT.into(), handle).is_null() {
                let _ = GlobalFree(handle);
                return Err(clipboard_copy_error());
            }
        }

        Ok(())
    }

    pub(super) fn clear_windows_clipboard() -> Result<(), VaultError> {
        let _clipboard = ClipboardGuard::open()?;

        unsafe {
            if EmptyClipboard() == 0 {
                return Err(clipboard_unavailable_error());
            }
        }

        Ok(())
    }

    struct ClipboardGuard;

    impl ClipboardGuard {
        fn open() -> Result<Self, VaultError> {
            for _ in 0..OPEN_CLIPBOARD_ATTEMPTS {
                unsafe {
                    if OpenClipboard(null_mut()) != 0 {
                        return Ok(Self);
                    }
                }

                thread::sleep(OPEN_CLIPBOARD_RETRY_DELAY);
            }

            Err(clipboard_unavailable_error())
        }
    }

    impl Drop for ClipboardGuard {
        fn drop(&mut self) {
            unsafe {
                let _ = CloseClipboard();
            }
        }
    }

    unsafe fn read_utf16(pointer: *const u16) -> String {
        let mut length = 0usize;
        while unsafe { *pointer.add(length) } != 0 {
            length += 1;
        }

        let slice = unsafe { slice::from_raw_parts(pointer, length) };
        String::from_utf16_lossy(slice)
    }
}

#[cfg(target_os = "windows")]
use windows_clipboard::{
    clear_windows_clipboard, read_windows_clipboard_text, write_windows_clipboard_text,
};

#[cfg(test)]
mod tests {
    use std::sync::{Arc, Mutex};
    use std::thread;
    use std::time::Duration;

    use super::{ClipboardBackend, ClipboardService, DEFAULT_CLIPBOARD_CLEAR_AFTER_SECONDS};
    use crate::vault::error::VaultError;

    #[derive(Clone, Default)]
    struct FakeClipboardBackend {
        state: Arc<Mutex<FakeClipboardState>>,
    }

    #[derive(Default)]
    struct FakeClipboardState {
        text: Option<String>,
        fail_read: bool,
        fail_write: bool,
        fail_clear: bool,
    }

    impl FakeClipboardBackend {
        fn current_text(&self) -> Option<String> {
            self.state.lock().unwrap().text.clone()
        }

        fn replace_text(&self, text: Option<&str>) {
            self.state.lock().unwrap().text = text.map(str::to_string);
        }

        fn set_fail_write(&self, fail_write: bool) {
            self.state.lock().unwrap().fail_write = fail_write;
        }
    }

    impl ClipboardBackend for FakeClipboardBackend {
        fn get_text(&self) -> Result<Option<String>, VaultError> {
            let state = self.state.lock().unwrap();
            if state.fail_read {
                Err(VaultError::Internal(
                    "Clipboard access is unavailable".to_string(),
                ))
            } else {
                Ok(state.text.clone())
            }
        }

        fn set_text(&self, text: &str) -> Result<(), VaultError> {
            let mut state = self.state.lock().unwrap();
            if state.fail_write {
                Err(VaultError::Internal(
                    "Unable to copy the selected secret".to_string(),
                ))
            } else {
                state.text = Some(text.to_string());
                Ok(())
            }
        }

        fn clear(&self) -> Result<(), VaultError> {
            let mut state = self.state.lock().unwrap();
            if state.fail_clear {
                Err(VaultError::Internal(
                    "Clipboard access is unavailable".to_string(),
                ))
            } else {
                state.text = None;
                Ok(())
            }
        }
    }

    #[test]
    fn defaults_clipboard_clear_timeout_to_thirty_seconds() {
        let clear_after =
            ClipboardService::<FakeClipboardBackend>::normalize_clear_after_seconds(None);
        let zero_timeout =
            ClipboardService::<FakeClipboardBackend>::normalize_clear_after_seconds(Some(0));

        assert_eq!(
            clear_after,
            Duration::from_secs(DEFAULT_CLIPBOARD_CLEAR_AFTER_SECONDS)
        );
        assert_eq!(
            zero_timeout,
            Duration::from_secs(DEFAULT_CLIPBOARD_CLEAR_AFTER_SECONDS)
        );
    }

    #[test]
    fn copies_text_immediately() {
        let backend = FakeClipboardBackend::default();
        let service = ClipboardService::new(backend.clone());

        service
            .copy_text_with_auto_clear_after("copy-now".to_string(), Duration::from_millis(100))
            .unwrap();

        assert_eq!(backend.current_text().as_deref(), Some("copy-now"));
    }

    #[test]
    fn clears_matching_clipboard_text_after_timeout() {
        let backend = FakeClipboardBackend::default();
        let service = ClipboardService::new(backend.clone());

        service
            .copy_text_with_auto_clear_after("clear-me".to_string(), Duration::from_millis(20))
            .unwrap();
        thread::sleep(Duration::from_millis(80));

        assert_eq!(backend.current_text(), None);
    }

    #[test]
    fn does_not_clear_newer_clipboard_content() {
        let backend = FakeClipboardBackend::default();
        let service = ClipboardService::new(backend.clone());

        service
            .copy_text_with_auto_clear_after("old-secret".to_string(), Duration::from_millis(40))
            .unwrap();
        backend.replace_text(Some("new-user-copy"));
        thread::sleep(Duration::from_millis(100));

        assert_eq!(backend.current_text().as_deref(), Some("new-user-copy"));
    }

    #[test]
    fn returns_copy_error_when_initial_write_fails() {
        let backend = FakeClipboardBackend::default();
        backend.set_fail_write(true);
        let service = ClipboardService::new(backend);

        let error = service
            .copy_text_with_auto_clear_after("will-fail".to_string(), Duration::from_millis(20))
            .unwrap_err();

        assert!(error
            .to_string()
            .contains("Unable to copy the selected secret"));
    }
}
