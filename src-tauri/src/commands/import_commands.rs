use tauri::State;

use crate::app_state::AppState;
use crate::commands::{into_command_result, CommandResult};
use crate::vault::dto::import_dto::{
    ImportTxtAccountsRequest, ImportTxtAccountsResultDto, ParseTxtImportRequest, ParsedTxtImportDto,
};
use crate::vault::service::import_service::ImportService;

#[tauri::command]
pub fn parse_txt_import(mut request: ParseTxtImportRequest) -> CommandResult<ParsedTxtImportDto> {
    let service = ImportService;
    let result = service.parse_txt_import(&request.content);
    request.content.clear();
    into_command_result(result)
}

#[tauri::command]
pub fn import_txt_accounts(
    state: State<'_, AppState>,
    request: ImportTxtAccountsRequest,
) -> CommandResult<ImportTxtAccountsResultDto> {
    let service = ImportService;
    into_command_result(service.import_txt_accounts(state.inner(), &request))
}
