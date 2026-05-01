import type { AccountValueType } from "../types";

type AccountValueTypeOption = {
  value: AccountValueType;
  label: string;
  defaultLabel: string;
};

export const ACCOUNT_VALUE_TYPE_OPTIONS: AccountValueTypeOption[] = [
  { value: "EMAIL", label: "Email", defaultLabel: "Email" },
  { value: "PHONE_NUMBER", label: "Phone number", defaultLabel: "Phone number" },
  { value: "NICKNAME", label: "Nickname", defaultLabel: "Nickname" },
  { value: "USERNAME", label: "Username", defaultLabel: "Username" },
  { value: "LOGIN", label: "Login", defaultLabel: "Login" },
  { value: "CUSTOM", label: "Custom", defaultLabel: "Custom value" },
];

export function getDefaultAccountValueLabel(valueType: AccountValueType): string {
  return (
    ACCOUNT_VALUE_TYPE_OPTIONS.find((option) => option.value === valueType)?.defaultLabel ??
    "Value"
  );
}

export function isCustomAccountValueType(valueType: AccountValueType): boolean {
  return valueType === "CUSTOM";
}

export function normalizeAccountValueLabel(
  valueType: AccountValueType,
  label: string,
): string {
  const trimmed = label.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }

  return getDefaultAccountValueLabel(valueType);
}
