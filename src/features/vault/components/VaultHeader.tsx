import { Plus, LayoutGrid, Users } from "lucide-react";

type VaultHeaderProps = {
  accountCount: number;
  canCreateAccount: boolean;
  errorMessage: string | null;
  onOpenCreateAccount: () => void;
  onOpenCreatePlatform: () => void;
  platformCount: number;
  vaultPath: string | null;
};

export function VaultHeader({
  accountCount,
  canCreateAccount,
  errorMessage,
  onOpenCreateAccount,
  onOpenCreatePlatform,
  platformCount,
  vaultPath,
}: VaultHeaderProps) {

  return (
    <section className="vault-card vault-header-card" data-tauri-drag-region>
      <div className="vault-header-row">
        <div className="vault-header-copy">
          <h1 className="no-select">Platforms and accounts</h1>
        </div>
      </div>

      <div className="vault-metrics">
        <div className="metric-card no-select" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <LayoutGrid size={20} style={{ opacity: 0.7 }} />
              <span className="metric-label" style={{ fontSize: "1.1rem", fontWeight: 500 }}>Platforms</span>
            </div>
            <div style={{ 
              fontSize: "1.2rem", 
              fontWeight: "bold", 
              background: "var(--color-border-soft)", 
              padding: "4px 12px", 
              borderRadius: "12px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {platformCount}
            </div>
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
        <div className="metric-card no-select" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Users size={20} style={{ opacity: 0.7 }} />
              <span className="metric-label" style={{ fontSize: "1.1rem", fontWeight: 500 }}>Accounts</span>
            </div>
            <div style={{ 
              fontSize: "1.2rem", 
              fontWeight: "bold", 
              background: "var(--color-border-soft)", 
              padding: "4px 12px", 
              borderRadius: "12px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {accountCount}
            </div>
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
        <div className="metric-card metric-card--path no-select">
          <span className="metric-label">Vault file</span>
          <strong>{vaultPath ?? "Active path unavailable"}</strong>
        </div>
      </div>





      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
    </section>
  );
}
