import { invoke } from "@tauri-apps/api/core";

const KNOWN_VAULT_PATH_KEY = "password-vault:last-vault-path";

export type VaultStatus = {
  is_unlocked: boolean;
  path: string | null;
};

export function normalizeVaultPath(path: string | null | undefined): string | null {
  const trimmed = path?.trim();
  return trimmed ? trimmed : null;
}

export function readKnownVaultPath(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeVaultPath(window.localStorage.getItem(KNOWN_VAULT_PATH_KEY));
}

export function storeKnownVaultPath(path: string | null | undefined): string | null {
  const normalizedPath = normalizeVaultPath(path);

  if (typeof window !== "undefined" && normalizedPath) {
    window.localStorage.setItem(KNOWN_VAULT_PATH_KEY, normalizedPath);
  }

  return normalizedPath;
}

export function getVaultStatus(): Promise<VaultStatus> {
  return invoke<VaultStatus>("get_vault_status");
}

export function createVault(
  path: string,
  masterPassword: string,
): Promise<VaultStatus> {
  return invoke<VaultStatus>("create_vault", { path, masterPassword });
}

export function unlockVault(
  path: string,
  masterPassword: string,
): Promise<VaultStatus> {
  return invoke<VaultStatus>("unlock_vault", { path, masterPassword });
}

export function lockVault(): Promise<VaultStatus> {
  return invoke<VaultStatus>("lock_vault");
}

export function getVaultErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("invalid master password")) {
    return "Wrong master password.";
  }

  if (message.includes("vault file does not exist")) {
    return "Vault file not found at the provided path.";
  }

  if (message.includes("vault already exists")) {
    return "A vault already exists at the provided path.";
  }

  if (message.includes("master password cannot be empty")) {
    return "Master password is required.";
  }

  if (message.includes("vault path cannot be empty")) {
    return "Vault path is required.";
  }

  if (message.includes("invalid vault file")) {
    return "The selected file is not a valid vault.";
  }

  return message || "Something went wrong while talking to the vault.";
}
