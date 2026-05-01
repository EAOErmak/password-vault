use thiserror::Error;

#[derive(Debug, Error)]
pub enum VaultError {
    #[error("validation failed: {0}")]
    Validation(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("conflict: {0}")]
    Conflict(String),
    #[error("vault is locked")]
    VaultLocked,
    #[error("vault already exists at the provided path")]
    VaultAlreadyExists,
    #[error("vault file does not exist at the provided path")]
    VaultFileMissing,
    #[error("invalid vault file")]
    InvalidVaultFile,
    #[error("invalid master password")]
    InvalidMasterPassword,
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("internal error: {0}")]
    Internal(String),
}
