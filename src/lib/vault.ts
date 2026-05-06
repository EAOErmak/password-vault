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

export function attemptAutoUnlock(): Promise<VaultStatus> {
  return invoke<VaultStatus>("attempt_auto_unlock");
}

export function storeAutoUnlock(
  path: string,
  masterPassword: string,
  expiresInMs: number,
): Promise<void> {
  return invoke<void>("store_auto_unlock", {
    path,
    masterPassword,
    expiresInMs,
  });
}

export function getVaultErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = rawMessage.replace("validation failed:", "").trim();

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

  if (message.includes("account value cannot be empty")) {
    return "Value is required.";
  }

  if (message.includes("account value label cannot be empty")) {
    return "Label is required.";
  }

  if (message.includes("account value not found")) {
    return "The selected value no longer exists.";
  }

  if (message.includes("secret value cannot be empty")) {
    return "Secret value is required.";
  }

  if (message.includes("secret label cannot be empty")) {
    return "Secret label is required.";
  }

  if (message.includes("password length must be at least")) {
    return "Generated passwords must be at least 12 characters long.";
  }

  if (message.includes("at least one password character set must be enabled")) {
    return "Select at least one password character set.";
  }

  if (message.includes("import text cannot be empty")) {
    return "The selected text file is empty.";
  }

  if (message.includes("active vault file is missing")) {
    return "The current vault file is missing from disk.";
  }

  if (message.includes("active vault file could not be found for backup export")) {
    return "The current vault file could not be found for backup export.";
  }

  if (message.includes("active vault file could not be found for restore")) {
    return "The current vault file could not be found for restore.";
  }

  if (message.includes("backup source path cannot be empty")) {
    return "Encrypted backup path is required.";
  }

  if (message.includes("encrypted backup source path cannot be empty")) {
    return "Encrypted backup path is required.";
  }

  if (message.includes("encrypted backup file not found")) {
    return "Encrypted backup file not found.";
  }

  if (message.includes("backup destination must be different from the active vault file")) {
    return "Choose a different file path for the encrypted backup.";
  }

  if (message.includes("backup source must be different from the active vault file")) {
    return "Choose a different encrypted backup file to restore.";
  }

  if (message.includes("unable to export encrypted backup")) {
    return "The encrypted backup could not be created.";
  }

  if (message.includes("unable to export the encrypted backup")) {
    return "The encrypted backup could not be created.";
  }

  if (message.includes("unable to prepare the encrypted backup for restore")) {
    return "The selected encrypted backup could not be prepared for restore.";
  }

  if (message.includes("unable to create a safety backup before restore")) {
    return "The current vault could not be backed up before restore.";
  }

  if (message.includes("unable to restore encrypted backup")) {
    return "The encrypted backup could not be restored.";
  }

  if (message.includes("unable to restore the previous vault from the safety backup")) {
    return "Restore failed and the previous vault safety backup could not be reapplied automatically.";
  }

  if (message.includes("previous vault safety backup could not be reapplied")) {
    return "Restore failed and the previous vault safety backup could not be reapplied automatically.";
  }

  if (message.includes("unable to create the pre-restore safety backup")) {
    return "The current vault could not be backed up before restore. Unlock the vault again to continue.";
  }

  if (message.includes("unable to restore the encrypted backup")) {
    return "The encrypted backup could not be restored. Unlock the vault again to continue.";
  }

  if (message.includes("restore failed and the original vault could not be restored automatically")) {
    return "Restore failed and the previous vault could not be put back automatically. Recover it from the safety backup manually.";
  }

  if (message.includes("secret not found")) {
    return "The selected secret no longer exists.";
  }

  if (message.includes("Clipboard access is unavailable")) {
    return "Clipboard access is unavailable on this device.";
  }

  if (message.includes("Unable to copy the selected secret")) {
    return "The selected secret could not be copied.";
  }

  if (message.includes("invalid vault file")) {
    return "The selected file is not a valid vault.";
  }

  if (message.includes("platform name cannot be empty")) {
    return "Platform name is required.";
  }

  if (message.includes("platform already exists")) {
    return "A platform with that name already exists.";
  }

  if (message.includes("platform not found")) {
    return "The selected platform no longer exists.";
  }

  if (message.includes("account not found")) {
    return "The selected account no longer exists.";
  }

  if (message.includes("vault is locked")) {
    return "The vault is locked. Unlock it again to continue.";
  }

  return message || "Something went wrong while talking to the vault.";
}
