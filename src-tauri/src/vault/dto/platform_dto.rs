use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
pub struct PlatformDto {
    pub id: Uuid,
    pub name: String,
    pub normalized_name: String,
    pub created_at: DateTime<Utc>,
}
