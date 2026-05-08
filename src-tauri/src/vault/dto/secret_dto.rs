use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::vault::domain::SecretType;

#[derive(Debug, Clone, Deserialize)]
pub struct AddSecretRequest {
    pub secret_type: SecretType,
    pub label: String,
    pub secret_value: String,
    pub is_primary: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSecretRequest {
    pub secret_type: SecretType,
    pub label: String,
    pub secret_value: String,
    pub is_primary: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GeneratePasswordOptions {
    pub length: usize,
    pub include_uppercase: bool,
    pub include_lowercase: bool,
    pub include_digits: bool,
    pub include_symbols: bool,
    pub exclude_ambiguous: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct SecretMetadataDto {
    pub id: Uuid,
    pub account_id: Uuid,
    pub secret_type: SecretType,
    pub label: String,
    pub is_primary: bool,
    pub secret_length: usize,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RevealedSecretDto {
    pub id: Uuid,
    pub account_id: Uuid,
    pub secret_type: SecretType,
    pub label: String,
    pub secret_value: String,
    pub is_primary: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
