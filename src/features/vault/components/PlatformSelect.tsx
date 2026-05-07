import { useEffect, useMemo, useRef, useState } from "react";
import type { PlatformDto } from "../types";

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

  return (
    <div className="custom-select-container platform-select" ref={dropdownRef}>
      <button
        className="select-input custom-select-trigger"
        disabled={disabled}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        <span className="platform-select__value">{selectedLabel}</span>
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
      {isOpen && !disabled ? (
        <ul className="custom-select-menu platform-select__menu">
          {platforms.map((platform) => (
            <li
              key={platform.id}
              className={`custom-select-option ${value === platform.id ? "selected" : ""}`}
              onClick={() => {
                onChange(platform.id);
                setIsOpen(false);
              }}
            >
              {platform.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
