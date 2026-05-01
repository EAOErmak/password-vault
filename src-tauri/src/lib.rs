mod app_state;
mod commands;
mod vault;

use app_state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::vault_commands::create_vault,
            commands::vault_commands::unlock_vault,
            commands::vault_commands::lock_vault,
            commands::vault_commands::get_vault_status,
            commands::platform_commands::create_platform,
            commands::platform_commands::list_platforms,
            commands::account_commands::create_account,
            commands::account_commands::list_accounts,
            commands::account_commands::get_account_details,
            commands::account_commands::update_account,
            commands::account_commands::soft_delete_account,
            commands::value_commands::add_account_value,
            commands::value_commands::update_account_value,
            commands::value_commands::soft_delete_account_value,
            commands::secret_commands::add_secret,
            commands::secret_commands::update_secret,
            commands::secret_commands::reveal_secret,
            commands::secret_commands::soft_delete_secret
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
