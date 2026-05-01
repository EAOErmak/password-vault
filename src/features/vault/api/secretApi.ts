import { invoke } from "@tauri-apps/api/core";
import type {
  AddSecretRequest,
  RevealedSecretDto,
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

export function softDeleteSecret(secretId: string): Promise<void> {
  return invoke("soft_delete_secret", {
    secretId,
  });
}
