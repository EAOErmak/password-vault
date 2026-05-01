pub mod account_dto;
pub mod backup_dto;
pub mod history_dto;
pub mod import_dto;
pub mod platform_dto;
pub mod secret_dto;
pub mod value_dto;

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct VaultStatusDto {
    pub is_unlocked: bool,
    pub path: Option<String>,
}
