use uuid::Uuid;

use crate::app_state::AppState;
use crate::vault::domain::{AccountValueHistory, AccountValueType};
use crate::vault::dto::history_dto::AccountValueHistoryDto;
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
        let value = Self::validate_value(&request.value)?;

        state.with_connection_mut(|connection| {
            Self::ensure_account_exists(connection, account_id)?;

            if request.value_type != AccountValueType::Custom {
                if let Some(_existing) = ValueRepository::find_by_type(connection, account_id, &request.value_type)? {
                    return Err(VaultError::Validation(format!(
                        "this account already has a value of type: {}",
                        request.value_type.as_str()
                    )));
                }
            }

            let now = now_utc();
            let transaction = connection.transaction()?;

            if request.is_primary {
                ValueRepository::demote_all_primaries(&transaction, account_id, &now)?;
            }

            let account_value = ValueRepository::create(
                &transaction,
                account_id,
                &request.value_type,
                &value,
                request.is_primary,
                &now,
            )?;

            transaction.commit()?;

            Ok(Self::to_dto(account_value))
        })
    }

    pub fn update_account_value(
        &self,
        state: &AppState,
        value_id: Uuid,
        request: &UpdateAccountValueRequest,
    ) -> Result<AccountValueDto, VaultError> {
        let value = Self::validate_value(&request.value)?;

        state.with_connection_mut(|connection| {
            let current =
                ValueRepository::find_active_by_id(connection, value_id)?.ok_or_else(|| {
                    VaultError::NotFound(format!("account value not found: {value_id}"))
                })?;

            if request.value_type != AccountValueType::Custom && current.value_type != request.value_type {
                if let Some(existing) = ValueRepository::find_by_type(connection, current.account_id, &request.value_type)? {
                    if existing.id != value_id {
                        return Err(VaultError::Validation(format!(
                            "this account already has a value of type: {}",
                            request.value_type.as_str()
                        )));
                    }
                }
            }

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

                if request.is_primary {
                    ValueRepository::demote_all_primaries(&transaction, current.account_id, &now)?;
                }

                let updated = ValueRepository::update(
                    &transaction,
                    value_id,
                    &request.value_type,
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

    pub fn list_account_value_history(
        &self,
        state: &AppState,
        value_id: Uuid,
    ) -> Result<Vec<AccountValueHistoryDto>, VaultError> {
        state.with_connection(|connection| {
            ValueRepository::find_active_by_id(connection, value_id)?.ok_or_else(|| {
                VaultError::NotFound(format!("account value not found: {value_id}"))
            })?;

            let history = ValueRepository::list_history_by_value(connection, value_id)?;
            Ok(history.into_iter().map(Self::to_history_dto).collect())
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
            value: value.value,
            is_primary: value.is_primary,
            created_at: value.created_at,
            updated_at: value.updated_at,
        }
    }

    fn to_history_dto(history: AccountValueHistory) -> AccountValueHistoryDto {
        AccountValueHistoryDto {
            id: history.id,
            account_value_id: history.account_value_id,
            account_id: history.account_id,
            old_value: history.old_value,
            new_value: history.new_value,
            changed_at: history.changed_at,
        }
    }
}
