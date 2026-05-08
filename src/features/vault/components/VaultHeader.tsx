type VaultHeaderProps = {
  accountCount: number;
  canCreateAccount: boolean;
  errorMessage: string | null;
  isLoading: boolean;
  isLocking: boolean;
  onLock: () => Promise<void>;
  onOpenBackupRestore: () => void;
  onOpenCreateAccount: () => void;
  onOpenImport: () => void;
  onOpenCreatePlatform: () => void;
  onRefresh: () => Promise<void>;
  platformCount: number;
  vaultPath: string | null;
  themeToggle: JSX.Element;
};

export function VaultHeader({
  accountCount,
  canCreateAccount,
  errorMessage,
  isLoading,
  isLocking,
  onLock,
  onOpenBackupRestore,
  onOpenCreateAccount,
  onOpenImport,
  onOpenCreatePlatform,
  onRefresh,
  platformCount,
  vaultPath,
  themeToggle,
}: VaultHeaderProps) {

  return (
    <section className="vault-card vault-header-card">
      <div className="vault-header-row">
        <div className="vault-header-copy">
          <p className="eyebrow">Unlocked Vault</p>
          <h1>Platforms and accounts</h1>

        </div>

        <div className="vault-header-actions">
          <button
            className="button-secondary"
            disabled={!canCreateAccount}
            onClick={onOpenCreateAccount}
            type="button"
          >
            New account
          </button>
          <button
            className="button-secondary"
            onClick={onOpenCreatePlatform}
            type="button"
          >
            New platform
          </button>
          <button
            className="button-secondary"
            onClick={onOpenImport}
            type="button"
          >
            Import TXT
          </button>
          <button
            className="button-secondary"
            onClick={onOpenBackupRestore}
            type="button"
          >
            Backup / Restore
          </button>

          {themeToggle}
          <button
            className="button-primary"
            disabled={isLocking}
            onClick={() => {
              void onLock();
            }}
            type="button"
          >
            {isLocking ? "Locking..." : "Lock"}
          </button>
        </div>
      </div>

      <div className="vault-metrics">
        <div className="metric-card">
          <span className="metric-label">Platforms</span>
          <strong>{platformCount}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Accounts</span>
          <strong>{accountCount}</strong>
        </div>
        <div className="metric-card metric-card--path">
          <span className="metric-label">Vault file</span>
          <strong>{vaultPath ?? "Active path unavailable"}</strong>
        </div>
      </div>





      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
    </section>
  );
}
