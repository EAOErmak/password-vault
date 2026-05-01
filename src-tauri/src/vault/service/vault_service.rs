use std::path::PathBuf;

use crate::app_state::AppState;
use crate::vault::db::connection::{create_encrypted_database, open_encrypted_database};
use crate::vault::dto::VaultStatusDto;
use crate::vault::error::VaultError;

pub struct VaultService;

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
        let path = self.parse_path(path)?;
        let connection = open_encrypted_database(&path, master_password)?;
        state.set_session(path, connection)?;
        self.get_vault_status(state)
    }

    pub fn lock_vault(&self, state: &AppState) -> Result<VaultStatusDto, VaultError> {
        state.clear_session()?;
        self.get_vault_status(state)
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
}
