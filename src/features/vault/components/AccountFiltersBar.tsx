import { useEffect, useRef, useState } from "react";
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
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPlatformDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedPlatformLabel =
    platforms.find((platform) => platform.id === clientPlatformFilter)?.name ?? "All platforms";

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
          <div className="custom-select-container account-filters-select" ref={dropdownRef}>
            <button
              className="select-input custom-select-trigger"
              onClick={() => setIsPlatformDropdownOpen((currentValue) => !currentValue)}
              type="button"
            >
              <span className="account-filters-select__value">{selectedPlatformLabel}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            {isPlatformDropdownOpen ? (
              <ul className="custom-select-menu account-filters-select__menu">
                <li
                  className={`custom-select-option ${clientPlatformFilter === null ? "selected" : ""}`}
                  onClick={() => {
                    onPlatformFilterChange(null);
                    setIsPlatformDropdownOpen(false);
                  }}
                >
                  All platforms
                </li>
                {platforms.map((platform) => (
                  <li
                    key={platform.id}
                    className={`custom-select-option ${clientPlatformFilter === platform.id ? "selected" : ""}`}
                    onClick={() => {
                      onPlatformFilterChange(platform.id);
                      setIsPlatformDropdownOpen(false);
                    }}
                  >
                    {platform.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
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
