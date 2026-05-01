import { invoke } from "@tauri-apps/api/core";
import type {
  ImportTxtAccountsRequest,
  ImportTxtAccountsResultDto,
  ParsedTxtImportDto,
} from "../types";

export function parseTxtImport(content: string): Promise<ParsedTxtImportDto> {
  return invoke("parse_txt_import", {
    request: { content },
  });
}

export function importTxtAccounts(
  request: ImportTxtAccountsRequest,
): Promise<ImportTxtAccountsResultDto> {
  return invoke("import_txt_accounts", {
    request,
  });
}
