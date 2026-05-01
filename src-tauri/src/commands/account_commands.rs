use tauri::State;
use uuid::Uuid;

use crate::app_state::AppState;
use crate::commands::{into_command_result, CommandResult};
use crate::vault::dto::account_dto::{
    AccountDetailsDto, AccountListItemDto, CreateAccountRequest, ListAccountsFilter,
    UpdateAccountRequest,
};
use crate::vault::service::account_service::AccountService;

#[tauri::command]
pub fn create_account(
    state: State<'_, AppState>,
    request: CreateAccountRequest,
) -> CommandResult<AccountDetailsDto> {
    let service = AccountService;
    into_command_result(service.create_account(state.inner(), &request))
}

#[tauri::command]
pub fn list_accounts(
    state: State<'_, AppState>,
    filter: Option<ListAccountsFilter>,
) -> CommandResult<Vec<AccountListItemDto>> {
    let service = AccountService;
    into_command_result(service.list_accounts(state.inner(), filter))
}

#[tauri::command]
pub fn get_account_details(
    state: State<'_, AppState>,
    account_id: Uuid,
) -> CommandResult<AccountDetailsDto> {
    let service = AccountService;
    into_command_result(service.get_account_details(state.inner(), account_id))
}

#[tauri::command]
pub fn update_account(
    state: State<'_, AppState>,
    account_id: Uuid,
    request: UpdateAccountRequest,
) -> CommandResult<AccountDetailsDto> {
    let service = AccountService;
    into_command_result(service.update_account(state.inner(), account_id, &request))
}

#[tauri::command]
pub fn soft_delete_account(state: State<'_, AppState>, account_id: Uuid) -> CommandResult<()> {
    let service = AccountService;
    into_command_result(service.soft_delete_account(state.inner(), account_id))
}
