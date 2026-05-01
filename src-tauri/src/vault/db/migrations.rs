use rusqlite::Connection;

use crate::vault::error::VaultError;

pub const VAULT_APPLICATION_ID: i64 = 0x50564C54;

pub fn run_migrations(connection: &Connection) -> Result<(), VaultError> {
    let current_version: i64 = connection.query_row("PRAGMA user_version", [], |row| row.get(0))?;

    if current_version >= 1 {
        return Ok(());
    }

    connection.execute_batch(&format!(
        "BEGIN;
         CREATE TABLE IF NOT EXISTS platforms (
             id TEXT PRIMARY KEY NOT NULL,
             name TEXT NOT NULL,
             normalized_name TEXT NOT NULL UNIQUE,
             created_at TEXT NOT NULL
         );

         CREATE TABLE IF NOT EXISTS accounts (
             id TEXT PRIMARY KEY NOT NULL,
             name TEXT NULL,
             platform_id TEXT NOT NULL,
             notes TEXT NULL,
             created_at TEXT NOT NULL,
             updated_at TEXT NOT NULL,
             deleted_at TEXT NULL,
             FOREIGN KEY(platform_id) REFERENCES platforms(id)
         );

         CREATE TABLE IF NOT EXISTS account_values (
             id TEXT PRIMARY KEY NOT NULL,
             account_id TEXT NOT NULL,
             value_type TEXT NOT NULL,
             label TEXT NOT NULL,
             value TEXT NOT NULL,
             is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
             created_at TEXT NOT NULL,
             updated_at TEXT NOT NULL,
             deleted_at TEXT NULL,
             FOREIGN KEY(account_id) REFERENCES accounts(id)
         );

         CREATE TABLE IF NOT EXISTS secrets (
             id TEXT PRIMARY KEY NOT NULL,
             account_id TEXT NOT NULL,
             secret_type TEXT NOT NULL,
             label TEXT NOT NULL,
             secret_value TEXT NOT NULL,
             is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
             created_at TEXT NOT NULL,
             updated_at TEXT NOT NULL,
             deleted_at TEXT NULL,
             FOREIGN KEY(account_id) REFERENCES accounts(id)
         );

         CREATE TABLE IF NOT EXISTS account_value_history (
             id TEXT PRIMARY KEY NOT NULL,
             account_value_id TEXT NOT NULL,
             account_id TEXT NOT NULL,
             old_value TEXT NOT NULL,
             new_value TEXT NOT NULL,
             changed_at TEXT NOT NULL,
             FOREIGN KEY(account_value_id) REFERENCES account_values(id),
             FOREIGN KEY(account_id) REFERENCES accounts(id)
         );

         CREATE TABLE IF NOT EXISTS secret_history (
             id TEXT PRIMARY KEY NOT NULL,
             secret_id TEXT NOT NULL,
             account_id TEXT NOT NULL,
             old_secret_value TEXT NOT NULL,
             new_secret_value TEXT NOT NULL,
             changed_at TEXT NOT NULL,
             FOREIGN KEY(secret_id) REFERENCES secrets(id),
             FOREIGN KEY(account_id) REFERENCES accounts(id)
         );

         CREATE INDEX IF NOT EXISTS idx_accounts_platform_id ON accounts(platform_id);
         CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at ON accounts(deleted_at);
         CREATE INDEX IF NOT EXISTS idx_account_values_account_id_deleted_at
             ON account_values(account_id, deleted_at);
         CREATE INDEX IF NOT EXISTS idx_secrets_account_id_deleted_at
             ON secrets(account_id, deleted_at);
         CREATE INDEX IF NOT EXISTS idx_account_value_history_value_id_changed_at
             ON account_value_history(account_value_id, changed_at);
         CREATE INDEX IF NOT EXISTS idx_secret_history_secret_id_changed_at
             ON secret_history(secret_id, changed_at);

         PRAGMA application_id = {VAULT_APPLICATION_ID};
         PRAGMA user_version = 1;
         COMMIT;",
    ))?;

    Ok(())
}
