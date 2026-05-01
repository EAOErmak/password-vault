import { invoke } from "@tauri-apps/api/core";
import type {
  ExportEncryptedBackupDto,
  RestoreEncryptedBackupDto,
} from "../types";

export function exportEncryptedBackup(
  destinationPath: string | null,
): Promise<ExportEncryptedBackupDto> {
  return invoke("export_encrypted_backup", {
    destinationPath,
  });
}

export function restoreEncryptedBackup(
  sourcePath: string,
): Promise<RestoreEncryptedBackupDto> {
  return invoke("restore_encrypted_backup", {
    sourcePath,
  });
}
