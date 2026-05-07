import { useEffect, useMemo, useRef, useState } from "react";
import type { AccountValueType } from "../types";
import { ACCOUNT_VALUE_TYPE_OPTIONS } from "../utils/accountValueHelpers";

type AccountValueTypeSelectProps = {
  disabled?: boolean;
  onChange: (value: AccountValueType) => void;
  value: AccountValueType;
};

export function AccountValueTypeSelect({
  disabled = false,
  onChange,
  value,
}: AccountValueTypeSelectProps) {
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
    () => ACCOUNT_VALUE_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? "Type",
    [value],
  );

  return (
    <div className="custom-select-container value-type-select" ref={dropdownRef}>
      <button
        className="select-input custom-select-trigger"
        disabled={disabled}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        <span className="value-type-select__value">{selectedLabel}</span>
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
        <ul className="custom-select-menu value-type-select__menu">
          {ACCOUNT_VALUE_TYPE_OPTIONS.map((option) => (
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
