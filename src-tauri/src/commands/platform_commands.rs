use tauri::State;

use crate::app_state::AppState;
use crate::commands::{into_command_result, CommandResult};
use crate::vault::dto::platform_dto::PlatformDto;
use crate::vault::service::platform_service::PlatformService;

#[tauri::command]
pub fn create_platform(state: State<'_, AppState>, name: String) -> CommandResult<PlatformDto> {
    let service = PlatformService;
    into_command_result(service.create_platform(state.inner(), &name))
}

#[tauri::command]
pub fn list_platforms(state: State<'_, AppState>) -> CommandResult<Vec<PlatformDto>> {
    let service = PlatformService;
    into_command_result(service.list_platforms(state.inner()))
}
