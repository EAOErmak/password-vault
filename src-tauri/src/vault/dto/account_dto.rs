use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::vault::dto::platform_dto::PlatformDto;
use crate::vault::dto::secret_dto::SecretMetadataDto;
use crate::vault::dto::value_dto::AccountValueDto;

#[derive(Debug, Clone, Deserialize)]
pub struct CreateAccountRequest {
    pub name: Option<String>,
    pub platform_id: Uuid,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateAccountRequest {
    pub name: Option<String>,
    pub platform_id: Uuid,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct ListAccountsFilter {
    pub search: Option<String>,
    pub platform_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AccountListItemDto {
    pub id: Uuid,
    pub name: Option<String>,
    pub platform: PlatformDto,
    pub notes: Option<String>,
    pub values: Vec<AccountValueDto>,
    pub secrets: Vec<SecretMetadataDto>,
    pub secret_count: usize,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AccountDetailsDto {
    pub id: Uuid,
    pub name: Option<String>,
    pub platform: PlatformDto,
    pub notes: Option<String>,
    pub values: Vec<AccountValueDto>,
    pub secrets: Vec<SecretMetadataDto>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
