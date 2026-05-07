import { useEffect, useMemo, useRef, useState } from "react";
import type { PlatformDto } from "../types";

const PLATFORM_MENU_PAGE_SIZE = 6;

type PlatformSelectProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  platforms: PlatformDto[];
  value: string;
};

export function PlatformSelect({
  disabled = false,
  onChange,
  platforms,
  value,
}: PlatformSelectProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [platformSearchQuery, setPlatformSearchQuery] = useState("");
  const [platformPage, setPlatformPage] = useState(1);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedLabel = useMemo(
    () => platforms.find((platform) => platform.id === value)?.name ?? "Select platform",
    [platforms, value],
  );
  const normalizedPlatformQuery = platformSearchQuery.trim().toLowerCase();
  const filteredPlatforms = useMemo(
    () =>
      platforms.filter((platform) =>
        platform.name.toLowerCase().includes(normalizedPlatformQuery),
      ),
    [normalizedPlatformQuery, platforms],
  );
  const totalPlatformPages = Math.max(
    1,
    Math.ceil(filteredPlatforms.length / PLATFORM_MENU_PAGE_SIZE),
  );
  const paginatedPlatforms = useMemo(
    () =>
      filteredPlatforms.slice(
        (platformPage - 1) * PLATFORM_MENU_PAGE_SIZE,
        platformPage * PLATFORM_MENU_PAGE_SIZE,
      ),
    [filteredPlatforms, platformPage],
  );
  const hasPlatformPagination = filteredPlatforms.length > PLATFORM_MENU_PAGE_SIZE;

  useEffect(() => {
    setPlatformPage(1);
  }, [platformSearchQuery, isOpen]);

  useEffect(() => {
    setPlatformPage((currentPage) => Math.min(currentPage, totalPlatformPages));
  }, [totalPlatformPages]);

  return (
    <div className="custom-select-container platform-select" ref={dropdownRef}>
      <div className="select-input custom-select-trigger platform-select__trigger">
        <input
          autoComplete="off"
          className="platform-select__input"
          disabled={disabled}
          onChange={(event) => {
            setPlatformSearchQuery(event.currentTarget.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedLabel}
          spellCheck={false}
          type="text"
          value={platformSearchQuery}
        />
        <button
          className="platform-select__toggle"
          disabled={disabled}
          onClick={() => setIsOpen((currentValue) => !currentValue)}
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
      {isOpen && !disabled ? (
        <div className="custom-select-menu platform-select__menu">
          <ul className="custom-select-list">
            {paginatedPlatforms.map((platform) => (
              <li
                key={platform.id}
                className={`custom-select-option ${value === platform.id ? "selected" : ""}`}
                onClick={() => {
                  onChange(platform.id);
                  setPlatformSearchQuery("");
                  setIsOpen(false);
                }}
              >
                {platform.name}
              </li>
            ))}
            {filteredPlatforms.length === 0 ? (
              <li className="custom-select-option platform-select__empty">No matching platforms</li>
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
                  setPlatformPage((currentPage) => Math.min(totalPlatformPages, currentPage + 1))
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
  );
}
