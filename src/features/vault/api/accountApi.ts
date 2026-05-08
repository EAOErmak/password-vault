import { invoke } from "@tauri-apps/api/core";
import type {
  AccountDetails,
  AccountDetailsDto,
  AccountSummary,
  AccountSummaryDto,
  AccountValueDto,
  CreateAccountRequest,
  ListAccountsFilter,
  PlatformDto,
  SecretMetadataDto,
  UpdateAccountRequest,
} from "../types";

function sanitizePlatform(platform: PlatformDto): PlatformDto {
  const { id, name, normalized_name, created_at } = platform;

  return {
    id,
    name,
    normalized_name,
    created_at,
  };
}

function sanitizeAccountValue(value: AccountValueDto): AccountValueDto {
  const {
    id,
    account_id,
    value_type,
    label,
    value: accountValue,
    is_primary,
    created_at,
    updated_at,
  } = value;

  return {
    id,
    account_id,
    value_type,
    label,
    value: accountValue,
    is_primary,
    created_at,
    updated_at,
  };
}

function sanitizeSecretMetadata(secret: SecretMetadataDto): SecretMetadataDto {
  const { id, account_id, secret_type, label, is_primary, secret_length, created_at, updated_at } = secret;

  return {
    id,
    account_id,
    secret_type,
    label,
    is_primary,
    secret_length,
    created_at,
    updated_at,
  };
}

function sanitizeAccountSummary(account: AccountSummaryDto): AccountSummary {
  const {
    id,
    name,
    notes,
    secret_count,
    created_at,
    updated_at,
    platform,
    values,
    secrets,
  } = account;

  return {
    id,
    name,
    notes,
    secret_count,
    created_at,
    updated_at,
    platform: sanitizePlatform(platform),
    values: values.map(sanitizeAccountValue),
    secrets: secrets.map(sanitizeSecretMetadata),
  };
}

function sanitizeAccountDetails(account: AccountDetailsDto): AccountDetails {
  const {
    id,
    name,
    notes,
    created_at,
    updated_at,
    platform,
    values,
    secrets,
  } = account;

  return {
    id,
    name,
    notes,
    created_at,
    updated_at,
    platform: sanitizePlatform(platform),
    values: values.map(sanitizeAccountValue),
    secrets: secrets.map(sanitizeSecretMetadata),
  };
}

export async function listAccounts(
  filter?: ListAccountsFilter,
): Promise<AccountSummary[]> {
  const accounts = await invoke<AccountSummaryDto[]>("list_accounts", {
    filter: filter ?? null,
  });

  return accounts.map(sanitizeAccountSummary);
}

export async function getAccountDetails(
  accountId: string,
): Promise<AccountDetails> {
  const account = await invoke<AccountDetailsDto>("get_account_details", {
    accountId,
  });

  return sanitizeAccountDetails(account);
}

export async function createAccount(
  request: CreateAccountRequest,
): Promise<AccountDetails> {
  const account = await invoke<AccountDetailsDto>("create_account", {
    request,
  });

  return sanitizeAccountDetails(account);
}

export async function updateAccount(
  accountId: string,
  request: UpdateAccountRequest,
): Promise<AccountDetails> {
  const account = await invoke<AccountDetailsDto>("update_account", {
    accountId,
    request,
  });

  return sanitizeAccountDetails(account);
}

export function softDeleteAccount(accountId: string): Promise<void> {
  return invoke("soft_delete_account", {
    accountId,
  });
}
