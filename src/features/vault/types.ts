export type PlatformDto = {
  id: string;
  name: string;
  normalized_name: string;
  created_at: string;
};

export type AccountValueType =
  | "EMAIL"
  | "PHONE_NUMBER"
  | "NICKNAME"
  | "USERNAME"
  | "LOGIN"
  | "CUSTOM";

export type SecretType =
  | "PASSWORD"
  | "BACKUP_CODE"
  | "RECOVERY_KEY"
  | "TOTP_SECRET"
  | "SECURITY_ANSWER"
  | "CUSTOM_SECRET";

export type AccountValueDto = {
  id: string;
  account_id: string;
  value_type: AccountValueType;
  label: string;
  value: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type SecretMetadataDto = {
  id: string;
  account_id: string;
  secret_type: SecretType;
  label: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type RevealedSecretDto = {
  id: string;
  account_id: string;
  secret_type: SecretType;
  label: string;
  secret_value: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type AccountValueHistoryDto = {
  id: string;
  account_value_id: string;
  account_id: string;
  old_value: string;
  new_value: string;
  changed_at: string;
};

export type SecretHistoryDto = {
  id: string;
  secret_id: string;
  account_id: string;
  changed_at: string;
  has_old_value: boolean;
  has_new_value: boolean;
};

export type RevealedSecretHistoryDto = {
  id: string;
  secret_id: string;
  account_id: string;
  old_secret_value: string;
  new_secret_value: string;
  changed_at: string;
};

export type AccountSummaryDto = {
  id: string;
  name: string | null;
  platform: PlatformDto;
  notes: string | null;
  values: AccountValueDto[];
  secrets: SecretMetadataDto[];
  secret_count: number;
  created_at: string;
  updated_at: string;
};

export type AccountDetailsDto = {
  id: string;
  name: string | null;
  platform: PlatformDto;
  notes: string | null;
  values: AccountValueDto[];
  secrets: SecretMetadataDto[];
  created_at: string;
  updated_at: string;
};

export type AccountSummary = AccountSummaryDto;

export type AccountDetails = Omit<AccountDetailsDto, "secrets"> & {
  secrets: SecretMetadataDto[];
};

export type AccountTableRow = {
  accountId: string;
  accountName: string | null;
  platformName: string;
  valueId: string | null;
  value: string | null;
  valueType: AccountValueType | null;
  hasAnyPasswordSecret: boolean;
  primaryPasswordSecretId: string | null;
  hasPrimaryPasswordSecret: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatePlatformRequest = {
  name: string;
};

export type CreateAccountRequest = {
  name: string | null;
  platform_id: string;
  notes: string | null;
};

export type UpdateAccountRequest = {
  name: string | null;
  platform_id: string;
  notes: string | null;
};

export type AddAccountValueRequest = {
  value_type: AccountValueType;
  label: string;
  value: string;
  is_primary: boolean;
};

export type UpdateAccountValueRequest = {
  value_type: AccountValueType;
  label: string;
  value: string;
  is_primary: boolean;
};

export type AddSecretRequest = {
  secret_type: SecretType;
  label: string;
  secret_value: string;
  is_primary: boolean;
};

export type UpdateSecretRequest = {
  secret_type: SecretType;
  label: string;
  secret_value: string;
  is_primary: boolean;
};

export type GeneratePasswordOptions = {
  length: number;
  include_uppercase: boolean;
  include_lowercase: boolean;
  include_digits: boolean;
  include_symbols: boolean;
  exclude_ambiguous: boolean;
};

export type TxtImportFieldTarget = "ACCOUNT_VALUE" | "SECRET" | "SKIP";

export type TxtImportFieldDraftDto = {
  source_key: string;
  target: TxtImportFieldTarget;
  label: string;
  value: string;
  is_primary: boolean;
  value_type: AccountValueType | null;
  secret_type: SecretType | null;
};

export type TxtImportAccountDraftDto = {
  platform_name: string;
  name: string | null;
  notes: string | null;
  fields: TxtImportFieldDraftDto[];
};

export type ParsedTxtImportDto = {
  accounts: TxtImportAccountDraftDto[];
};

export type ImportTxtAccountsRequest = {
  accounts: TxtImportAccountDraftDto[];
};

export type ImportTxtAccountsResultDto = {
  platforms_created: number;
  accounts_imported: number;
  values_imported: number;
  secrets_imported: number;
};

export type ExportEncryptedBackupDto = {
  backup_path: string;
};

export type RestoreEncryptedBackupDto = {
  restored_path: string;
  safety_backup_path: string;
};

export type ListAccountsFilter = {
  search?: string | null;
  platform_id?: string | null;
};
