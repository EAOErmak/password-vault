use uuid::Uuid;
use zeroize::Zeroize;

use crate::app_state::AppState;
use crate::clipboard_service::{ClipboardService, SystemClipboardBackend};
use crate::vault::domain::SecretHistory;
use crate::vault::dto::history_dto::SecretHistoryDto;
use crate::vault::dto::secret_dto::{
    AddSecretRequest, RevealedSecretDto, SecretMetadataDto, UpdateSecretRequest,
};
use crate::vault::error::VaultError;
use crate::vault::now_utc;
use crate::vault::repository::account_repository::AccountRepository;
use crate::vault::repository::secret_repository::{SecretMetadataRecord, SecretRepository};

pub struct SecretService;

impl SecretService {
    pub fn add_secret(
        &self,
        state: &AppState,
        account_id: Uuid,
        request: &AddSecretRequest,
    ) -> Result<SecretMetadataDto, VaultError> {
        let label = Self::validate_label(&request.label)?;
        Self::validate_secret_value(&request.secret_value)?;

        state.with_connection_mut(|connection| {
            Self::ensure_account_exists(connection, account_id)?;

            let now = now_utc();
            let transaction = connection.transaction()?;

            if request.is_primary {
                SecretRepository::demote_all_primaries(&transaction, account_id, &now)?;
            }

            let secret = SecretRepository::create(
                &transaction,
                account_id,
                &request.secret_type,
                &label,
                &request.secret_value,
                request.is_primary,
                &now,
            )?;

            transaction.commit()?;

            Ok(Self::to_metadata_dto(secret))
        })
    }

    pub fn update_secret(
        &self,
        state: &AppState,
        secret_id: Uuid,
        request: &UpdateSecretRequest,
    ) -> Result<SecretMetadataDto, VaultError> {
        let label = Self::validate_label(&request.label)?;
        Self::validate_secret_value(&request.secret_value)?;

        state.with_connection_mut(|connection| {
            let current = SecretRepository::find_active_by_id(connection, secret_id)?
                .ok_or_else(|| VaultError::NotFound(format!("secret not found: {secret_id}")))?;
            let now = now_utc();

            {
                let transaction = connection.transaction()?;
                if current.secret_value != request.secret_value {
                    let history = SecretHistory {
                        id: Uuid::new_v4(),
                        secret_id: current.id,
                        account_id: current.account_id,
                        old_secret_value: current.secret_value.clone(),
                        new_secret_value: request.secret_value.clone(),
                        changed_at: now.clone(),
                    };
                    SecretRepository::insert_history(&transaction, &history)?;
                }

                if request.is_primary {
                    SecretRepository::demote_all_primaries(&transaction, current.account_id, &now)?;
                }

                let updated = SecretRepository::update(
                    &transaction,
                    secret_id,
                    &request.secret_type,
                    &label,
                    &request.secret_value,
                    request.is_primary,
                    &now,
                )?;
                if !updated {
                    return Err(VaultError::NotFound(format!(
                        "secret not found: {secret_id}"
                    )));
                }
                transaction.commit()?;
            }

            let updated = SecretRepository::find_active_metadata_by_id(connection, secret_id)?
                .ok_or_else(|| VaultError::NotFound(format!("secret not found: {secret_id}")))?;

            Ok(Self::to_metadata_dto(updated))
        })
    }

    pub fn reveal_secret(
        &self,
        state: &AppState,
        secret_id: Uuid,
    ) -> Result<RevealedSecretDto, VaultError> {
        state.with_connection(|connection| {
            let secret = SecretRepository::find_active_by_id(connection, secret_id)?
                .ok_or_else(|| VaultError::NotFound(format!("secret not found: {secret_id}")))?;

            Ok(RevealedSecretDto {
                id: secret.id,
                account_id: secret.account_id,
                secret_type: secret.secret_type,
                label: secret.label,
                secret_value: secret.secret_value,
                is_primary: secret.is_primary,
                created_at: secret.created_at,
                updated_at: secret.updated_at,
            })
        })
    }

    pub fn copy_secret_to_clipboard(
        &self,
        state: &AppState,
        secret_id: Uuid,
        clear_after_seconds: Option<u64>,
    ) -> Result<(), VaultError> {
        let clipboard = ClipboardService::<SystemClipboardBackend>::system();
        self.copy_secret_to_clipboard_with(state, secret_id, clear_after_seconds, &clipboard)
    }

    pub fn soft_delete_secret(&self, state: &AppState, secret_id: Uuid) -> Result<(), VaultError> {
        state.with_connection_mut(|connection| {
            let deleted = SecretRepository::soft_delete(connection, secret_id, &now_utc())?;
            if deleted {
                Ok(())
            } else {
                Err(VaultError::NotFound(format!(
                    "secret not found: {secret_id}"
                )))
            }
        })
    }

    pub fn list_secret_history(
        &self,
        state: &AppState,
        secret_id: Uuid,
    ) -> Result<Vec<SecretHistoryDto>, VaultError> {
        state.with_connection(|connection| {
            SecretRepository::find_active_metadata_by_id(connection, secret_id)?
                .ok_or_else(|| VaultError::NotFound(format!("secret not found: {secret_id}")))?;

            let history = SecretRepository::list_history_by_secret(connection, secret_id)?;
            Ok(history.into_iter().map(Self::to_history_dto).collect())
        })
    }

    fn copy_secret_to_clipboard_with<B>(
        &self,
        state: &AppState,
        secret_id: Uuid,
        clear_after_seconds: Option<u64>,
        clipboard: &ClipboardService<B>,
    ) -> Result<(), VaultError>
    where
        B: crate::clipboard_service::ClipboardBackend,
    {
        let secret_value = state.with_connection(|connection| {
            let secret = SecretRepository::find_active_by_id(connection, secret_id)?
                .ok_or_else(|| VaultError::NotFound(format!("secret not found: {secret_id}")))?;

            Ok(secret.secret_value)
        })?;

        clipboard.copy_text_with_auto_clear(secret_value, clear_after_seconds)
    }

    fn ensure_account_exists(
        connection: &rusqlite::Connection,
        account_id: Uuid,
    ) -> Result<(), VaultError> {
        if AccountRepository::exists_active(connection, account_id)? {
            Ok(())
        } else {
            Err(VaultError::NotFound(format!(
                "account not found: {account_id}"
            )))
        }
    }

    fn validate_label(label: &str) -> Result<String, VaultError> {
        let trimmed = label.trim();
        if trimmed.is_empty() {
            Err(VaultError::Validation(
                "secret label cannot be empty".to_string(),
            ))
        } else {
            Ok(trimmed.to_string())
        }
    }

    fn validate_secret_value(value: &str) -> Result<(), VaultError> {
        if value.is_empty() {
            Err(VaultError::Validation(
                "secret value cannot be empty".to_string(),
            ))
        } else {
            Ok(())
        }
    }

    fn to_metadata_dto(secret: SecretMetadataRecord) -> SecretMetadataDto {
        SecretMetadataDto {
            id: secret.id,
            account_id: secret.account_id,
            secret_type: secret.secret_type,
            label: secret.label,
            is_primary: secret.is_primary,
            created_at: secret.created_at,
            updated_at: secret.updated_at,
        }
    }

    fn to_history_dto(mut history: SecretHistory) -> SecretHistoryDto {
        let has_old_value = !history.old_secret_value.is_empty();
        let has_new_value = !history.new_secret_value.is_empty();
        history.old_secret_value.zeroize();
        history.new_secret_value.zeroize();

        SecretHistoryDto {
            id: history.id,
            secret_id: history.secret_id,
            account_id: history.account_id,
            changed_at: history.changed_at,
            has_old_value,
            has_new_value,
        }
    }
}
