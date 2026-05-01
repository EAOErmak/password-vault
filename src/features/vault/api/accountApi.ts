import { invoke } from "@tauri-apps/api/core";
import type {
  AccountDetails,
  AccountDetailsDto,
  AccountSummary,
  AccountSummaryDto,
  AccountValueDto,
  AccountValueMetadata,
  CreateAccountRequest,
  ListAccountsFilter,
  PlatformDto,
  SecretMetadataDto,
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

function sanitizeValueMetadata(value: AccountValueDto): AccountValueMetadata {
  const { value: _ignoredValue, ...metadata } = value;
  return metadata;
}

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
  } = account;

  return {
    id,
    name,
    notes,
    secret_count,
    created_at,
    updated_at,
    platform: sanitizePlatform(platform),
    values: values.map(sanitizeValueMetadata),
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
    values: values.map(sanitizeValueMetadata),
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
