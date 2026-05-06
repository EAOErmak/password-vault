import { useEffect, useState } from "react";
import {
  exportEncryptedBackup,
  restoreEncryptedBackup,
} from "../api/backupApi";
import type { RestoreEncryptedBackupDto } from "../types";
import { getVaultErrorMessage, getVaultStatus } from "../../../lib/vault";

type BackupRestoreDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onRestoreComplete: (result: RestoreEncryptedBackupDto) => Promise<void> | void;
  onRestoreInterrupted: (message: string) => Promise<void> | void;
  vaultPath: string | null;
};

export function BackupRestoreDialog({
  isOpen,
  onClose,
  onRestoreComplete,
  onRestoreInterrupted,
  vaultPath,
}: BackupRestoreDialogProps) {
  const [exportPath, setExportPath] = useState("");
  const [restorePath, setRestorePath] = useState("");
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);
  const [restoreErrorMessage, setRestoreErrorMessage] = useState<string | null>(null);
  const [exportStatusMessage, setExportStatusMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setExportPath("");
    setRestorePath("");
    setConfirmRestore(false);
    setExportErrorMessage(null);
    setRestoreErrorMessage(null);
    setExportStatusMessage(null);
    setIsExporting(false);
    setIsRestoring(false);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isBusy = isExporting || isRestoring;

  const handleExport = async () => {
    setIsExporting(true);
    setExportErrorMessage(null);
    setExportStatusMessage(null);

    try {
      const result = await exportEncryptedBackup(exportPath.trim() || null);
      setExportStatusMessage(`Encrypted backup saved to ${result.backup_path}`);
    } catch (error) {
      setExportErrorMessage(getVaultErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestore = async () => {
    if (restorePath.trim().length === 0) {
      setRestoreErrorMessage("Encrypted backup path is required.");
      return;
    }

    if (!confirmRestore) {
      setRestoreErrorMessage("Confirm the restore before replacing the current vault.");
      return;
    }

    setIsRestoring(true);
    setRestoreErrorMessage(null);

    try {
      const result = await restoreEncryptedBackup(restorePath.trim());
      await onRestoreComplete(result);
    } catch (error) {
      const nextMessage = getVaultErrorMessage(error);

      try {
        const status = await getVaultStatus();
        if (!status.is_unlocked) {
          await onRestoreInterrupted(nextMessage);
          return;
        }
      } catch {
        // Ignore secondary status check failures and surface the restore error below.
      }

      setRestoreErrorMessage(nextMessage);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <div aria-modal="true" className="dialog-card dialog-card--wide" role="dialog">
        <div className="dialog-header">
          <div>
            <h3>Backup and restore</h3>
            <p>
              Export or restore only encrypted SQLCipher vault files. Plaintext export is not
              available here.
            </p>
          </div>
        </div>

        <div className="backup-sections">
          <section className="backup-section">
            <div className="backup-section__header">
              <h4>Export encrypted backup</h4>
              <p className="field-helper">
                Leave the path blank to create a timestamped backup next to the current vault as
                <code> vault-backup-YYYY-MM-DD-HH-mm.db</code>.
              </p>
            </div>

            <div className="field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="summary-label">Destination path or folder</span>
                <button className="button-ghost button-small" disabled={isBusy} onClick={onClose} type="button" style={{ padding: "4px 8px", margin: "-8px -8px -8px 0" }}>
                  Close
                </button>
              </div>
              <input
                autoComplete="off"
                disabled={isBusy}
                onChange={(event) => {
                  setExportPath(event.currentTarget.value);
                  setExportErrorMessage(null);
                  setExportStatusMessage(null);
                }}
                placeholder="C:\\Backups\\ or C:\\Backups\\vault-backup.db"
                spellCheck={false}
                type="text"
                value={exportPath}
              />
            </div>

            {exportStatusMessage ? <p className="status-toast">{exportStatusMessage}</p> : null}
            {exportErrorMessage ? <p className="error-banner">{exportErrorMessage}</p> : null}

            <div className="actions">
              <button
                className="button-primary"
                disabled={isBusy}
                onClick={() => {
                  void handleExport();
                }}
                type="button"
              >
                {isExporting ? "Exporting..." : "Export encrypted backup"}
              </button>
            </div>
          </section>

          <section className="backup-section">
            <div className="backup-section__header">
              <h4>Restore from encrypted backup</h4>
              <p className="field-helper">
                Restoring will replace the current vault file after creating a safety backup first.
              </p>
            </div>

            <div className="warning-banner">
              <strong>Warning:</strong>
              <ul className="warning-list">
                <li>The current vault session will be locked during restore.</li>
                <li>A safety backup of the current vault will be created before replacement.</li>
                <li>You will need to unlock the restored vault again after restore completes.</li>
              </ul>
            </div>

            <label className="field">
              <span>Encrypted backup path</span>
              <input
                autoComplete="off"
                disabled={isBusy}
                onChange={(event) => {
                  setRestorePath(event.currentTarget.value);
                  setRestoreErrorMessage(null);
                }}
                placeholder="C:\\Backups\\vault-backup.db"
                spellCheck={false}
                type="text"
                value={restorePath}
              />
            </label>

            <label className="checkbox-field">
              <input
                checked={confirmRestore}
                disabled={isBusy}
                onChange={(event) => {
                  setConfirmRestore(event.currentTarget.checked);
                  setRestoreErrorMessage(null);
                }}
                type="checkbox"
              />
              <span>I understand that restore replaces the current vault and requires a new unlock.</span>
            </label>

            {restoreErrorMessage ? <p className="error-banner">{restoreErrorMessage}</p> : null}

            <div className="actions">
              <button
                className="button-primary"
                disabled={isBusy || restorePath.trim().length === 0 || !confirmRestore}
                onClick={() => {
                  void handleRestore();
                }}
                type="button"
              >
                {isRestoring ? "Restoring..." : "Restore from encrypted backup"}
              </button>
            </div>
          </section>
        </div>

        {vaultPath ? <p className="field-helper">Current vault: {vaultPath}</p> : null}
      </div>
    </div>
  );
}
