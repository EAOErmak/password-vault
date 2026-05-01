use tauri::State;
use zeroize::Zeroize;

use crate::app_state::AppState;
use crate::commands::{into_command_result, CommandResult};
use crate::vault::dto::backup_dto::{ExportEncryptedBackupDto, RestoreEncryptedBackupDto};
use crate::vault::dto::VaultStatusDto;
use crate::vault::service::vault_service::VaultService;

#[tauri::command]
pub fn create_vault(
    state: State<'_, AppState>,
    path: String,
    mut master_password: String,
) -> CommandResult<VaultStatusDto> {
    let service = VaultService;
    let result = service.create_vault(state.inner(), &path, &master_password);
    master_password.zeroize();
    into_command_result(result)
}

#[tauri::command]
pub fn unlock_vault(
    state: State<'_, AppState>,
    path: String,
    mut master_password: String,
) -> CommandResult<VaultStatusDto> {
    let service = VaultService;
    let result = service.unlock_vault(state.inner(), &path, &master_password);
    master_password.zeroize();
    into_command_result(result)
}

#[tauri::command]
pub fn lock_vault(state: State<'_, AppState>) -> CommandResult<VaultStatusDto> {
    let service = VaultService;
    into_command_result(service.lock_vault(state.inner()))
}

#[tauri::command]
pub fn export_encrypted_backup(
    state: State<'_, AppState>,
    destination_path: Option<String>,
) -> CommandResult<ExportEncryptedBackupDto> {
    let service = VaultService;
    into_command_result(service.export_encrypted_backup(state.inner(), destination_path.as_deref()))
}

#[tauri::command]
pub fn restore_encrypted_backup(
    state: State<'_, AppState>,
    source_path: String,
) -> CommandResult<RestoreEncryptedBackupDto> {
    let service = VaultService;
    into_command_result(service.restore_encrypted_backup(state.inner(), &source_path))
}

#[tauri::command]
pub fn get_vault_status(state: State<'_, AppState>) -> CommandResult<VaultStatusDto> {
    let service = VaultService;
    into_command_result(service.get_vault_status(state.inner()))
}
