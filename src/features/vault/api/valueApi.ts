import { invoke } from "@tauri-apps/api/core";
import type {
  AccountValueDto,
  AddAccountValueRequest,
  UpdateAccountValueRequest,
} from "../types";

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

export async function addAccountValue(
  accountId: string,
  request: AddAccountValueRequest,
): Promise<AccountValueDto> {
  const value = await invoke<AccountValueDto>("add_account_value", {
    accountId,
    request,
  });

  return sanitizeAccountValue(value);
}

export async function updateAccountValue(
  valueId: string,
  request: UpdateAccountValueRequest,
): Promise<AccountValueDto> {
  const value = await invoke<AccountValueDto>("update_account_value", {
    valueId,
    request,
  });

  return sanitizeAccountValue(value);
}

export function softDeleteAccountValue(valueId: string): Promise<void> {
  return invoke("soft_delete_account_value", {
    valueId,
  });
}
