use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct AccountValueHistoryDto {
    pub id: Uuid,
    pub account_value_id: Uuid,
    pub account_id: Uuid,
    pub old_value: String,
    pub new_value: String,
    pub changed_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct SecretHistoryDto {
    pub id: Uuid,
    pub secret_id: Uuid,
    pub account_id: Uuid,
    pub changed_at: DateTime<Utc>,
    pub has_old_value: bool,
    pub has_new_value: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct RevealedSecretHistoryDto {
    pub id: Uuid,
    pub secret_id: Uuid,
    pub account_id: Uuid,
    pub old_secret_value: String,
    pub new_secret_value: String,
    pub changed_at: DateTime<Utc>,
}
