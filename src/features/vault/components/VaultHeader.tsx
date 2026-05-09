import React from "react";
import { Plus } from "lucide-react";

type VaultHeaderProps = {
  accountCount: number;
  canCreateAccount: boolean;
  errorMessage: string | null;
  isLocking: boolean;
  onLock: () => Promise<void>;
  onOpenBackupRestore: () => void;
  onOpenCreateAccount: () => void;
  onOpenImport: () => void;
  onOpenCreatePlatform: () => void;
  platformCount: number;
  vaultPath: string | null;
  themeToggle: React.ReactElement;
};

export function VaultHeader({
  accountCount,
  canCreateAccount,
  errorMessage,
  isLocking,
  onLock,
  onOpenBackupRestore,
  onOpenCreateAccount,
  onOpenImport,
  onOpenCreatePlatform,
  platformCount,
  vaultPath,
  themeToggle,
}: VaultHeaderProps) {

  return (
    <section className="vault-card vault-header-card" data-tauri-drag-region>
      <div className="vault-header-row">
        <div className="vault-header-copy">
          <h1>Platforms and accounts</h1>
        </div>
      </div>

      <div className="vault-metrics">
        <div className="metric-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="metric-label" style={{ fontSize: "1.1rem" }}>Platforms</span>
            <strong style={{ fontSize: "1.5rem" }}>{platformCount}</strong>
          </div>
          <button
            onClick={onOpenCreatePlatform}
            type="button"
            className="button-secondary"
            style={{ width: "50px", height: "50px", padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "12px" }}
            title="New platform"
          >
            <Plus size={24} />
          </button>
        </div>
        <div className="metric-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="metric-label" style={{ fontSize: "1.1rem" }}>Accounts</span>
            <strong style={{ fontSize: "1.5rem" }}>{accountCount}</strong>
          </div>
          <button
            onClick={onOpenCreateAccount}
            type="button"
            className="button-secondary"
            disabled={!canCreateAccount}
            style={{ width: "50px", height: "50px", padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "12px" }}
            title="New account"
          >
            <Plus size={24} />
          </button>
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
