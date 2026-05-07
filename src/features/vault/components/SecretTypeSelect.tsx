import { useEffect, useMemo, useRef, useState } from "react";
import type { SecretType } from "../types";
import { SECRET_TYPE_OPTIONS } from "../utils/secretHelpers";

type SecretTypeSelectProps = {
  disabled?: boolean;
  onChange: (value: SecretType) => void;
  value: SecretType;
};

export function SecretTypeSelect({
  disabled = false,
  onChange,
  value,
}: SecretTypeSelectProps) {
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
    () => SECRET_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? "Secret",
    [value],
  );

  return (
    <div className="custom-select-container secret-type-select" ref={dropdownRef}>
      <button
        className="select-input custom-select-trigger"
        disabled={disabled}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        <span className="secret-type-select__value">{selectedLabel}</span>
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
        <ul className="custom-select-menu secret-type-select__menu">
          {SECRET_TYPE_OPTIONS.map((option) => (
            <li
              key={option.value}
              className={`custom-select-option ${value === option.value ? "selected" : ""}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
