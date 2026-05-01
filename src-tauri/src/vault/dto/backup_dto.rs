use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ExportEncryptedBackupDto {
    pub backup_path: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RestoreEncryptedBackupDto {
    pub restored_path: String,
    pub safety_backup_path: String,
}
