pub mod account_commands;
pub mod platform_commands;
pub mod secret_commands;
pub mod value_commands;
pub mod vault_commands;

use crate::vault::error::VaultError;

pub type CommandResult<T> = Result<T, String>;

pub(crate) fn into_command_result<T>(result: Result<T, VaultError>) -> CommandResult<T> {
    result.map_err(|error| error.to_string())
}
