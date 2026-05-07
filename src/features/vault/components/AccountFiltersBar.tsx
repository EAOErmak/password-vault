import type { PlatformDto } from "../types";

type AccountFiltersBarProps = {
  clientNameFilter: string;
  clientPlatformFilter: string | null;
  clientValueFilter: string;
  onNameFilterChange: (name: string) => void;
  onPlatformFilterChange: (platformId: string | null) => void;
  onValueFilterChange: (value: string) => void;
  platforms: PlatformDto[];
};

export function AccountFiltersBar({
  clientNameFilter,
  clientPlatformFilter,
  clientValueFilter,
  onNameFilterChange,
  onPlatformFilterChange,
  onValueFilterChange,
  platforms,
}: AccountFiltersBarProps) {
  return (
    <div className="vault-platform-filter">
      <div className="vault-platform-filter__header">
        <div className="page-copy">
          <h2>Filters</h2>
          <p>Narrow the account table by platform, value, or account name.</p>
        </div>
      </div>

      <div className="account-filters-grid">
        <label className="field account-filters-grid__field">
          <span>Filter by Platform</span>
          <select
            className="select-input"
            onChange={(e) => {
              const val = e.currentTarget.value;
              onPlatformFilterChange(val === "" ? null : val);
            }}
            value={clientPlatformFilter ?? ""}
          >
            <option value="">All platforms</option>
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field account-filters-grid__field">
          <span>Filter by Value</span>
          <input
            autoComplete="off"
            onChange={(e) => onValueFilterChange(e.currentTarget.value)}
            placeholder="Search safe values..."
            spellCheck={false}
            type="text"
            value={clientValueFilter}
          />
        </label>

        <label className="field account-filters-grid__field">
          <span>Search by Name</span>
          <input
            autoComplete="off"
            onChange={(e) => onNameFilterChange(e.currentTarget.value)}
            placeholder="Search account name..."
            spellCheck={false}
            type="text"
            value={clientNameFilter}
          />
        </label>
      </div>
    </div>
  );
}
