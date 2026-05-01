use tauri::State;
use uuid::Uuid;
use zeroize::Zeroize;

use crate::app_state::AppState;
use crate::clipboard_service::DEFAULT_CLIPBOARD_CLEAR_AFTER_SECONDS;
use crate::commands::{into_command_result, CommandResult};
use crate::vault::dto::history_dto::SecretHistoryDto;
use crate::vault::dto::secret_dto::{
    AddSecretRequest, RevealedSecretDto, SecretMetadataDto, UpdateSecretRequest,
};
use crate::vault::service::secret_service::SecretService;

#[tauri::command]
pub fn add_secret(
    state: State<'_, AppState>,
    account_id: Uuid,
    mut request: AddSecretRequest,
) -> CommandResult<SecretMetadataDto> {
    let service = SecretService;
    let result = service.add_secret(state.inner(), account_id, &request);
    request.secret_value.zeroize();
    into_command_result(result)
}

#[tauri::command]
pub fn update_secret(
    state: State<'_, AppState>,
    secret_id: Uuid,
    mut request: UpdateSecretRequest,
) -> CommandResult<SecretMetadataDto> {
    let service = SecretService;
    let result = service.update_secret(state.inner(), secret_id, &request);
    request.secret_value.zeroize();
    into_command_result(result)
}

#[tauri::command]
pub fn reveal_secret(
    state: State<'_, AppState>,
    secret_id: Uuid,
) -> CommandResult<RevealedSecretDto> {
    let service = SecretService;
    into_command_result(service.reveal_secret(state.inner(), secret_id))
}

#[tauri::command]
pub fn copy_secret_to_clipboard(
    state: State<'_, AppState>,
    secret_id: Uuid,
    clear_after_seconds: Option<u64>,
) -> CommandResult<()> {
    let service = SecretService;
    into_command_result(service.copy_secret_to_clipboard(
        state.inner(),
        secret_id,
        clear_after_seconds.or(Some(DEFAULT_CLIPBOARD_CLEAR_AFTER_SECONDS)),
    ))
}

#[tauri::command]
pub fn soft_delete_secret(state: State<'_, AppState>, secret_id: Uuid) -> CommandResult<()> {
    let service = SecretService;
    into_command_result(service.soft_delete_secret(state.inner(), secret_id))
}

#[tauri::command]
pub fn list_secret_history(
    state: State<'_, AppState>,
    secret_id: Uuid,
) -> CommandResult<Vec<SecretHistoryDto>> {
    let service = SecretService;
    into_command_result(service.list_secret_history(state.inner(), secret_id))
}
