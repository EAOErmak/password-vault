use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::vault::error::VaultError;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SecretType {
    Password,
    BackupCode,
    RecoveryKey,
    TotpSecret,
    SecurityAnswer,
    CustomSecret,
}

impl SecretType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Password => "PASSWORD",
            Self::BackupCode => "BACKUP_CODE",
            Self::RecoveryKey => "RECOVERY_KEY",
            Self::TotpSecret => "TOTP_SECRET",
            Self::SecurityAnswer => "SECURITY_ANSWER",
            Self::CustomSecret => "CUSTOM_SECRET",
        }
    }

    pub fn from_str(value: &str) -> Result<Self, VaultError> {
        match value {
            "PASSWORD" => Ok(Self::Password),
            "BACKUP_CODE" => Ok(Self::BackupCode),
            "RECOVERY_KEY" => Ok(Self::RecoveryKey),
            "TOTP_SECRET" => Ok(Self::TotpSecret),
            "SECURITY_ANSWER" => Ok(Self::SecurityAnswer),
            "CUSTOM_SECRET" => Ok(Self::CustomSecret),
            _ => Err(VaultError::Validation(format!(
                "unsupported secret type: {value}"
            ))),
        }
    }
}

#[derive(Debug, Clone)]
pub struct Secret {
    pub id: Uuid,
    pub account_id: Uuid,
    pub secret_type: SecretType,
    pub label: String,
    pub secret_value: String,
    pub is_primary: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}
