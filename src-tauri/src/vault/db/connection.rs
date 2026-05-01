use std::fs;
use std::path::Path;
use std::time::Duration;

use rusqlite::{Connection, OpenFlags};

use crate::vault::db::migrations::{run_migrations, VAULT_APPLICATION_ID};
use crate::vault::error::VaultError;

const BUSY_TIMEOUT: Duration = Duration::from_secs(5);

pub fn create_encrypted_database(
    path: &Path,
    master_password: &str,
) -> Result<Connection, VaultError> {
    if path.exists() {
        return Err(VaultError::VaultAlreadyExists);
    }

    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)?;
        }
    }

    let connection = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_CREATE | OpenFlags::SQLITE_OPEN_READ_WRITE,
    )?;

    initialize_connection(&connection, master_password)?;
    run_migrations(&connection)?;

    Ok(connection)
}

pub fn open_encrypted_database(
    path: &Path,
    master_password: &str,
) -> Result<Connection, VaultError> {
    if !path.exists() {
        return Err(VaultError::VaultFileMissing);
    }

    let connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)?;

    initialize_connection(&connection, master_password)?;
    verify_vault_application_id(&connection)?;
    run_migrations(&connection)?;

    Ok(connection)
}

fn initialize_connection(connection: &Connection, master_password: &str) -> Result<(), VaultError> {
    connection.pragma_update(None, "key", master_password)?;
    verify_master_password(connection)?;
    connection.busy_timeout(BUSY_TIMEOUT)?;
    connection.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA secure_delete = ON;
         PRAGMA journal_mode = WAL;",
    )?;
    Ok(())
}

fn verify_master_password(connection: &Connection) -> Result<(), VaultError> {
    connection
        .query_row("SELECT count(*) FROM sqlite_master", [], |_| Ok(()))
        .map_err(|_| VaultError::InvalidMasterPassword)
}

fn verify_vault_application_id(connection: &Connection) -> Result<(), VaultError> {
    let application_id: i64 =
        connection.query_row("PRAGMA application_id", [], |row| row.get(0))?;

    if application_id == VAULT_APPLICATION_ID {
        Ok(())
    } else {
        Err(VaultError::InvalidVaultFile)
    }
}
