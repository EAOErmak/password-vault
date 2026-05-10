use std::path::PathBuf;
use std::sync::Mutex;
use std::time::SystemTime;

use rusqlite::Connection;

use crate::vault::error::VaultError;

#[derive(Debug, Clone, Default)]
pub struct VaultStateSnapshot {
    pub is_unlocked: bool,
    pub path: Option<PathBuf>,
}

struct VaultSession {
    path: PathBuf,
    connection: Connection,
}

#[derive(Default)]
pub struct AppState {
    vault_session: Mutex<Option<VaultSession>>,
}

impl AppState {
    pub fn set_session(&self, path: PathBuf, connection: Connection) -> Result<(), VaultError> {
        let mut session = self
            .vault_session
            .lock()
            .map_err(|_| VaultError::Internal("vault session lock poisoned".to_string()))?;

        *session = Some(VaultSession { path, connection });
        Ok(())
    }

    pub fn clear_session(&self) -> Result<(), VaultError> {
        let mut session = self
            .vault_session
            .lock()
            .map_err(|_| VaultError::Internal("vault session lock poisoned".to_string()))?;

        *session = None;
        Ok(())
    }

    pub fn snapshot(&self) -> Result<VaultStateSnapshot, VaultError> {
        let session = self
            .vault_session
            .lock()
            .map_err(|_| VaultError::Internal("vault session lock poisoned".to_string()))?;

        Ok(match session.as_ref() {
            Some(current) => VaultStateSnapshot {
                is_unlocked: true,
                path: Some(current.path.clone()),
            },
            None => VaultStateSnapshot::default(),
        })
    }

    pub fn with_connection<T, F>(&self, operation: F) -> Result<T, VaultError>
    where
        F: FnOnce(&Connection) -> Result<T, VaultError>,
    {
        let session = self
            .vault_session
            .lock()
            .map_err(|_| VaultError::Internal("vault session lock poisoned".to_string()))?;

        let connection = &session.as_ref().ok_or(VaultError::VaultLocked)?.connection;

        operation(connection)
    }

    pub fn with_connection_mut<T, F>(&self, operation: F) -> Result<T, VaultError>
    where
        F: FnOnce(&mut Connection) -> Result<T, VaultError>,
    {
        let mut session = self
            .vault_session
            .lock()
            .map_err(|_| VaultError::Internal("vault session lock poisoned".to_string()))?;

        let connection = &mut session.as_mut().ok_or(VaultError::VaultLocked)?.connection;

        operation(connection)
    }
}
