use std::collections::HashMap;

use uuid::Uuid;
use zeroize::Zeroize;

use crate::app_state::AppState;
use crate::vault::domain::{AccountValueType, Platform, SecretType};
use crate::vault::dto::import_dto::{
    ImportTxtAccountsRequest, ImportTxtAccountsResultDto, ParsedTxtImportDto,
    TxtImportAccountDraftDto, TxtImportFieldDraftDto, TxtImportFieldTarget,
};
use crate::vault::error::VaultError;
use crate::vault::repository::account_repository::AccountRepository;
use crate::vault::repository::platform_repository::PlatformRepository;
use crate::vault::repository::secret_repository::SecretRepository;
use crate::vault::repository::value_repository::ValueRepository;
use crate::vault::{normalize_platform_name, now_utc};

pub struct ImportService;

struct ParsedEntryField {
    key: String,
    value: String,
}

impl ImportService {
    pub fn parse_txt_import(&self, content: &str) -> Result<ParsedTxtImportDto, VaultError> {
        let trimmed = content.trim();
        if trimmed.is_empty() {
            return Err(VaultError::Validation(
                "import text cannot be empty".to_string(),
            ));
        }

        let normalized_content = content.replace("\r\n", "\n");
        let blocks = Self::split_blocks(&normalized_content);
        if blocks.is_empty() {
            return Err(VaultError::Validation(
                "no import entries were found in the text file".to_string(),
            ));
        }

        let accounts = blocks
            .iter()
            .enumerate()
            .map(|(index, block)| Self::parse_block(index + 1, block))
            .collect::<Result<Vec<_>, _>>()?;

        Ok(ParsedTxtImportDto { accounts })
    }

    pub fn import_txt_accounts(
        &self,
        state: &AppState,
        request: &ImportTxtAccountsRequest,
    ) -> Result<ImportTxtAccountsResultDto, VaultError> {
        if request.accounts.is_empty() {
            return Err(VaultError::Validation(
                "at least one account draft is required for import".to_string(),
            ));
        }

        state.with_connection_mut(|connection| {
            let transaction = connection.transaction()?;
            let mut platform_cache: HashMap<String, Platform> = HashMap::new();
            let mut result = ImportTxtAccountsResultDto {
                platforms_created: 0,
                accounts_imported: 0,
                values_imported: 0,
                secrets_imported: 0,
            };

            for (entry_index, draft) in request.accounts.iter().enumerate() {
                let platform_name = Self::sanitize_required_text(
                    draft.platform_name.as_str(),
                    &format!("entry {} platform name cannot be empty", entry_index + 1),
                )?;
                let normalized_platform_name = normalize_platform_name(&platform_name);
                if normalized_platform_name.is_empty() {
                    return Err(VaultError::Validation(format!(
                        "entry {} platform name cannot be empty",
                        entry_index + 1
                    )));
                }

                let platform = if let Some(existing_platform) =
                    platform_cache.get(&normalized_platform_name)
                {
                    existing_platform.clone()
                } else if let Some(existing_platform) = PlatformRepository::find_by_normalized_name(
                    &transaction,
                    &normalized_platform_name,
                )? {
                    platform_cache
                        .insert(normalized_platform_name.clone(), existing_platform.clone());
                    existing_platform
                } else {
                    let created_platform = PlatformRepository::create(
                        &transaction,
                        &platform_name,
                        &normalized_platform_name,
                        &now_utc(),
                    )?;
                    result.platforms_created += 1;
                    platform_cache
                        .insert(normalized_platform_name.clone(), created_platform.clone());
                    created_platform
                };

                let account_name = Self::sanitize_optional_text(draft.name.as_deref());
                let account_notes = Self::sanitize_optional_text(draft.notes.as_deref());
                let account = AccountRepository::create(
                    &transaction,
                    account_name.as_deref(),
                    platform.id,
                    account_notes.as_deref(),
                    &now_utc(),
                )?;
                result.accounts_imported += 1;

                let mut seen_value_types = Vec::new();
                let mut seen_secret_types = Vec::new();

                for (field_index, field) in draft.fields.iter().enumerate() {
                    if let Some(vt) = &field.value_type {
                        if vt != &AccountValueType::Custom {
                            if seen_value_types.contains(vt) {
                                return Err(VaultError::Validation(format!(
                                    "entry {} contains more than one field of type: {}",
                                    entry_index + 1,
                                    vt.as_str()
                                )));
                            }
                            seen_value_types.push(vt.clone());
                        }
                    }

                    if let Some(st) = &field.secret_type {
                        if st != &SecretType::CustomSecret {
                            if seen_secret_types.contains(st) {
                                return Err(VaultError::Validation(format!(
                                    "entry {} contains more than one secret of type: {}",
                                    entry_index + 1,
                                    st.as_str()
                                )));
                            }
                            seen_secret_types.push(st.clone());
                        }
                    }

                    Self::import_field(
                        &transaction,
                        account.id,
                        entry_index + 1,
                        field_index + 1,
                        field,
                        &mut result,
                    )?;
                }
            }

            transaction.commit()?;
            Ok(result)
        })
    }

    fn split_blocks(content: &str) -> Vec<Vec<String>> {
        let mut blocks = Vec::new();
        let mut current_block = Vec::new();

        for line in content.lines() {
            if line.trim() == "---" {
                if !current_block.is_empty() {
                    blocks.push(current_block);
                    current_block = Vec::new();
                }
                continue;
            }

            if current_block.is_empty() && line.trim().is_empty() {
                continue;
            }

            current_block.push(line.to_string());
        }

        if !current_block.is_empty() {
            blocks.push(current_block);
        }

        blocks
    }

    fn parse_block(
        entry_index: usize,
        block_lines: &[String],
    ) -> Result<TxtImportAccountDraftDto, VaultError> {
        let raw_fields = Self::parse_raw_fields(entry_index, block_lines)?;
        let mut platform_name = None;
        let mut account_name = None;
        let mut notes = None;
        let mut fields = Vec::new();
        let mut primary_value_types = Vec::new();
        let mut primary_secret_types = Vec::new();

        for raw_field in raw_fields {
            let normalized_key = Self::normalize_import_key(&raw_field.key);

            match normalized_key.as_str() {
                "platform" => {
                    if platform_name.is_some() {
                        return Err(VaultError::Validation(format!(
                            "entry {entry_index} contains more than one Platform field"
                        )));
                    }
                    platform_name = Some(Self::sanitize_required_text(
                        &raw_field.value,
                        &format!("entry {entry_index} platform name cannot be empty"),
                    )?);
                }
                "name" => {
                    if account_name.is_some() {
                        return Err(VaultError::Validation(format!(
                            "entry {entry_index} contains more than one Name field"
                        )));
                    }
                    account_name = Some(Self::sanitize_optional_text(Some(&raw_field.value)));
                }
                "notes" => {
                    if notes.is_some() {
                        return Err(VaultError::Validation(format!(
                            "entry {entry_index} contains more than one Notes field"
                        )));
                    }
                    notes = Some(Self::sanitize_optional_text(Some(&raw_field.value)));
                }
                _ => {
                    let mut field = Self::map_import_field(raw_field)?;
                    match field.target {
                        TxtImportFieldTarget::AccountValue => {
                            if let Some(value_type) = field.value_type.clone() {
                                if !primary_value_types.contains(&value_type) {
                                    field.is_primary =
                                        !matches!(value_type, AccountValueType::Custom);
                                    primary_value_types.push(value_type);
                                }
                            }
                        }
                        TxtImportFieldTarget::Secret => {
                            if let Some(secret_type) = field.secret_type.clone() {
                                if !primary_secret_types.contains(&secret_type) {
                                    field.is_primary = matches!(secret_type, SecretType::Password);
                                    primary_secret_types.push(secret_type);
                                }
                            }
                        }
                        TxtImportFieldTarget::Skip => {}
                    }

                    fields.push(field);
                }
            }
        }

        let platform_name = platform_name.ok_or_else(|| {
            VaultError::Validation(format!("entry {entry_index} is missing Platform field"))
        })?;

        Ok(TxtImportAccountDraftDto {
            platform_name,
            name: account_name.unwrap_or(None),
            notes: notes.unwrap_or(None),
            fields,
        })
    }

    fn parse_raw_fields(
        entry_index: usize,
        block_lines: &[String],
    ) -> Result<Vec<ParsedEntryField>, VaultError> {
        let mut fields = Vec::new();
        let mut current_field: Option<ParsedEntryField> = None;

        for line in block_lines {
            let trimmed_end = line.trim_end();
            if trimmed_end.trim().is_empty() {
                if let Some(field) = current_field.as_mut() {
                    if !field.value.is_empty() {
                        field.value.push('\n');
                    }
                }
                continue;
            }

            if let Some((key, value)) = Self::split_field_header(trimmed_end) {
                if let Some(field) = current_field.take() {
                    fields.push(field);
                }
                current_field = Some(ParsedEntryField { key, value });
                continue;
            }

            let field = current_field.as_mut().ok_or_else(|| {
                VaultError::Validation(format!(
                    "entry {entry_index} contains text outside of a field: {}",
                    trimmed_end.trim()
                ))
            })?;

            if !field.value.is_empty() {
                field.value.push('\n');
            }
            field.value.push_str(trimmed_end.trim());
        }

        if let Some(field) = current_field.take() {
            fields.push(field);
        }

        if fields.is_empty() {
            return Err(VaultError::Validation(format!(
                "entry {entry_index} does not contain any importable fields"
            )));
        }

        Ok(fields)
    }

    fn split_field_header(line: &str) -> Option<(String, String)> {
        let separator_index = line.find(':')?;
        let key = line[..separator_index].trim();
        if !Self::is_valid_field_key(key) {
            return None;
        }

        let value = line[separator_index + 1..].trim().to_string();
        Some((key.to_string(), value))
    }

    fn is_valid_field_key(value: &str) -> bool {
        !value.is_empty()
            && value
                .chars()
                .any(|character| character.is_ascii_alphabetic())
            && value.chars().all(|character| {
                character.is_ascii_alphanumeric() || matches!(character, ' ' | '_' | '-')
            })
    }

    fn normalize_import_key(value: &str) -> String {
        value
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
            .to_ascii_lowercase()
    }

    fn map_import_field(raw_field: ParsedEntryField) -> Result<TxtImportFieldDraftDto, VaultError> {
        let value = Self::sanitize_required_text(
            &raw_field.value,
            &format!("field '{}' cannot be empty", raw_field.key),
        )?;
        let normalized_key = Self::normalize_import_key(&raw_field.key);

        let field = match normalized_key.as_str() {
            "email" => {
                Self::account_value_field(&raw_field.key, "Email", value, AccountValueType::Email)
            }
            "phone" | "phone number" => Self::account_value_field(
                &raw_field.key,
                "Phone number",
                value,
                AccountValueType::PhoneNumber,
            ),
            "nickname" => Self::account_value_field(
                &raw_field.key,
                "Nickname",
                value,
                AccountValueType::Nickname,
            ),
            "username" => Self::account_value_field(
                &raw_field.key,
                "Username",
                value,
                AccountValueType::Username,
            ),
            "login" => {
                Self::account_value_field(&raw_field.key, "Login", value, AccountValueType::Login)
            }
            "password" => {
                Self::secret_field(&raw_field.key, "Password", value, SecretType::Password)
            }
            "backup code" | "backup codes" => Self::secret_field(
                &raw_field.key,
                "Backup codes",
                value,
                SecretType::BackupCode,
            ),
            "recovery key" => Self::secret_field(
                &raw_field.key,
                "Recovery key",
                value,
                SecretType::RecoveryKey,
            ),
            "totp secret" => {
                Self::secret_field(&raw_field.key, "TOTP secret", value, SecretType::TotpSecret)
            }
            "security answer" => Self::secret_field(
                &raw_field.key,
                "Security answer",
                value,
                SecretType::SecurityAnswer,
            ),
            _ => TxtImportFieldDraftDto {
                source_key: raw_field.key.clone(),
                target: TxtImportFieldTarget::AccountValue,
                label: raw_field.key,
                value,
                is_primary: false,
                value_type: Some(AccountValueType::Custom),
                secret_type: None,
            },
        };

        Ok(field)
    }

    fn account_value_field(
        source_key: &str,
        label: &str,
        value: String,
        value_type: AccountValueType,
    ) -> TxtImportFieldDraftDto {
        TxtImportFieldDraftDto {
            source_key: source_key.to_string(),
            target: TxtImportFieldTarget::AccountValue,
            label: label.to_string(),
            value,
            is_primary: false,
            value_type: Some(value_type),
            secret_type: None,
        }
    }

    fn secret_field(
        source_key: &str,
        label: &str,
        value: String,
        secret_type: SecretType,
    ) -> TxtImportFieldDraftDto {
        TxtImportFieldDraftDto {
            source_key: source_key.to_string(),
            target: TxtImportFieldTarget::Secret,
            label: label.to_string(),
            value,
            is_primary: false,
            value_type: None,
            secret_type: Some(secret_type),
        }
    }

    fn import_field(
        transaction: &rusqlite::Transaction<'_>,
        account_id: Uuid,
        entry_index: usize,
        field_index: usize,
        field: &TxtImportFieldDraftDto,
        result: &mut ImportTxtAccountsResultDto,
    ) -> Result<(), VaultError> {
        match field.target {
            TxtImportFieldTarget::Skip => Ok(()),
            TxtImportFieldTarget::AccountValue => {
                let value_type = field.value_type.clone().ok_or_else(|| {
                    VaultError::Validation(format!(
                        "entry {entry_index} field {field_index} is missing an account value type"
                    ))
                })?;
                let value = Self::sanitize_required_text(
                    &field.value,
                    &format!(
                        "entry {entry_index} field {field_index} account value cannot be empty"
                    ),
                )?;

                ValueRepository::create(
                    transaction,
                    account_id,
                    &value_type,
                    &value,
                    field.is_primary,
                    &now_utc(),
                )?;
                result.values_imported += 1;
                Ok(())
            }
            TxtImportFieldTarget::Secret => {
                let secret_type = field.secret_type.clone().ok_or_else(|| {
                    VaultError::Validation(format!(
                        "entry {entry_index} field {field_index} is missing a secret type"
                    ))
                })?;
                let mut secret_value = Self::sanitize_required_text(
                    &field.value,
                    &format!(
                        "entry {entry_index} field {field_index} secret value cannot be empty"
                    ),
                )?;

                let create_result = SecretRepository::create(
                    transaction,
                    account_id,
                    &secret_type,
                    &secret_value,
                    field.is_primary,
                    &now_utc(),
                );
                secret_value.zeroize();
                create_result?;

                result.secrets_imported += 1;
                Ok(())
            }
        }
    }

    fn sanitize_required_text(value: &str, error_message: &str) -> Result<String, VaultError> {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            Err(VaultError::Validation(error_message.to_string()))
        } else {
            Ok(trimmed.to_string())
        }
    }

    fn sanitize_optional_text(value: Option<&str>) -> Option<String> {
        value.and_then(|text| {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use tempfile::TempDir;

    use crate::app_state::AppState;
    use crate::vault::domain::{AccountValueType, SecretType};
    use crate::vault::dto::import_dto::{ImportTxtAccountsRequest, TxtImportFieldTarget};
    use crate::vault::error::VaultError;
    use crate::vault::service::account_service::AccountService;
    use crate::vault::service::import_service::ImportService;
    use crate::vault::service::secret_service::SecretService;
    use crate::vault::service::vault_service::VaultService;

    const MASTER_PASSWORD: &str = "correct horse battery staple";

    #[test]
    fn parser_extracts_accounts_values_and_multiline_secrets() {
        let service = ImportService;
        let parsed = service
            .parse_txt_import(
                "Platform: Google\nName: Main Google\nEmail: example@gmail.com\nLogin: example-login\nPassword: my-password\nBackup Codes:\ncode1\ncode2\n---\n",
            )
            .unwrap();

        assert_eq!(parsed.accounts.len(), 1);
        assert_eq!(parsed.accounts[0].platform_name, "Google");
        assert_eq!(parsed.accounts[0].name.as_deref(), Some("Main Google"));
        assert_eq!(parsed.accounts[0].fields.len(), 4);
        assert!(parsed.accounts[0]
            .fields
            .iter()
            .any(|field| field.value_type == Some(AccountValueType::Email)));
        assert!(parsed.accounts[0]
            .fields
            .iter()
            .any(|field| field.secret_type == Some(SecretType::Password)));
        assert!(parsed.accounts[0].fields.iter().any(|field| {
            field.secret_type == Some(SecretType::BackupCode) && field.value == "code1\ncode2"
        }));
    }

    #[test]
    fn parser_rejects_missing_platform() {
        let service = ImportService;
        let error = service
            .parse_txt_import("Name: Missing platform\nPassword: secret\n---\n")
            .unwrap_err();

        assert!(matches!(error, VaultError::Validation(_)));
        assert!(error.to_string().contains("missing Platform"));
    }

    #[test]
    fn import_creates_platforms_accounts_values_and_secrets_from_mapping() {
        let (_temp_dir, state) = setup_unlocked_vault();
        let service = ImportService;
        let mut parsed = service
            .parse_txt_import(
                "Platform: Google\nName: Main Google\nEmail: example@gmail.com\nMystery Field: hidden-value\nPassword: my-password\n---\n",
            )
            .unwrap();

        let mystery_field = parsed.accounts[0]
            .fields
            .iter_mut()
            .find(|field| field.source_key == "Mystery Field")
            .unwrap();
        mystery_field.target = TxtImportFieldTarget::Secret;
        mystery_field.value_type = None;
        mystery_field.secret_type = Some(SecretType::CustomSecret);
        mystery_field.label = "Imported secret".to_string();

        let result = service
            .import_txt_accounts(
                &state,
                &ImportTxtAccountsRequest {
                    accounts: parsed.accounts,
                },
            )
            .unwrap();
        let accounts = AccountService.list_accounts(&state, None).unwrap();
        let details = AccountService
            .get_account_details(&state, accounts[0].id)
            .unwrap();
        let custom_secret_id = details
            .secrets
            .iter()
            .find(|secret| secret.secret_type == SecretType::CustomSecret)
            .map(|secret| secret.id)
            .unwrap();
        let revealed_secret = SecretService
            .reveal_secret(&state, custom_secret_id)
            .unwrap();

        assert_eq!(result.platforms_created, 1);
        assert_eq!(result.accounts_imported, 1);
        assert_eq!(result.values_imported, 1);
        assert_eq!(result.secrets_imported, 2);
        assert_eq!(accounts.len(), 1);
        assert_eq!(details.platform.name, "Google");
        assert_eq!(revealed_secret.secret_value, "hidden-value");
    }

    fn setup_unlocked_vault() -> (TempDir, AppState) {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("vault.db");
        let state = AppState::default();
        let vault_service = VaultService;

        vault_service
            .create_vault(&state, db_path.to_str().unwrap(), MASTER_PASSWORD)
            .unwrap();

        (temp_dir, state)
    }
}
