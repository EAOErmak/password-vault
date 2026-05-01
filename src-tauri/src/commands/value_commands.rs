use tauri::State;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::commands::{into_command_result, CommandResult};
use crate::vault::dto::history_dto::AccountValueHistoryDto;
use crate::vault::dto::value_dto::{
    AccountValueDto, AddAccountValueRequest, UpdateAccountValueRequest,
};
use crate::vault::service::value_service::ValueService;

#[tauri::command]
pub fn add_account_value(
    state: State<'_, AppState>,
    account_id: Uuid,
    request: AddAccountValueRequest,
) -> CommandResult<AccountValueDto> {
    let service = ValueService;
    into_command_result(service.add_account_value(state.inner(), account_id, &request))
}

#[tauri::command]
pub fn update_account_value(
    state: State<'_, AppState>,
    value_id: Uuid,
    request: UpdateAccountValueRequest,
) -> CommandResult<AccountValueDto> {
    let service = ValueService;
    into_command_result(service.update_account_value(state.inner(), value_id, &request))
}

#[tauri::command]
pub fn soft_delete_account_value(state: State<'_, AppState>, value_id: Uuid) -> CommandResult<()> {
    let service = ValueService;
    into_command_result(service.soft_delete_account_value(state.inner(), value_id))
}

#[tauri::command]
pub fn list_account_value_history(
    state: State<'_, AppState>,
    value_id: Uuid,
) -> CommandResult<Vec<AccountValueHistoryDto>> {
    let service = ValueService;
    into_command_result(service.list_account_value_history(state.inner(), value_id))
}
