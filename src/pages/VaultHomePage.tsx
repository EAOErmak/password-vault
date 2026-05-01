type VaultHomePageProps = {
  errorMessage: string | null;
  isLocking: boolean;
  onLock: () => Promise<void>;
  vaultPath: string | null;
};

export function VaultHomePage({
  errorMessage,
  isLocking,
  onLock,
  vaultPath,
}: VaultHomePageProps) {
  return (
    <section className="page">
      <div className="page-copy">
        <h2>Vault Home</h2>
        <p>The vault is unlocked. Account CRUD is intentionally not part of this first UI.</p>
      </div>

      <div className="vault-summary">
        <span className="status-pill">Unlocked</span>
        <div className="summary-block">
          <span className="summary-label">Current vault</span>
          <strong>{vaultPath ?? "Active path unavailable"}</strong>
        </div>
      </div>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <div className="actions">
        <button className="button-primary" disabled={isLocking} onClick={onLock} type="button">
          {isLocking ? "Locking..." : "Lock"}
        </button>
      </div>
    </section>
  );
}
