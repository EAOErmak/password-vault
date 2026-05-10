use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::vault::error::VaultError;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AccountValueType {
    Email,
    PhoneNumber,
    Nickname,
    Username,
    Login,
    Custom,
}

impl AccountValueType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Email => "EMAIL",
            Self::PhoneNumber => "PHONE_NUMBER",
            Self::Nickname => "NICKNAME",
            Self::Username => "USERNAME",
            Self::Login => "LOGIN",
            Self::Custom => "CUSTOM",
        }
    }

    pub fn from_str(value: &str) -> Result<Self, VaultError> {
        match value {
            "EMAIL" => Ok(Self::Email),
            "PHONE_NUMBER" => Ok(Self::PhoneNumber),
            "NICKNAME" => Ok(Self::Nickname),
            "USERNAME" => Ok(Self::Username),
            "LOGIN" => Ok(Self::Login),
            "CUSTOM" => Ok(Self::Custom),
            _ => Err(VaultError::Validation(format!(
                "unsupported account value type: {value}"
            ))),
        }
    }
}

#[derive(Debug, Clone)]
pub struct AccountValue {
    pub id: Uuid,
    pub account_id: Uuid,
    pub value_type: AccountValueType,
    pub value: String,
    pub is_primary: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}
