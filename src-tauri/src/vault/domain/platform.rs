use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct Platform {
    pub id: Uuid,
    pub name: String,
    pub normalized_name: String,
    pub created_at: DateTime<Utc>,
}
