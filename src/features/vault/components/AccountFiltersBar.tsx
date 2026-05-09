import { useEffect, useRef, useState } from "react";
import type { PlatformDto } from "../types";

const PLATFORM_MENU_PAGE_SIZE = 6;

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
  const [platformSearchQuery, setPlatformSearchQuery] = useState("");
  const [platformPage, setPlatformPage] = useState(1);

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
  const normalizedPlatformQuery = platformSearchQuery.trim().toLowerCase();
  const filteredPlatforms = platforms.filter((platform) =>
    platform.name.toLowerCase().includes(normalizedPlatformQuery),
  );
  const platformOptions =
    normalizedPlatformQuery.length === 0
      ? [{ id: null, name: "All platforms" }, ...filteredPlatforms]
      : filteredPlatforms;
  const totalPlatformPages = Math.max(
    1,
    Math.ceil(platformOptions.length / PLATFORM_MENU_PAGE_SIZE),
  );
  const paginatedPlatformOptions = platformOptions.slice(
    (platformPage - 1) * PLATFORM_MENU_PAGE_SIZE,
    platformPage * PLATFORM_MENU_PAGE_SIZE,
  );
  const hasPlatformPagination = platformOptions.length > PLATFORM_MENU_PAGE_SIZE;

  useEffect(() => {
    setPlatformPage(1);
  }, [platformSearchQuery, isPlatformDropdownOpen]);

  useEffect(() => {
    setPlatformPage((currentPage) => Math.min(currentPage, totalPlatformPages));
  }, [totalPlatformPages]);

  return (
    <div className="vault-platform-filter">
      <div className="vault-platform-filter__header">
        <div className="page-copy">
          <h2 className="no-select">Filters</h2>
        </div>
      </div>

      <div className="account-filters-grid">
        <label className="field account-filters-grid__field">
          <span className="no-select">Filter by Platform</span>
          <div className="custom-select-container account-filters-select" ref={dropdownRef}>
            <div className="select-input custom-select-trigger account-filters-select__trigger">
              <input
                autoComplete="off"
                className="account-filters-select__input"
                onChange={(event) => {
                  setPlatformSearchQuery(event.currentTarget.value);
                  setIsPlatformDropdownOpen(true);
                }}
                onFocus={() => setIsPlatformDropdownOpen(true)}
                placeholder={selectedPlatformLabel}
                spellCheck={false}
                type="text"
                value={platformSearchQuery}
              />
              <button
                className="account-filters-select__toggle"
                onClick={() => setIsPlatformDropdownOpen((currentValue) => !currentValue)}
                type="button"
              >
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
            </div>
            {isPlatformDropdownOpen ? (
              <div className="custom-select-menu account-filters-select__menu">
                <ul className="custom-select-list">
                  {paginatedPlatformOptions.map((platform) => (
                    <li
                      key={platform.id ?? "all-platforms"}
                      className={`custom-select-option ${clientPlatformFilter === platform.id ? "selected" : ""}`}
                      onClick={() => {
                        onPlatformFilterChange(platform.id);
                        setPlatformSearchQuery("");
                        setIsPlatformDropdownOpen(false);
                      }}
                    >
                      {platform.name}
                    </li>
                  ))}
                  {platformOptions.length === 0 ? (
                    <li className="custom-select-option account-filters-select__empty">
                      No matching platforms
                    </li>
                  ) : null}
                </ul>
                {hasPlatformPagination ? (
                  <div className="custom-select-pagination">
                    <button
                      className="custom-select-pagination__button"
                      disabled={platformPage === 1}
                      onClick={() => setPlatformPage((currentPage) => Math.max(1, currentPage - 1))}
                      type="button"
                    >
                      Previous
                    </button>
                    <span className="custom-select-pagination__summary">
                      {platformPage} / {totalPlatformPages}
                    </span>
                    <button
                      className="custom-select-pagination__button"
                      disabled={platformPage === totalPlatformPages}
                      onClick={() =>
                        setPlatformPage((currentPage) =>
                          Math.min(totalPlatformPages, currentPage + 1),
                        )
                      }
                      type="button"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </label>

        <label className="field account-filters-grid__field">
          <span className="no-select">Filter by Value</span>
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
          <span className="no-select">Search by Name</span>
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
