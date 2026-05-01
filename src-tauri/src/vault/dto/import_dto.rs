use serde::{Deserialize, Serialize};

use crate::vault::domain::{AccountValueType, SecretType};

#[derive(Debug, Clone, Serialize)]
pub struct ParsedTxtImportDto {
    pub accounts: Vec<TxtImportAccountDraftDto>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ParseTxtImportRequest {
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TxtImportAccountDraftDto {
    pub platform_name: String,
    pub name: Option<String>,
    pub notes: Option<String>,
    pub fields: Vec<TxtImportFieldDraftDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TxtImportFieldDraftDto {
    pub source_key: String,
    pub target: TxtImportFieldTarget,
    pub label: String,
    pub value: String,
    pub is_primary: bool,
    pub value_type: Option<AccountValueType>,
    pub secret_type: Option<SecretType>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TxtImportFieldTarget {
    AccountValue,
    Secret,
    Skip,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ImportTxtAccountsRequest {
    pub accounts: Vec<TxtImportAccountDraftDto>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportTxtAccountsResultDto {
    pub platforms_created: usize,
    pub accounts_imported: usize,
    pub values_imported: usize,
    pub secrets_imported: usize,
}
