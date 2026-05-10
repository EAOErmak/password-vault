use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::vault::domain::AccountValueType;

#[derive(Debug, Clone, Deserialize)]
pub struct AddAccountValueRequest {
    pub value_type: AccountValueType,
    pub value: String,
    pub is_primary: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateAccountValueRequest {
    pub value_type: AccountValueType,
    pub value: String,
    pub is_primary: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct AccountValueDto {
    pub id: Uuid,
    pub account_id: Uuid,
    pub value_type: AccountValueType,
    pub value: String,
    pub is_primary: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
