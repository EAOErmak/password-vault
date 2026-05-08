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
        println!("KeychainService: Storing session in keychain...");
        let entry = Entry::new(KEYCHAIN_SERVICE_NAME, KEYCHAIN_ACCOUNT_NAME)
            .map_err(|e| {
                println!("KeychainService: Failed to access OS Keychain: {}", e);
                VaultError::Internal(format!("Failed to access OS Keychain: {}", e))
            })?;

        let json = serde_json::to_string(payload)
            .map_err(|e| {
                println!("KeychainService: Failed to serialize payload: {}", e);
                VaultError::Internal(format!("Failed to serialize payload: {}", e))
            })?;

        entry
            .set_password(&json)
            .map_err(|e| {
                println!("KeychainService: Failed to store in OS Keychain: {}", e);
                VaultError::Internal(format!("Failed to store in OS Keychain: {}", e))
            })?;

        println!("KeychainService: Session stored successfully.");
        Ok(())
    }

    pub fn get_session() -> Result<Option<AutoUnlockPayload>, VaultError> {
        println!("KeychainService: Retrieving session from keychain...");
        let entry = Entry::new(KEYCHAIN_SERVICE_NAME, KEYCHAIN_ACCOUNT_NAME)
            .map_err(|e| {
                println!("KeychainService: Failed to access OS Keychain: {}", e);
                VaultError::Internal(format!("Failed to access OS Keychain: {}", e))
            })?;

        match entry.get_password() {
            Ok(json) => {
                println!("KeychainService: Session found in keychain.");
                let payload: AutoUnlockPayload = serde_json::from_str(&json).map_err(|e| {
                    println!("KeychainService: Failed to deserialize payload: {}", e);
                    VaultError::Internal(format!("Failed to deserialize payload: {}", e))
                })?;
                Ok(Some(payload))
            }
            Err(keyring::Error::NoEntry) => {
                println!("KeychainService: No session found in keychain.");
                Ok(None)
            }
            Err(e) => {
                println!("KeychainService: Failed to retrieve from OS Keychain: {}", e);
                Err(VaultError::Internal(format!(
                    "Failed to retrieve from OS Keychain: {}",
                    e
                )))
            }
        }
    }

    pub fn clear_session() -> Result<(), VaultError> {
        println!("KeychainService: Clearing session from keychain...");
        let entry = Entry::new(KEYCHAIN_SERVICE_NAME, KEYCHAIN_ACCOUNT_NAME)
            .map_err(|e| {
                println!("KeychainService: Failed to access OS Keychain: {}", e);
                VaultError::Internal(format!("Failed to access OS Keychain: {}", e))
            })?;

        match entry.delete_credential() {
            Ok(_) => {
                println!("KeychainService: Session cleared successfully.");
                Ok(())
            }
            Err(keyring::Error::NoEntry) => {
                println!("KeychainService: No session to clear.");
                Ok(())
            }
            Err(e) => {
                println!("KeychainService: Failed to delete from OS Keychain: {}", e);
                Err(VaultError::Internal(format!(
                    "Failed to delete from OS Keychain: {}",
                    e
                )))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keychain_store_and_retrieve() {
        let payload = AutoUnlockPayload {
            master_password: "test_password".to_string(),
            path: "test_path".to_string(),
            expires_at: 1234567890,
        };

        // Ensure we start with a clean state
        let _ = KeychainService::clear_session();

        KeychainService::store_session(&payload).unwrap();
        let retrieved = KeychainService::get_session().unwrap().unwrap();
        assert_eq!(retrieved.master_password, payload.master_password);
        assert_eq!(retrieved.path, payload.path);
        assert_eq!(retrieved.expires_at, payload.expires_at);

        KeychainService::clear_session().unwrap();
        let cleared = KeychainService::get_session().unwrap();
        assert!(cleared.is_none());
    }
}
