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

export type AccountSummaryDto = {
  id: string;
  name: string | null;
  platform: PlatformDto;
  notes: string | null;
  values: AccountValueDto[];
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

export type AccountValueMetadata = Omit<AccountValueDto, "value">;

export type AccountSummary = Omit<AccountSummaryDto, "values"> & {
  values: AccountValueMetadata[];
};

export type AccountDetails = Omit<AccountDetailsDto, "values" | "secrets"> & {
  values: AccountValueMetadata[];
  secrets: SecretMetadataDto[];
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

export type ListAccountsFilter = {
  search?: string | null;
  platform_id?: string | null;
};
