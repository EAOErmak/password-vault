use uuid::Uuid;

use crate::app_state::AppState;
use crate::vault::domain::AccountValueHistory;
use crate::vault::dto::value_dto::{
    AccountValueDto, AddAccountValueRequest, UpdateAccountValueRequest,
};
use crate::vault::error::VaultError;
use crate::vault::now_utc;
use crate::vault::repository::account_repository::AccountRepository;
use crate::vault::repository::value_repository::ValueRepository;

pub struct ValueService;

impl ValueService {
    pub fn add_account_value(
        &self,
        state: &AppState,
        account_id: Uuid,
        request: &AddAccountValueRequest,
    ) -> Result<AccountValueDto, VaultError> {
        let label = Self::validate_label(&request.label)?;
        let value = Self::validate_value(&request.value)?;

        state.with_connection_mut(|connection| {
            Self::ensure_account_exists(connection, account_id)?;
            let account_value = ValueRepository::create(
                connection,
                account_id,
                &request.value_type,
                &label,
                &value,
                request.is_primary,
                &now_utc(),
            )?;

            Ok(Self::to_dto(account_value))
        })
    }

    pub fn update_account_value(
        &self,
        state: &AppState,
        value_id: Uuid,
        request: &UpdateAccountValueRequest,
    ) -> Result<AccountValueDto, VaultError> {
        let label = Self::validate_label(&request.label)?;
        let value = Self::validate_value(&request.value)?;

        state.with_connection_mut(|connection| {
            let current =
                ValueRepository::find_active_by_id(connection, value_id)?.ok_or_else(|| {
                    VaultError::NotFound(format!("account value not found: {value_id}"))
                })?;
            let now = now_utc();

            {
                let transaction = connection.transaction()?;
                if current.value != value {
                    let history = AccountValueHistory {
                        id: Uuid::new_v4(),
                        account_value_id: current.id,
                        account_id: current.account_id,
                        old_value: current.value.clone(),
                        new_value: value.clone(),
                        changed_at: now.clone(),
                    };
                    ValueRepository::insert_history(&transaction, &history)?;
                }

                let updated = ValueRepository::update(
                    &transaction,
                    value_id,
                    &request.value_type,
                    &label,
                    &value,
                    request.is_primary,
                    &now,
                )?;
                if !updated {
                    return Err(VaultError::NotFound(format!(
                        "account value not found: {value_id}"
                    )));
                }
                transaction.commit()?;
            }

            let updated =
                ValueRepository::find_active_by_id(connection, value_id)?.ok_or_else(|| {
                    VaultError::NotFound(format!("account value not found: {value_id}"))
                })?;

            Ok(Self::to_dto(updated))
        })
    }

    pub fn soft_delete_account_value(
        &self,
        state: &AppState,
        value_id: Uuid,
    ) -> Result<(), VaultError> {
        state.with_connection_mut(|connection| {
            let deleted = ValueRepository::soft_delete(connection, value_id, &now_utc())?;
            if deleted {
                Ok(())
            } else {
                Err(VaultError::NotFound(format!(
                    "account value not found: {value_id}"
                )))
            }
        })
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
                "account value label cannot be empty".to_string(),
            ))
        } else {
            Ok(trimmed.to_string())
        }
    }

    fn validate_value(value: &str) -> Result<String, VaultError> {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            Err(VaultError::Validation(
                "account value cannot be empty".to_string(),
            ))
        } else {
            Ok(trimmed.to_string())
        }
    }

    fn to_dto(value: crate::vault::domain::AccountValue) -> AccountValueDto {
        AccountValueDto {
            id: value.id,
            account_id: value.account_id,
            value_type: value.value_type,
            label: value.label,
            value: value.value,
            is_primary: value.is_primary,
            created_at: value.created_at,
            updated_at: value.updated_at,
        }
    }
}
