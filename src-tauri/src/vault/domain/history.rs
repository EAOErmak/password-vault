use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct AccountValueHistory {
    pub id: Uuid,
    pub account_value_id: Uuid,
    pub account_id: Uuid,
    pub old_value: String,
    pub new_value: String,
    pub changed_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct SecretHistory {
    pub id: Uuid,
    pub secret_id: Uuid,
    pub account_id: Uuid,
    pub old_secret_value: String,
    pub new_secret_value: String,
    pub changed_at: DateTime<Utc>,
}
