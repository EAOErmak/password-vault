pub mod db;
pub mod domain;
pub mod dto;
pub mod error;
pub mod repository;
pub mod service;

use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::vault::error::VaultError;

pub(crate) fn now_utc() -> DateTime<Utc> {
    Utc::now()
}

pub(crate) fn to_timestamp(value: &DateTime<Utc>) -> String {
    value.to_rfc3339()
}

pub(crate) fn parse_timestamp(value: &str) -> Result<DateTime<Utc>, VaultError> {
    DateTime::parse_from_rfc3339(value)
        .map(|timestamp| timestamp.with_timezone(&Utc))
        .map_err(|_| VaultError::Internal(format!("invalid timestamp stored in database: {value}")))
}

pub(crate) fn parse_optional_timestamp(
    value: Option<String>,
) -> Result<Option<DateTime<Utc>>, VaultError> {
    value
        .map(|timestamp| parse_timestamp(&timestamp))
        .transpose()
}

pub(crate) fn parse_uuid(value: &str) -> Result<Uuid, VaultError> {
    Uuid::parse_str(value)
        .map_err(|_| VaultError::Internal(format!("invalid uuid stored in database: {value}")))
}

pub(crate) fn normalize_platform_name(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_ascii_lowercase()
}

#[cfg(test)]
mod tests {
    use std::fs;

    use rusqlite::params;
    use tempfile::TempDir;
    use uuid::Uuid;

    use crate::app_state::AppState;
    use crate::vault::domain::{AccountValueType, SecretType};
    use crate::vault::dto::account_dto::{CreateAccountRequest, ListAccountsFilter};
    use crate::vault::dto::history_dto::{AccountValueHistoryDto, SecretHistoryDto};
    use crate::vault::dto::secret_dto::{AddSecretRequest, UpdateSecretRequest};
    use crate::vault::dto::value_dto::{AddAccountValueRequest, UpdateAccountValueRequest};
    use crate::vault::error::VaultError;
    use crate::vault::service::account_service::AccountService;
    use crate::vault::service::platform_service::PlatformService;
    use crate::vault::service::secret_service::SecretService;
    use crate::vault::service::value_service::ValueService;
    use crate::vault::service::vault_service::VaultService;

    const MASTER_PASSWORD: &str = "correct horse battery staple";

    #[test]
    fn creating_encrypted_vault_database() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("vault.db");
        let state = AppState::default();
        let vault_service = VaultService;

        let status = vault_service
            .create_vault(&state, db_path.to_str().unwrap(), MASTER_PASSWORD)
            .unwrap();

        assert!(status.is_unlocked);
        assert!(db_path.exists());

        let bytes = fs::read(&db_path).unwrap();
        assert_ne!(&bytes[..16], b"SQLite format 3\0");
    }

    #[test]
    fn unlocking_vault_with_correct_master_password() {
        let (_temp_dir, state, db_path) = setup_unlocked_vault();
        let vault_service = VaultService;

        vault_service.lock_vault(&state).unwrap();
        let status = vault_service
            .unlock_vault(&state, &db_path, MASTER_PASSWORD)
            .unwrap();

        assert!(status.is_unlocked);
        assert_eq!(status.path.as_deref(), Some(db_path.as_str()));
    }

    #[test]
    fn rejecting_wrong_master_password() {
        let (_temp_dir, state, db_path) = setup_unlocked_vault();
        let vault_service = VaultService;

        vault_service.lock_vault(&state).unwrap();
        let error = vault_service
            .unlock_vault(&state, &db_path, "wrong-password")
            .unwrap_err();

        assert!(matches!(error, VaultError::InvalidMasterPassword));
    }

    #[test]
    fn rejecting_non_vault_database_on_unlock() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("not-a-vault.db");
        let state = AppState::default();
        let vault_service = VaultService;
        let encrypted_connection = rusqlite::Connection::open_with_flags(
            &db_path,
            rusqlite::OpenFlags::SQLITE_OPEN_CREATE | rusqlite::OpenFlags::SQLITE_OPEN_READ_WRITE,
        )
        .unwrap();

        encrypted_connection
            .pragma_update(None, "key", MASTER_PASSWORD)
            .unwrap();
        encrypted_connection
            .execute("CREATE TABLE sample (id INTEGER PRIMARY KEY)", [])
            .unwrap();
        drop(encrypted_connection);

        let error = vault_service
            .unlock_vault(&state, db_path.to_str().unwrap(), MASTER_PASSWORD)
            .unwrap_err();

        assert!(matches!(error, VaultError::InvalidVaultFile));
    }

    #[test]
    fn rejecting_empty_master_password() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("vault.db");
        let state = AppState::default();
        let vault_service = VaultService;

        let error = vault_service
            .create_vault(&state, db_path.to_str().unwrap(), "")
            .unwrap_err();

        assert!(matches!(error, VaultError::Validation(_)));
    }

    #[test]
    fn creating_platform() {
        let (_temp_dir, state, _db_path) = setup_unlocked_vault();
        let platform_service = PlatformService;

        let platform = platform_service.create_platform(&state, "GitHub").unwrap();
        let platforms = platform_service.list_platforms(&state).unwrap();

        assert_eq!(platform.name, "GitHub");
        assert_eq!(platform.normalized_name, "github");
        assert_eq!(platforms.len(), 1);
    }

    #[test]
    fn creating_account() {
        let (_temp_dir, state, _db_path) = setup_unlocked_vault();
        let platform = create_platform(&state, "GitHub");
        let account_service = AccountService;

        let account = account_service
            .create_account(
                &state,
                &CreateAccountRequest {
                    name: Some("Work GitHub".to_string()),
                    platform_id: platform.id,
                    notes: Some("Primary developer account".to_string()),
                },
            )
            .unwrap();

        assert_eq!(account.name.as_deref(), Some("Work GitHub"));
        assert_eq!(account.platform.id, platform.id);
        assert_eq!(account.notes.as_deref(), Some("Primary developer account"));
    }

    #[test]
    fn adding_multiple_account_values_to_one_account() {
        let (_temp_dir, state, _db_path) = setup_unlocked_vault();
        let platform = create_platform(&state, "GitHub");
        let account = create_account(&state, platform.id);
        let value_service = ValueService;

        value_service
            .add_account_value(
                &state,
                account.id,
                &AddAccountValueRequest {
                    value_type: AccountValueType::Email,
                    label: "Work email".to_string(),
                    value: "dev@example.com".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();
        value_service
            .add_account_value(
                &state,
                account.id,
                &AddAccountValueRequest {
                    value_type: AccountValueType::Username,
                    label: "Username".to_string(),
                    value: "dev-user".to_string(),
                    is_primary: false,
                },
            )
            .unwrap();

        let details = AccountService
            .get_account_details(&state, account.id)
            .unwrap();

        assert_eq!(details.values.len(), 2);
    }

    #[test]
    fn adding_password_secret() {
        let (_temp_dir, state, _db_path) = setup_unlocked_vault();
        let platform = create_platform(&state, "GitHub");
        let account = create_account(&state, platform.id);
        let secret_service = SecretService;

        let metadata = secret_service
            .add_secret(
                &state,
                account.id,
                &AddSecretRequest {
                    secret_type: SecretType::Password,
                    label: "Password".to_string(),
                    secret_value: "super-secret-password".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();

        let revealed = secret_service.reveal_secret(&state, metadata.id).unwrap();

        assert_eq!(metadata.secret_type, SecretType::Password);
        assert_eq!(revealed.secret_value, "super-secret-password");
    }

    #[test]
    fn adding_backup_code_secret() {
        let (_temp_dir, state, _db_path) = setup_unlocked_vault();
        let platform = create_platform(&state, "GitHub");
        let account = create_account(&state, platform.id);
        let secret_service = SecretService;

        let backup_codes = secret_service
            .add_secret(
                &state,
                account.id,
                &AddSecretRequest {
                    secret_type: SecretType::BackupCode,
                    label: "Backup codes".to_string(),
                    secret_value: "code-one,code-two".to_string(),
                    is_primary: false,
                },
            )
            .unwrap();

        let details = AccountService
            .get_account_details(&state, account.id)
            .unwrap();

        assert!(details
            .secrets
            .iter()
            .any(|secret| secret.id == backup_codes.id
                && secret.secret_type == SecretType::BackupCode));
    }

    #[test]
    fn listing_accounts_without_secret_values() {
        let (_temp_dir, state, _db_path) = setup_unlocked_vault();
        let platform = create_platform(&state, "GitHub");
        let account = create_account(&state, platform.id);
        let secret_service = SecretService;

        secret_service
            .add_secret(
                &state,
                account.id,
                &AddSecretRequest {
                    secret_type: SecretType::Password,
                    label: "Password".to_string(),
                    secret_value: "secret-not-for-lists".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();

        let accounts = AccountService
            .list_accounts(&state, Some(ListAccountsFilter::default()))
            .unwrap();
        let serialized = serde_json::to_string(&accounts).unwrap();

        assert_eq!(accounts.len(), 1);
        assert_eq!(accounts[0].secret_count, 1);
        assert!(!serialized.contains("\"secret_value\""));
        assert!(!serialized.contains("secret-not-for-lists"));
    }

    #[test]
    fn revealing_secret_only_through_reveal_secret() {
        let (_temp_dir, state, _db_path) = setup_unlocked_vault();
        let platform = create_platform(&state, "GitHub");
        let account = create_account(&state, platform.id);
        let secret_service = SecretService;

        let metadata = secret_service
            .add_secret(
                &state,
                account.id,
                &AddSecretRequest {
                    secret_type: SecretType::Password,
                    label: "Password".to_string(),
                    secret_value: "reveal-me-once".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();

        let details = AccountService
            .get_account_details(&state, account.id)
            .unwrap();
        let details_json = serde_json::to_string(&details).unwrap();
        let revealed = secret_service.reveal_secret(&state, metadata.id).unwrap();

        assert!(!details_json.contains("\"secret_value\""));
        assert!(!details_json.contains("reveal-me-once"));
        assert_eq!(revealed.secret_value, "reveal-me-once");
    }

    #[test]
    fn updating_account_value_creates_history_row() {
        let (_temp_dir, state, _db_path) = setup_unlocked_vault();
        let platform = create_platform(&state, "GitHub");
        let account = create_account(&state, platform.id);
        let value_service = ValueService;

        let value = value_service
            .add_account_value(
                &state,
                account.id,
                &AddAccountValueRequest {
                    value_type: AccountValueType::Email,
                    label: "Work email".to_string(),
                    value: "old@example.com".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();

        value_service
            .update_account_value(
                &state,
                value.id,
                &UpdateAccountValueRequest {
                    value_type: AccountValueType::Email,
                    label: "Work email".to_string(),
                    value: "new@example.com".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();

        let history = state
            .with_connection(|connection| {
                connection
                    .query_row(
                        "SELECT old_value, new_value
                     FROM account_value_history
                     WHERE account_value_id = ?1",
                        params![value.id.to_string()],
                        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
                    )
                    .map_err(VaultError::from)
            })
            .unwrap();

        assert_eq!(history.0, "old@example.com");
        assert_eq!(history.1, "new@example.com");
    }

    #[test]
    fn updating_secret_creates_secret_history_row() {
        let (_temp_dir, state, _db_path) = setup_unlocked_vault();
        let platform = create_platform(&state, "GitHub");
        let account = create_account(&state, platform.id);
        let secret_service = SecretService;

        let secret = secret_service
            .add_secret(
                &state,
                account.id,
                &AddSecretRequest {
                    secret_type: SecretType::Password,
                    label: "Password".to_string(),
                    secret_value: "old-password".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();

        secret_service
            .update_secret(
                &state,
                secret.id,
                &UpdateSecretRequest {
                    secret_type: SecretType::Password,
                    label: "Password".to_string(),
                    secret_value: "new-password".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();

        let history = state
            .with_connection(|connection| {
                connection
                    .query_row(
                        "SELECT old_secret_value, new_secret_value
                     FROM secret_history
                     WHERE secret_id = ?1",
                        params![secret.id.to_string()],
                        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
                    )
                    .map_err(VaultError::from)
            })
            .unwrap();

        assert_eq!(history.0, "old-password");
        assert_eq!(history.1, "new-password");
    }

    #[test]
    fn listing_account_value_history_returns_changes_in_descending_order() {
        let (_temp_dir, state, _db_path) = setup_unlocked_vault();
        let platform = create_platform(&state, "GitHub");
        let account = create_account(&state, platform.id);
        let value_service = ValueService;

        let value = value_service
            .add_account_value(
                &state,
                account.id,
                &AddAccountValueRequest {
                    value_type: AccountValueType::Email,
                    label: "Work email".to_string(),
                    value: "first@example.com".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();

        value_service
            .update_account_value(
                &state,
                value.id,
                &UpdateAccountValueRequest {
                    value_type: AccountValueType::Email,
                    label: "Work email".to_string(),
                    value: "second@example.com".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();
        value_service
            .update_account_value(
                &state,
                value.id,
                &UpdateAccountValueRequest {
                    value_type: AccountValueType::Email,
                    label: "Work email".to_string(),
                    value: "third@example.com".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();

        let history = value_service
            .list_account_value_history(&state, value.id)
            .unwrap();

        assert_eq!(history.len(), 2);
        assert_eq!(
            history[0],
            AccountValueHistoryDto {
                id: history[0].id,
                account_value_id: value.id,
                account_id: account.id,
                old_value: "second@example.com".to_string(),
                new_value: "third@example.com".to_string(),
                changed_at: history[0].changed_at,
            }
        );
        assert_eq!(
            history[1],
            AccountValueHistoryDto {
                id: history[1].id,
                account_value_id: value.id,
                account_id: account.id,
                old_value: "first@example.com".to_string(),
                new_value: "second@example.com".to_string(),
                changed_at: history[1].changed_at,
            }
        );
        assert!(history[0].changed_at >= history[1].changed_at);
    }

    #[test]
    fn listing_secret_history_hides_secret_values() {
        let (_temp_dir, state, _db_path) = setup_unlocked_vault();
        let platform = create_platform(&state, "GitHub");
        let account = create_account(&state, platform.id);
        let secret_service = SecretService;

        let secret = secret_service
            .add_secret(
                &state,
                account.id,
                &AddSecretRequest {
                    secret_type: SecretType::Password,
                    label: "Password".to_string(),
                    secret_value: "history-secret-one".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();

        secret_service
            .update_secret(
                &state,
                secret.id,
                &UpdateSecretRequest {
                    secret_type: SecretType::Password,
                    label: "Password".to_string(),
                    secret_value: "history-secret-two".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();

        let history = secret_service
            .list_secret_history(&state, secret.id)
            .unwrap();
        let serialized = serde_json::to_string(&history).unwrap();

        assert_eq!(history.len(), 1);
        assert_eq!(
            history[0],
            SecretHistoryDto {
                id: history[0].id,
                secret_id: secret.id,
                account_id: account.id,
                changed_at: history[0].changed_at,
                has_old_value: true,
                has_new_value: true,
            }
        );
        assert!(!serialized.contains("history-secret-one"));
        assert!(!serialized.contains("history-secret-two"));
    }

    #[test]
    fn soft_deleted_accounts_are_hidden_from_default_list() {
        let (_temp_dir, state, _db_path) = setup_unlocked_vault();
        let platform = create_platform(&state, "GitHub");
        let first = create_account(&state, platform.id);
        let second = AccountService
            .create_account(
                &state,
                &CreateAccountRequest {
                    name: Some("Second GitHub".to_string()),
                    platform_id: platform.id,
                    notes: None,
                },
            )
            .unwrap();

        AccountService
            .soft_delete_account(&state, first.id)
            .unwrap();

        let accounts = AccountService.list_accounts(&state, None).unwrap();

        assert_eq!(accounts.len(), 1);
        assert_eq!(accounts[0].id, second.id);
    }

    #[test]
    fn searching_by_secret_value_returns_no_accounts() {
        let (_temp_dir, state, _db_path) = setup_unlocked_vault();
        let platform = create_platform(&state, "GitHub");
        let account = create_account(&state, platform.id);
        let secret_service = SecretService;

        secret_service
            .add_secret(
                &state,
                account.id,
                &AddSecretRequest {
                    secret_type: SecretType::Password,
                    label: "Password".to_string(),
                    secret_value: "hidden-search-secret".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();

        let accounts = AccountService
            .list_accounts(
                &state,
                Some(ListAccountsFilter {
                    search: Some("hidden-search-secret".to_string()),
                    platform_id: None,
                }),
            )
            .unwrap();

        assert!(accounts.is_empty());
    }

    #[test]
    fn soft_deleted_values_and_secrets_are_hidden_from_account_details() {
        let (_temp_dir, state, _db_path) = setup_unlocked_vault();
        let platform = create_platform(&state, "GitHub");
        let account = create_account(&state, platform.id);
        let value_service = ValueService;
        let secret_service = SecretService;

        let value = value_service
            .add_account_value(
                &state,
                account.id,
                &AddAccountValueRequest {
                    value_type: AccountValueType::Email,
                    label: "Work email".to_string(),
                    value: "dev@example.com".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();
        let secret = secret_service
            .add_secret(
                &state,
                account.id,
                &AddSecretRequest {
                    secret_type: SecretType::Password,
                    label: "Password".to_string(),
                    secret_value: "soft-delete-me".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();

        value_service
            .soft_delete_account_value(&state, value.id)
            .unwrap();
        secret_service
            .soft_delete_secret(&state, secret.id)
            .unwrap();

        let details = AccountService
            .get_account_details(&state, account.id)
            .unwrap();

        assert!(details.values.is_empty());
        assert!(details.secrets.is_empty());
    }

    #[test]
    fn child_secret_and_value_operations_fail_after_account_soft_delete() {
        let (_temp_dir, state, _db_path) = setup_unlocked_vault();
        let platform = create_platform(&state, "GitHub");
        let account = create_account(&state, platform.id);
        let value_service = ValueService;
        let secret_service = SecretService;

        let value = value_service
            .add_account_value(
                &state,
                account.id,
                &AddAccountValueRequest {
                    value_type: AccountValueType::Email,
                    label: "Work email".to_string(),
                    value: "dev@example.com".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();
        let secret = secret_service
            .add_secret(
                &state,
                account.id,
                &AddSecretRequest {
                    secret_type: SecretType::Password,
                    label: "Password".to_string(),
                    secret_value: "still-secret".to_string(),
                    is_primary: true,
                },
            )
            .unwrap();

        AccountService
            .soft_delete_account(&state, account.id)
            .unwrap();

        let reveal_error = secret_service.reveal_secret(&state, secret.id).unwrap_err();
        let update_value_error = value_service
            .update_account_value(
                &state,
                value.id,
                &UpdateAccountValueRequest {
                    value_type: AccountValueType::Email,
                    label: "Work email".to_string(),
                    value: "changed@example.com".to_string(),
                    is_primary: true,
                },
            )
            .unwrap_err();
        let delete_secret_error = secret_service
            .soft_delete_secret(&state, secret.id)
            .unwrap_err();

        assert!(matches!(reveal_error, VaultError::NotFound(_)));
        assert!(matches!(update_value_error, VaultError::NotFound(_)));
        assert!(matches!(delete_secret_error, VaultError::NotFound(_)));
    }

    fn setup_unlocked_vault() -> (TempDir, AppState, String) {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("vault.db");
        let state = AppState::default();
        let vault_service = VaultService;

        vault_service
            .create_vault(&state, db_path.to_str().unwrap(), MASTER_PASSWORD)
            .unwrap();

        (temp_dir, state, db_path.to_string_lossy().to_string())
    }

    fn create_platform(
        state: &AppState,
        name: &str,
    ) -> crate::vault::dto::platform_dto::PlatformDto {
        PlatformService.create_platform(state, name).unwrap()
    }

    fn create_account(
        state: &AppState,
        platform_id: Uuid,
    ) -> crate::vault::dto::account_dto::AccountDetailsDto {
        AccountService
            .create_account(
                state,
                &CreateAccountRequest {
                    name: Some("Primary account".to_string()),
                    platform_id,
                    notes: Some("Main account".to_string()),
                },
            )
            .unwrap()
    }
}
