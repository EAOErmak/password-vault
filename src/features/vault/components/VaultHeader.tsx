import type { PlatformDto } from "../types";

type VaultHeaderProps = {
  accountCount: number;
  canCreateAccount: boolean;
  errorMessage: string | null;
  isLoading: boolean;
  isLocking: boolean;
  onLock: () => Promise<void>;
  onClearSearch: () => void;
  onOpenBackupRestore: () => void;
  onOpenCreateAccount: () => void;
  onOpenImport: () => void;
  onOpenCreatePlatform: () => void;
  onRefresh: () => Promise<void>;
  onSearchChange: (searchQuery: string) => void;
  onSelectPlatform: (platformId: string | null) => void;
  platformCount: number;
  platforms: PlatformDto[];
  searchQuery: string;
  selectedPlatformId: string | null;
  vaultPath: string | null;
};

export function VaultHeader({
  accountCount,
  canCreateAccount,
  errorMessage,
  isLoading,
  isLocking,
  onLock,
  onClearSearch,
  onOpenBackupRestore,
  onOpenCreateAccount,
  onOpenImport,
  onOpenCreatePlatform,
  onRefresh,
  onSearchChange,
  onSelectPlatform,
  platformCount,
  platforms,
  searchQuery,
  selectedPlatformId,
  vaultPath,
}: VaultHeaderProps) {
  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <section className="vault-card vault-header-card">
      <div className="vault-header-row">
        <div className="vault-header-copy">
          <p className="eyebrow">Unlocked Vault</p>
          <h1>Platforms and accounts</h1>
          <p className="intro">
            Browse account metadata, review safe details, and create platforms or
            accounts without exposing secrets.
          </p>
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
          <button
            className="button-secondary"
            disabled={isLoading}
            onClick={() => {
              void onRefresh();
            }}
            type="button"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
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

      <div className="vault-search-row">
        <label className="field vault-search-field">
          <span>Search accounts</span>
          <input
            autoComplete="off"
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            placeholder="Search by name, platform, notes, or safe values"
            spellCheck={false}
            type="search"
            value={searchQuery}
          />
        </label>

        {hasSearchQuery ? (
          <button className="button-secondary" onClick={onClearSearch} type="button">
            Clear search
          </button>
        ) : null}
      </div>

      <p className="field-helper">
        Search uses safe account metadata only. Secret values are excluded.
      </p>

      <div className="vault-platform-filter">
        <div className="vault-platform-filter__header">
          <div>
            <h2>Platforms</h2>
            <p>Filter the account list by platform.</p>
          </div>
        </div>

        {isLoading && platforms.length === 0 ? (
          <p className="muted-state">Loading platforms...</p>
        ) : null}

        {!isLoading && platforms.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <p>No platforms yet.</p>
          </div>
        ) : null}

        {platforms.length > 0 ? (
          <div className="platform-filter-list">
            <button
              className={
                selectedPlatformId === null
                  ? "list-button list-button--selected platform-filter-button"
                  : "list-button platform-filter-button"
              }
              onClick={() => onSelectPlatform(null)}
              type="button"
            >
              <span>All platforms</span>
              <small>{platforms.length}</small>
            </button>

            {platforms.map((platform) => (
              <button
                className={
                  selectedPlatformId === platform.id
                    ? "list-button list-button--selected platform-filter-button"
                    : "list-button platform-filter-button"
                }
                key={platform.id}
                onClick={() => onSelectPlatform(platform.id)}
                type="button"
              >
                <span>{platform.name}</span>
                <small>{platform.normalized_name}</small>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
    </section>
  );
}
