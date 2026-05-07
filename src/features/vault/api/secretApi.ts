import { invoke } from "@tauri-apps/api/core";
import type {
  AddSecretRequest,
  GeneratePasswordOptions,
  RevealedSecretDto,
  RevealedSecretHistoryDto,
  SecretHistoryDto,
  SecretMetadataDto,
  UpdateSecretRequest,
} from "../types";

function sanitizeSecretMetadata(secret: SecretMetadataDto): SecretMetadataDto {
  const { id, account_id, secret_type, label, is_primary, created_at, updated_at } = secret;

  return {
    id,
    account_id,
    secret_type,
    label,
    is_primary,
    created_at,
    updated_at,
  };
}

function sanitizeSecretHistory(history: SecretHistoryDto): SecretHistoryDto {
  const { id, secret_id, account_id, changed_at, has_old_value, has_new_value } = history;

  return {
    id,
    secret_id,
    account_id,
    changed_at,
    has_old_value,
    has_new_value,
  };
}

function sanitizeRevealedSecret(secret: RevealedSecretDto): RevealedSecretDto {
  const {
    id,
    account_id,
    secret_type,
    label,
    secret_value,
    is_primary,
    created_at,
    updated_at,
  } = secret;

  return {
    id,
    account_id,
    secret_type,
    label,
    secret_value,
    is_primary,
    created_at,
    updated_at,
  };
}

export async function addSecret(
  accountId: string,
  request: AddSecretRequest,
): Promise<SecretMetadataDto> {
  const secret = await invoke<SecretMetadataDto>("add_secret", {
    accountId,
    request,
  });

  return sanitizeSecretMetadata(secret);
}

export async function updateSecret(
  secretId: string,
  request: UpdateSecretRequest,
): Promise<SecretMetadataDto> {
  const secret = await invoke<SecretMetadataDto>("update_secret", {
    secretId,
    request,
  });

  return sanitizeSecretMetadata(secret);
}

export async function revealSecret(secretId: string): Promise<RevealedSecretDto> {
  const secret = await invoke<RevealedSecretDto>("reveal_secret", {
    secretId,
  });

  return sanitizeRevealedSecret(secret);
}

export function generatePassword(options: GeneratePasswordOptions): Promise<string> {
  return invoke("generate_password", {
    options,
  });
}

export function copySecretToClipboard(secretId: string, clearAfterSeconds = 30): Promise<void> {
  return invoke("copy_secret_to_clipboard", {
    secretId,
    clearAfterSeconds,
  });
}

export function softDeleteSecret(secretId: string): Promise<void> {
  return invoke("soft_delete_secret", {
    secretId,
  });
}

export async function listSecretHistory(secretId: string): Promise<SecretHistoryDto[]> {
  const history = await invoke<SecretHistoryDto[]>("list_secret_history", {
    secretId,
  });

  return history.map(sanitizeSecretHistory);
}

export async function revealSecretHistory(
  historyId: string,
): Promise<RevealedSecretHistoryDto> {
  return invoke<RevealedSecretHistoryDto>("reveal_secret_history", {
    historyId,
  });
}
