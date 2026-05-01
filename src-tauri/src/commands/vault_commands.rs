use tauri::State;
use zeroize::Zeroize;

use crate::app_state::AppState;
use crate::commands::{into_command_result, CommandResult};
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
pub fn get_vault_status(state: State<'_, AppState>) -> CommandResult<VaultStatusDto> {
    let service = VaultService;
    into_command_result(service.get_vault_status(state.inner()))
}
