use keyring::Entry;
use serde::{Deserialize, Serialize};

use crate::vault::error::VaultError;

const KEYCHAIN_SERVICE_NAME: &str = "PasswordVaultApp";
const KEYCHAIN_ACCOUNT_NAME: &str = "AutoUnlockSession";

#[derive(Serialize, Deserialize)]
pub struct AutoUnlockPayload {
    pub master_password: String,
    pub path: String,
    pub expires_at: u64, // unix timestamp in ms
}

pub struct KeychainService;

impl KeychainService {
    pub fn store_session(payload: &AutoUnlockPayload) -> Result<(), VaultError> {
        let entry = Entry::new(KEYCHAIN_SERVICE_NAME, KEYCHAIN_ACCOUNT_NAME)
            .map_err(|e| VaultError::Internal(format!("Failed to access OS Keychain: {}", e)))?;

        let json = serde_json::to_string(payload)
            .map_err(|e| VaultError::Internal(format!("Failed to serialize payload: {}", e)))?;

        entry
            .set_password(&json)
            .map_err(|e| VaultError::Internal(format!("Failed to store in OS Keychain: {}", e)))?;

        Ok(())
    }

    pub fn get_session() -> Result<Option<AutoUnlockPayload>, VaultError> {
        let entry = Entry::new(KEYCHAIN_SERVICE_NAME, KEYCHAIN_ACCOUNT_NAME)
            .map_err(|e| VaultError::Internal(format!("Failed to access OS Keychain: {}", e)))?;

        match entry.get_password() {
            Ok(json) => {
                let payload: AutoUnlockPayload = serde_json::from_str(&json).map_err(|e| {
                    VaultError::Internal(format!("Failed to deserialize payload: {}", e))
                })?;
                Ok(Some(payload))
            }
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(VaultError::Internal(format!(
                "Failed to retrieve from OS Keychain: {}",
                e
            ))),
        }
    }

    pub fn clear_session() -> Result<(), VaultError> {
        let entry = Entry::new(KEYCHAIN_SERVICE_NAME, KEYCHAIN_ACCOUNT_NAME)
            .map_err(|e| VaultError::Internal(format!("Failed to access OS Keychain: {}", e)))?;

        match entry.delete_credential() {
            Ok(_) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(VaultError::Internal(format!(
                "Failed to delete from OS Keychain: {}",
                e
            ))),
        }
    }
}
