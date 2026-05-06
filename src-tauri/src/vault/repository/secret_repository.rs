use chrono::{DateTime, Utc};
use rusqlite::{params, OptionalExtension, Row};
use uuid::Uuid;

use crate::vault::domain::{Secret, SecretHistory, SecretType};
use crate::vault::error::VaultError;
use crate::vault::repository::SqlExecutor;
use crate::vault::{parse_optional_timestamp, parse_timestamp, parse_uuid, to_timestamp};

pub struct SecretRepository;

#[derive(Debug, Clone)]
pub struct SecretMetadataRecord {
    pub id: Uuid,
    pub account_id: Uuid,
    pub secret_type: SecretType,
    pub label: String,
    pub is_primary: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

struct SecretRow {
    id: String,
    account_id: String,
    secret_type: String,
    label: String,
    secret_value: String,
    is_primary: i64,
    created_at: String,
    updated_at: String,
    deleted_at: Option<String>,
}

struct SecretMetadataRow {
    id: String,
    account_id: String,
    secret_type: String,
    label: String,
    is_primary: i64,
    created_at: String,
    updated_at: String,
}

struct SecretHistoryRow {
    id: String,
    secret_id: String,
    account_id: String,
    old_secret_value: String,
    new_secret_value: String,
    changed_at: String,
}

impl SecretRepository {
    pub fn create(
        executor: &impl SqlExecutor,
        account_id: Uuid,
        secret_type: &SecretType,
        label: &str,
        secret_value: &str,
        is_primary: bool,
        now: &DateTime<Utc>,
    ) -> Result<SecretMetadataRecord, VaultError> {
        let id = Uuid::new_v4();
        let timestamp = to_timestamp(now);

        executor.connection().execute(
            "INSERT INTO secrets
                 (id, account_id, secret_type, label, secret_value, is_primary, created_at, updated_at, deleted_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL)",
            params![
                id.to_string(),
                account_id.to_string(),
                secret_type.as_str(),
                label,
                secret_value,
                if is_primary { 1 } else { 0 },
                &timestamp,
                &timestamp
            ],
        )?;

        Ok(SecretMetadataRecord {
            id,
            account_id,
            secret_type: secret_type.clone(),
            label: label.to_string(),
            is_primary,
            created_at: now.clone(),
            updated_at: now.clone(),
        })
    }

    pub fn list_metadata_by_account(
        executor: &impl SqlExecutor,
        account_id: Uuid,
    ) -> Result<Vec<SecretMetadataRecord>, VaultError> {
        let mut statement = executor.connection().prepare(
            "SELECT s.id, s.account_id, s.secret_type, s.label, s.is_primary, s.created_at, s.updated_at
             FROM secrets s
             INNER JOIN accounts a ON a.id = s.account_id
             WHERE s.account_id = ?1
               AND s.deleted_at IS NULL
               AND a.deleted_at IS NULL
             ORDER BY s.is_primary DESC, s.created_at ASC",
        )?;

        let rows = statement
            .query_map(params![account_id.to_string()], Self::map_metadata_row)?
            .collect::<Result<Vec<_>, _>>()?;

        rows.into_iter().map(Self::build_secret_metadata).collect()
    }

    pub fn find_active_by_id(
        executor: &impl SqlExecutor,
        secret_id: Uuid,
    ) -> Result<Option<Secret>, VaultError> {
        let row = executor
            .connection()
            .query_row(
                "SELECT s.id, s.account_id, s.secret_type, s.label, s.secret_value, s.is_primary, s.created_at, s.updated_at, s.deleted_at
                 FROM secrets s
                 INNER JOIN accounts a ON a.id = s.account_id
                 WHERE s.id = ?1
                   AND s.deleted_at IS NULL
                   AND a.deleted_at IS NULL",
                params![secret_id.to_string()],
                Self::map_row,
            )
            .optional()?;

        row.map(Self::build_secret).transpose()
    }

    pub fn find_active_metadata_by_id(
        executor: &impl SqlExecutor,
        secret_id: Uuid,
    ) -> Result<Option<SecretMetadataRecord>, VaultError> {
        let row = executor
            .connection()
            .query_row(
                "SELECT s.id, s.account_id, s.secret_type, s.label, s.is_primary, s.created_at, s.updated_at
                 FROM secrets s
                 INNER JOIN accounts a ON a.id = s.account_id
                 WHERE s.id = ?1
                   AND s.deleted_at IS NULL
                   AND a.deleted_at IS NULL",
                params![secret_id.to_string()],
                Self::map_metadata_row,
            )
            .optional()?;

        row.map(Self::build_secret_metadata).transpose()
    }

    pub fn update(
        executor: &impl SqlExecutor,
        secret_id: Uuid,
        secret_type: &SecretType,
        label: &str,
        secret_value: &str,
        is_primary: bool,
        now: &DateTime<Utc>,
    ) -> Result<bool, VaultError> {
        let affected_rows = executor.connection().execute(
            "UPDATE secrets
             SET secret_type = ?1,
                 label = ?2,
                 secret_value = ?3,
                 is_primary = ?4,
                 updated_at = ?5
             WHERE id = ?6
               AND deleted_at IS NULL
               AND EXISTS (
                   SELECT 1
                   FROM accounts a
                   WHERE a.id = secrets.account_id
                     AND a.deleted_at IS NULL
               )",
            params![
                secret_type.as_str(),
                label,
                secret_value,
                if is_primary { 1 } else { 0 },
                to_timestamp(now),
                secret_id.to_string()
            ],
        )?;

        Ok(affected_rows > 0)
    }

    pub fn demote_all_primaries(
        executor: &impl SqlExecutor,
        account_id: Uuid,
        now: &DateTime<Utc>,
    ) -> Result<bool, VaultError> {
        let timestamp = to_timestamp(now);
        let affected_rows = executor.connection().execute(
            "UPDATE secrets
             SET is_primary = 0,
                 updated_at = ?1
             WHERE account_id = ?2
               AND is_primary = 1
               AND deleted_at IS NULL",
            params![&timestamp, account_id.to_string()],
        )?;

        Ok(affected_rows > 0)
    }

    pub fn soft_delete(
        executor: &impl SqlExecutor,
        secret_id: Uuid,
        now: &DateTime<Utc>,
    ) -> Result<bool, VaultError> {
        let timestamp = to_timestamp(now);
        let affected_rows = executor.connection().execute(
            "UPDATE secrets
             SET deleted_at = ?1,
                 updated_at = ?2
             WHERE id = ?3
               AND deleted_at IS NULL
               AND EXISTS (
                   SELECT 1
                   FROM accounts a
                   WHERE a.id = secrets.account_id
                     AND a.deleted_at IS NULL
               )",
            params![&timestamp, &timestamp, secret_id.to_string()],
        )?;

        Ok(affected_rows > 0)
    }

    pub fn insert_history(
        executor: &impl SqlExecutor,
        history: &SecretHistory,
    ) -> Result<(), VaultError> {
        executor.connection().execute(
            "INSERT INTO secret_history
                 (id, secret_id, account_id, old_secret_value, new_secret_value, changed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                history.id.to_string(),
                history.secret_id.to_string(),
                history.account_id.to_string(),
                &history.old_secret_value,
                &history.new_secret_value,
                to_timestamp(&history.changed_at)
            ],
        )?;

        Ok(())
    }

    pub fn list_history_by_secret(
        executor: &impl SqlExecutor,
        secret_id: Uuid,
    ) -> Result<Vec<SecretHistory>, VaultError> {
        let mut statement = executor.connection().prepare(
            "SELECT id, secret_id, account_id, old_secret_value, new_secret_value, changed_at
             FROM secret_history
             WHERE secret_id = ?1
             ORDER BY changed_at DESC",
        )?;

        let rows = statement
            .query_map(params![secret_id.to_string()], Self::map_history_row)?
            .collect::<Result<Vec<_>, _>>()?;

        rows.into_iter().map(Self::build_history).collect()
    }

    fn map_row(row: &Row<'_>) -> rusqlite::Result<SecretRow> {
        Ok(SecretRow {
            id: row.get(0)?,
            account_id: row.get(1)?,
            secret_type: row.get(2)?,
            label: row.get(3)?,
            secret_value: row.get(4)?,
            is_primary: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
            deleted_at: row.get(8)?,
        })
    }

    fn map_metadata_row(row: &Row<'_>) -> rusqlite::Result<SecretMetadataRow> {
        Ok(SecretMetadataRow {
            id: row.get(0)?,
            account_id: row.get(1)?,
            secret_type: row.get(2)?,
            label: row.get(3)?,
            is_primary: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }

    fn map_history_row(row: &Row<'_>) -> rusqlite::Result<SecretHistoryRow> {
        Ok(SecretHistoryRow {
            id: row.get(0)?,
            secret_id: row.get(1)?,
            account_id: row.get(2)?,
            old_secret_value: row.get(3)?,
            new_secret_value: row.get(4)?,
            changed_at: row.get(5)?,
        })
    }

    fn build_secret(row: SecretRow) -> Result<Secret, VaultError> {
        Ok(Secret {
            id: parse_uuid(&row.id)?,
            account_id: parse_uuid(&row.account_id)?,
            secret_type: SecretType::from_str(&row.secret_type)?,
            label: row.label,
            secret_value: row.secret_value,
            is_primary: row.is_primary != 0,
            created_at: parse_timestamp(&row.created_at)?,
            updated_at: parse_timestamp(&row.updated_at)?,
            deleted_at: parse_optional_timestamp(row.deleted_at)?,
        })
    }

    fn build_secret_metadata(row: SecretMetadataRow) -> Result<SecretMetadataRecord, VaultError> {
        Ok(SecretMetadataRecord {
            id: parse_uuid(&row.id)?,
            account_id: parse_uuid(&row.account_id)?,
            secret_type: SecretType::from_str(&row.secret_type)?,
            label: row.label,
            is_primary: row.is_primary != 0,
            created_at: parse_timestamp(&row.created_at)?,
            updated_at: parse_timestamp(&row.updated_at)?,
        })
    }

    fn build_history(row: SecretHistoryRow) -> Result<SecretHistory, VaultError> {
        Ok(SecretHistory {
            id: parse_uuid(&row.id)?,
            secret_id: parse_uuid(&row.secret_id)?,
            account_id: parse_uuid(&row.account_id)?,
            old_secret_value: row.old_secret_value,
            new_secret_value: row.new_secret_value,
            changed_at: parse_timestamp(&row.changed_at)?,
        })
    }
}
