use uuid::Uuid;

use crate::app_state::AppState;
use crate::vault::domain::{AccountValue, Platform};
use crate::vault::dto::account_dto::{
    AccountDetailsDto, AccountListItemDto, CreateAccountRequest, ListAccountsFilter,
    UpdateAccountRequest,
};
use crate::vault::dto::platform_dto::PlatformDto;
use crate::vault::dto::secret_dto::SecretMetadataDto;
use crate::vault::dto::value_dto::AccountValueDto;
use crate::vault::error::VaultError;
use crate::vault::now_utc;
use crate::vault::repository::account_repository::AccountRepository;
use crate::vault::repository::platform_repository::PlatformRepository;
use crate::vault::repository::secret_repository::{SecretMetadataRecord, SecretRepository};
use crate::vault::repository::value_repository::ValueRepository;

pub struct AccountService;

impl AccountService {
    pub fn create_account(
        &self,
        state: &AppState,
        request: &CreateAccountRequest,
    ) -> Result<AccountDetailsDto, VaultError> {
        let name = Self::sanitize_optional_text(request.name.as_deref());
        let notes = Self::sanitize_optional_text(request.notes.as_deref());

        state.with_connection_mut(|connection| {
            Self::ensure_platform_exists(connection, request.platform_id)?;
            let account = AccountRepository::create(
                connection,
                name.as_deref(),
                request.platform_id,
                notes.as_deref(),
                &now_utc(),
            )?;

            Self::build_account_details(connection, account.id)
        })
    }

    pub fn list_accounts(
        &self,
        state: &AppState,
        filter: Option<ListAccountsFilter>,
    ) -> Result<Vec<AccountListItemDto>, VaultError> {
        let filter = filter.unwrap_or_default();
        let search = filter
            .search
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty());

        state.with_connection(|connection| {
            let accounts = AccountRepository::list_active(connection, filter.platform_id, search)?;
            accounts
                .into_iter()
                .map(|record| {
                    let values = ValueRepository::list_by_account(connection, record.account.id)?;
                    let secrets =
                        SecretRepository::list_metadata_by_account(connection, record.account.id)?;

                    Ok(AccountListItemDto {
                        id: record.account.id,
                        name: record.account.name,
                        platform: Self::to_platform_dto(record.platform),
                        notes: record.account.notes,
                        values: values.into_iter().map(Self::to_value_dto).collect(),
                        secret_count: secrets.len(),
                        secrets: secrets
                            .into_iter()
                            .map(Self::to_secret_metadata_dto)
                            .collect(),
                        created_at: record.account.created_at,
                        updated_at: record.account.updated_at,
                    })
                })
                .collect()
        })
    }

    pub fn get_account_details(
        &self,
        state: &AppState,
        account_id: Uuid,
    ) -> Result<AccountDetailsDto, VaultError> {
        state.with_connection(|connection| Self::build_account_details(connection, account_id))
    }

    pub fn update_account(
        &self,
        state: &AppState,
        account_id: Uuid,
        request: &UpdateAccountRequest,
    ) -> Result<AccountDetailsDto, VaultError> {
        let name = Self::sanitize_optional_text(request.name.as_deref());
        let notes = Self::sanitize_optional_text(request.notes.as_deref());

        state.with_connection_mut(|connection| {
            Self::ensure_platform_exists(connection, request.platform_id)?;
            let updated = AccountRepository::update(
                connection,
                account_id,
                name.as_deref(),
                request.platform_id,
                notes.as_deref(),
                &now_utc(),
            )?;

            if !updated {
                return Err(VaultError::NotFound(format!(
                    "account not found: {account_id}"
                )));
            }

            Self::build_account_details(connection, account_id)
        })
    }

    pub fn soft_delete_account(
        &self,
        state: &AppState,
        account_id: Uuid,
    ) -> Result<(), VaultError> {
        state.with_connection_mut(|connection| {
            let deleted = AccountRepository::soft_delete(connection, account_id, &now_utc())?;
            if deleted {
                Ok(())
            } else {
                Err(VaultError::NotFound(format!(
                    "account not found: {account_id}"
                )))
            }
        })
    }

    fn build_account_details(
        connection: &rusqlite::Connection,
        account_id: Uuid,
    ) -> Result<AccountDetailsDto, VaultError> {
        let record = AccountRepository::find_active_by_id(connection, account_id)?
            .ok_or_else(|| VaultError::NotFound(format!("account not found: {account_id}")))?;
        let values = ValueRepository::list_by_account(connection, account_id)?;
        let secrets = SecretRepository::list_metadata_by_account(connection, account_id)?;

        Ok(AccountDetailsDto {
            id: record.account.id,
            name: record.account.name,
            platform: Self::to_platform_dto(record.platform),
            notes: record.account.notes,
            values: values.into_iter().map(Self::to_value_dto).collect(),
            secrets: secrets
                .into_iter()
                .map(Self::to_secret_metadata_dto)
                .collect(),
            created_at: record.account.created_at,
            updated_at: record.account.updated_at,
        })
    }

    fn ensure_platform_exists(
        connection: &rusqlite::Connection,
        platform_id: Uuid,
    ) -> Result<(), VaultError> {
        let platform = PlatformRepository::find_by_id(connection, platform_id)?;
        if platform.is_some() {
            Ok(())
        } else {
            Err(VaultError::NotFound(format!(
                "platform not found: {platform_id}"
            )))
        }
    }

    fn sanitize_optional_text(value: Option<&str>) -> Option<String> {
        value.and_then(|text| {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        })
    }

    fn to_platform_dto(platform: Platform) -> PlatformDto {
        PlatformDto {
            id: platform.id,
            name: platform.name,
            normalized_name: platform.normalized_name,
            created_at: platform.created_at,
        }
    }

    fn to_value_dto(value: AccountValue) -> AccountValueDto {
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

    fn to_secret_metadata_dto(secret: SecretMetadataRecord) -> SecretMetadataDto {
        SecretMetadataDto {
            id: secret.id,
            account_id: secret.account_id,
            secret_type: secret.secret_type,
            label: secret.label,
            is_primary: secret.is_primary,
            secret_length: secret.secret_length,
            created_at: secret.created_at,
            updated_at: secret.updated_at,
        }
    }
}
