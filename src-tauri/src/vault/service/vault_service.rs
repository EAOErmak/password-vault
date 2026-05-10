use std::fs;
use std::path::{Path, PathBuf};

use chrono::Utc;

use crate::app_state::AppState;
use crate::vault::db::connection::{create_encrypted_database, open_encrypted_database};
use crate::vault::dto::backup_dto::{ExportEncryptedBackupDto, RestoreEncryptedBackupDto};
use crate::vault::dto::VaultStatusDto;
use crate::vault::error::VaultError;
use crate::vault::service::keychain_service::{AutoUnlockPayload, KeychainService};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct VaultService;

const EXPORT_BACKUP_FILE_PREFIX: &str = "vault-backup";
const PRE_RESTORE_BACKUP_FILE_PREFIX: &str = "vault-pre-restore-backup";
const RESTORE_STAGING_FILE_PREFIX: &str = "vault-restore-staging";

impl VaultService {
    pub fn create_vault(
        &self,
        state: &AppState,
        path: &str,
        master_password: &str,
    ) -> Result<VaultStatusDto, VaultError> {
        self.validate_master_password(master_password)?;
        let path = self.parse_path(path)?;
        let connection = create_encrypted_database(&path, master_password)?;
        state.set_session(path, connection)?;
        self.get_vault_status(state)
    }

    pub fn unlock_vault(
        &self,
        state: &AppState,
        path: &str,
        master_password: &str,
    ) -> Result<VaultStatusDto, VaultError> {
        self.validate_master_password(master_password)?;
        let path_buf = self.parse_path(path)?;
        let attempts_path = path_buf.with_extension("db.attempts");

        // Read attempts from file
        let mut count = 0;
        if attempts_path.exists() {
            if let Ok(content) = fs::read_to_string(&attempts_path) {
                count = content.trim().parse::<u32>().unwrap_or(0);
            }
        }

        // Apply delay if count >= 1
        if count >= 1 {
            let delay_secs = match count {
                1 => 10,
                2 => 60,      // 1 minute
                3 => 300,     // 5 minutes
                4 => 1800,    // 30 minutes
                _ => 86400,   // 1 day
            };
            
            println!("Brute-force protection: sleeping for {} seconds", delay_secs);
            std::thread::sleep(std::time::Duration::from_secs(delay_secs));
        }

        let connection_result = open_encrypted_database(&path_buf, master_password);

        match connection_result {
            Ok(connection) => {
                // Success! Reset attempts
                let _ = fs::remove_file(&attempts_path);

                state.set_session(path_buf, connection)?;
                self.get_vault_status(state)
            }
            Err(e) => {
                // Failure! Increment attempts
                count += 1;
                let _ = fs::write(&attempts_path, count.to_string());
                
                Err(e)
            }
        }
    }

    pub fn lock_vault(&self, state: &AppState) -> Result<VaultStatusDto, VaultError> {
        state.clear_session()?;
        let _ = KeychainService::clear_session(); // ignore error if not found
        self.get_vault_status(state)
    }

    pub fn store_auto_unlock(
        &self,
        path: &str,
        master_password: &str,
        expires_in_ms: u64,
    ) -> Result<(), VaultError> {
        println!("VaultService: store_auto_unlock called with expires_in_ms: {}", expires_in_ms);
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| VaultError::Internal(e.to_string()))?
            .as_millis() as u64;

        let payload = AutoUnlockPayload {
            master_password: master_password.to_string(),
            path: self.parse_path(path)?.display().to_string(),
            expires_at: now + expires_in_ms,
        };

        KeychainService::store_session(&payload)
    }

    pub fn attempt_auto_unlock(&self, state: &AppState) -> Result<VaultStatusDto, VaultError> {
        println!("VaultService: attempt_auto_unlock called");
        if let Some(mut payload) = KeychainService::get_session()? {
            println!("VaultService: found session payload");
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|e| VaultError::Internal(e.to_string()))?
                .as_millis() as u64;

            println!("VaultService: now={}, expires_at={}", now, payload.expires_at);
            if now < payload.expires_at {
                println!("VaultService: session is valid, attempting unlock");
                let result = self.unlock_vault(state, &payload.path, &payload.master_password);
                use zeroize::Zeroize;
                payload.master_password.zeroize();

                if result.is_err() {
                    let _ = KeychainService::clear_session();
                }
                return result;
            } else {
                let _ = KeychainService::clear_session();
                use zeroize::Zeroize;
                payload.master_password.zeroize();
            }
        }

        self.get_vault_status(state)
    }

    pub fn export_encrypted_backup(
        &self,
        state: &AppState,
        destination_path: Option<&str>,
    ) -> Result<ExportEncryptedBackupDto, VaultError> {
        let vault_path = self.get_active_vault_path(state)?;
        self.ensure_existing_file(
            &vault_path,
            "the active vault file could not be found for backup export",
        )?;
        self.checkpoint_active_vault(state)?;

        let backup_path = self.resolve_export_destination(&vault_path, destination_path)?;
        self.ensure_paths_differ(
            &vault_path,
            &backup_path,
            "backup destination must be different from the active vault file",
        )?;
        self.copy_file(
            &vault_path,
            &backup_path,
            "unable to export encrypted backup",
        )?;

        Ok(ExportEncryptedBackupDto {
            backup_path: backup_path.display().to_string(),
        })
    }

    pub fn restore_encrypted_backup(
        &self,
        state: &AppState,
        source_path: &str,
    ) -> Result<RestoreEncryptedBackupDto, VaultError> {
        let current_vault_path = self.get_active_vault_path(state)?;
        self.ensure_existing_file(
            &current_vault_path,
            "the active vault file could not be found for restore",
        )?;

        let source_path = self.parse_existing_path(
            source_path,
            "backup source path cannot be empty",
            "encrypted backup file not found",
        )?;
        self.ensure_paths_differ(
            &current_vault_path,
            &source_path,
            "backup source must be different from the active vault file",
        )?;

        let vault_directory = self.parent_directory(&current_vault_path);
        let staging_path =
            self.build_timestamped_path(vault_directory, RESTORE_STAGING_FILE_PREFIX, "db");
        let safety_backup_path =
            self.build_timestamped_path(vault_directory, PRE_RESTORE_BACKUP_FILE_PREFIX, "db");

        self.copy_file(
            &source_path,
            &staging_path,
            "unable to prepare the encrypted backup for restore",
        )?;
        self.checkpoint_active_vault(state)?;
        self.copy_file(
            &current_vault_path,
            &safety_backup_path,
            "unable to create a safety backup before restore",
        )?;

        state.clear_session()?;

        let restore_result = self.copy_file(
            &staging_path,
            &current_vault_path,
            "unable to restore encrypted backup",
        );
        let cleanup_result = self.remove_file_if_exists(&staging_path);

        match restore_result {
            Ok(()) => {
                let _ = cleanup_result;
                Ok(RestoreEncryptedBackupDto {
                    restored_path: current_vault_path.display().to_string(),
                    safety_backup_path: safety_backup_path.display().to_string(),
                })
            }
            Err(restore_error) => {
                let rollback_result = self.copy_file(
                    &safety_backup_path,
                    &current_vault_path,
                    "unable to restore the previous vault from the safety backup",
                );
                let _ = cleanup_result;

                if rollback_result.is_err() {
                    return Err(VaultError::Internal(
                        "unable to restore encrypted backup and the previous vault safety backup could not be reapplied"
                            .to_string(),
                    ));
                }

                Err(restore_error)
            }
        }
    }

    pub fn get_vault_status(&self, state: &AppState) -> Result<VaultStatusDto, VaultError> {
        let snapshot = state.snapshot()?;
        Ok(VaultStatusDto {
            is_unlocked: snapshot.is_unlocked,
            path: snapshot.path.map(|path| path.display().to_string()),
        })
    }

    fn parse_path(&self, path: &str) -> Result<PathBuf, VaultError> {
        let trimmed = path.trim();
        if trimmed.is_empty() {
            return Err(VaultError::Validation(
                "vault path cannot be empty".to_string(),
            ));
        }

        Ok(PathBuf::from(trimmed))
    }

    fn validate_master_password(&self, master_password: &str) -> Result<(), VaultError> {
        if master_password.is_empty() {
            Err(VaultError::Validation(
                "master password cannot be empty".to_string(),
            ))
        } else {
            Ok(())
        }
    }

    fn get_active_vault_path(&self, state: &AppState) -> Result<PathBuf, VaultError> {
        state.snapshot()?.path.ok_or(VaultError::VaultLocked)
    }

    fn checkpoint_active_vault(&self, state: &AppState) -> Result<(), VaultError> {
        state.with_connection_mut(|connection| {
            connection.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
            Ok(())
        })
    }

    fn parse_existing_path(
        &self,
        path: &str,
        empty_message: &str,
        missing_message: &str,
    ) -> Result<PathBuf, VaultError> {
        let path = self.parse_path(path).map_err(|error| match error {
            VaultError::Validation(_) => VaultError::Validation(empty_message.to_string()),
            other => other,
        })?;
        self.ensure_existing_file(&path, missing_message)?;
        Ok(path)
    }

    fn ensure_existing_file(&self, path: &Path, message: &str) -> Result<(), VaultError> {
        if path.is_file() {
            Ok(())
        } else {
            Err(VaultError::NotFound(message.to_string()))
        }
    }

    fn resolve_export_destination(
        &self,
        current_vault_path: &Path,
        destination_path: Option<&str>,
    ) -> Result<PathBuf, VaultError> {
        let fallback_directory = self.parent_directory(current_vault_path);

        match destination_path.and_then(|value| {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            }
        }) {
            None => Ok(self.build_timestamped_path(
                fallback_directory,
                EXPORT_BACKUP_FILE_PREFIX,
                "db",
            )),
            Some(path) => {
                let destination = PathBuf::from(path);
                if destination.is_dir() {
                    Ok(self.build_timestamped_path(&destination, EXPORT_BACKUP_FILE_PREFIX, "db"))
                } else {
                    Ok(destination)
                }
            }
        }
    }

    fn build_timestamped_path(&self, directory: &Path, prefix: &str, extension: &str) -> PathBuf {
        let timestamp = Utc::now().format("%Y-%m-%d-%H-%M").to_string();
        let base_name = format!("{prefix}-{timestamp}");
        let mut candidate = directory.join(format!("{base_name}.{extension}"));
        let mut suffix = 2;

        while candidate.exists() {
            candidate = directory.join(format!("{base_name}-{suffix}.{extension}"));
            suffix += 1;
        }

        candidate
    }

    fn ensure_paths_differ(
        &self,
        left: &Path,
        right: &Path,
        message: &str,
    ) -> Result<(), VaultError> {
        if left == right {
            return Err(VaultError::Validation(message.to_string()));
        }

        if left.exists() && right.exists() && fs::canonicalize(left)? == fs::canonicalize(right)? {
            return Err(VaultError::Validation(message.to_string()));
        }

        Ok(())
    }

    fn copy_file(
        &self,
        source: &Path,
        destination: &Path,
        message: &str,
    ) -> Result<(), VaultError> {
        if let Some(parent) = destination.parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent)?;
            }
        }

        fs::copy(source, destination)
            .map(|_| ())
            .map_err(|_| VaultError::Internal(message.to_string()))
    }

    fn remove_file_if_exists(&self, path: &Path) -> Result<(), VaultError> {
        if path.exists() {
            fs::remove_file(path)?;
        }

        Ok(())
    }

    fn parent_directory<'a>(&self, path: &'a Path) -> &'a Path {
        path.parent()
            .filter(|parent| !parent.as_os_str().is_empty())
            .unwrap_or(Path::new("."))
    }
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::PathBuf;

    use tempfile::TempDir;

    use crate::app_state::AppState;
    use crate::vault::error::VaultError;
    use crate::vault::service::platform_service::PlatformService;
    use crate::vault::service::vault_service::VaultService;

    const CURRENT_MASTER_PASSWORD: &str = "current-password";
    const RESTORED_MASTER_PASSWORD: &str = "restored-password";

    #[test]
    fn export_encrypted_backup_creates_a_timestamped_encrypted_copy() {
        let temp_dir = TempDir::new().unwrap();
        let vault_path = temp_dir.path().join("vault.db");
        let state = AppState::default();
        let service = VaultService;

        service
            .create_vault(
                &state,
                vault_path.to_str().unwrap(),
                CURRENT_MASTER_PASSWORD,
            )
            .unwrap();

        let export = service.export_encrypted_backup(&state, None).unwrap();
        let backup_path = PathBuf::from(export.backup_path);
        let file_name = backup_path.file_name().unwrap().to_string_lossy();
        let bytes = fs::read(&backup_path).unwrap();

        assert!(backup_path.exists());
        assert!(file_name.starts_with("vault-backup-"));
        assert!(file_name.ends_with(".db"));
        assert_ne!(&bytes[..16], b"SQLite format 3\0");
    }

    #[test]
    fn restored_vault_requires_unlock_and_preserves_encrypted_data() {
        let temp_dir = TempDir::new().unwrap();
        let source_vault_path = temp_dir.path().join("source-vault.db");
        let source_backup_path = temp_dir.path().join("source-backup.db");
        let target_vault_path = temp_dir.path().join("target-vault.db");

        let source_state = AppState::default();
        let target_state = AppState::default();
        let service = VaultService;

        service
            .create_vault(
                &source_state,
                source_vault_path.to_str().unwrap(),
                RESTORED_MASTER_PASSWORD,
            )
            .unwrap();
        PlatformService
            .create_platform(&source_state, "Restored Platform")
            .unwrap();
        let export = service
            .export_encrypted_backup(&source_state, Some(source_backup_path.to_str().unwrap()))
            .unwrap();

        service
            .create_vault(
                &target_state,
                target_vault_path.to_str().unwrap(),
                CURRENT_MASTER_PASSWORD,
            )
            .unwrap();
        PlatformService
            .create_platform(&target_state, "Current Platform")
            .unwrap();

        let restore = service
            .restore_encrypted_backup(&target_state, &export.backup_path)
            .unwrap();
        let restored_bytes = fs::read(&target_vault_path).unwrap();

        assert_eq!(restore.restored_path, target_vault_path.to_string_lossy());
        assert!(PathBuf::from(&restore.safety_backup_path).exists());
        assert_ne!(&restored_bytes[..16], b"SQLite format 3\0");
        assert!(!service.get_vault_status(&target_state).unwrap().is_unlocked);

        service
            .unlock_vault(
                &target_state,
                target_vault_path.to_str().unwrap(),
                RESTORED_MASTER_PASSWORD,
            )
            .unwrap();
        let platforms = PlatformService.list_platforms(&target_state).unwrap();

        assert_eq!(platforms.len(), 1);
        assert_eq!(platforms[0].name, "Restored Platform");
    }

    #[test]
    fn wrong_password_is_still_rejected_after_restore() {
        let temp_dir = TempDir::new().unwrap();
        let source_vault_path = temp_dir.path().join("source-vault.db");
        let source_backup_path = temp_dir.path().join("source-backup.db");
        let target_vault_path = temp_dir.path().join("target-vault.db");

        let source_state = AppState::default();
        let target_state = AppState::default();
        let service = VaultService;

        service
            .create_vault(
                &source_state,
                source_vault_path.to_str().unwrap(),
                RESTORED_MASTER_PASSWORD,
            )
            .unwrap();
        service
            .export_encrypted_backup(&source_state, Some(source_backup_path.to_str().unwrap()))
            .unwrap();

        service
            .create_vault(
                &target_state,
                target_vault_path.to_str().unwrap(),
                CURRENT_MASTER_PASSWORD,
            )
            .unwrap();
        service
            .restore_encrypted_backup(&target_state, source_backup_path.to_str().unwrap())
            .unwrap();

        let error = service
            .unlock_vault(
                &target_state,
                target_vault_path.to_str().unwrap(),
                CURRENT_MASTER_PASSWORD,
            )
            .unwrap_err();

        assert!(matches!(error, VaultError::InvalidMasterPassword));
    }
}
