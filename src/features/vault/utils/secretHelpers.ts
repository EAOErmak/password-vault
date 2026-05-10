import type { SecretType } from "../types";

type SecretTypeOption = {
  value: SecretType;
  label: string;
  defaultLabel: string;
};

export const SECRET_TYPE_OPTIONS: SecretTypeOption[] = [
  { value: "PASSWORD", label: "Password", defaultLabel: "Password" },
  { value: "BACKUP_CODE", label: "Backup code", defaultLabel: "Backup code" },
  { value: "RECOVERY_KEY", label: "Recovery key", defaultLabel: "Recovery key" },
  { value: "TOTP_SECRET", label: "TOTP secret", defaultLabel: "TOTP secret" },
  { value: "SECURITY_ANSWER", label: "Security answer", defaultLabel: "Security answer" },
  { value: "CUSTOM_SECRET", label: "Custom secret", defaultLabel: "Custom secret" },
];

export function getDefaultSecretLabel(secretType: SecretType): string {
  return (
    SECRET_TYPE_OPTIONS.find((option) => option.value === secretType)?.defaultLabel ??
    "Secret"
  );
}

export function usesMultilineSecretValue(secretType: SecretType): boolean {
  return secretType === "BACKUP_CODE";
}
