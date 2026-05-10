use chrono::{DateTime, Utc};
use rusqlite::{params, OptionalExtension, Row};
use uuid::Uuid;

use crate::vault::domain::{AccountValue, AccountValueHistory, AccountValueType};
use crate::vault::error::VaultError;
use crate::vault::repository::SqlExecutor;
use crate::vault::{parse_optional_timestamp, parse_timestamp, parse_uuid, to_timestamp};

pub struct ValueRepository;

struct AccountValueRow {
    id: String,
    account_id: String,
    value_type: String,
    value: String,
    is_primary: i64,
    created_at: String,
    updated_at: String,
    deleted_at: Option<String>,
}

struct AccountValueHistoryRow {
    id: String,
    account_value_id: String,
    account_id: String,
    old_value: String,
    new_value: String,
    changed_at: String,
}

impl ValueRepository {
    pub fn create(
        executor: &impl SqlExecutor,
        account_id: Uuid,
        value_type: &AccountValueType,
        value: &str,
        is_primary: bool,
        now: &DateTime<Utc>,
    ) -> Result<AccountValue, VaultError> {
        let id = Uuid::new_v4();
        let timestamp = to_timestamp(now);

        executor.connection().execute(
            "INSERT INTO account_values
                 (id, account_id, value_type, value, is_primary, created_at, updated_at, deleted_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL)",
            params![
                id.to_string(),
                account_id.to_string(),
                value_type.as_str(),
                value,
                if is_primary { 1 } else { 0 },
                &timestamp,
                &timestamp
            ],
        )?;

        Ok(AccountValue {
            id,
            account_id,
            value_type: value_type.clone(),
            value: value.to_string(),
            is_primary,
            created_at: now.clone(),
            updated_at: now.clone(),
            deleted_at: None,
        })
    }

    pub fn list_by_account(
        executor: &impl SqlExecutor,
        account_id: Uuid,
    ) -> Result<Vec<AccountValue>, VaultError> {
        let mut statement = executor.connection().prepare(
            "SELECT av.id, av.account_id, av.value_type, av.value, av.is_primary, av.created_at, av.updated_at, av.deleted_at
             FROM account_values av
             INNER JOIN accounts a ON a.id = av.account_id
             WHERE av.account_id = ?1
               AND av.deleted_at IS NULL
               AND a.deleted_at IS NULL
             ORDER BY av.is_primary DESC, av.created_at ASC",
        )?;

        let rows = statement
            .query_map(params![account_id.to_string()], Self::map_row)?
            .collect::<Result<Vec<_>, _>>()?;

        rows.into_iter().map(Self::build_account_value).collect()
    }

    pub fn find_by_type(
        executor: &impl SqlExecutor,
        account_id: Uuid,
        value_type: &AccountValueType,
    ) -> Result<Option<AccountValue>, VaultError> {
        let row = executor
            .connection()
            .query_row(
                "SELECT id, account_id, value_type, value, is_primary, created_at, updated_at, deleted_at
                 FROM account_values
                 WHERE account_id = ?1 AND value_type = ?2 AND deleted_at IS NULL",
                params![account_id.to_string(), value_type.as_str()],
                Self::map_row,
            )
            .optional()?;

        row.map(Self::build_account_value).transpose()
    }

    pub fn find_active_by_id(
        executor: &impl SqlExecutor,
        value_id: Uuid,
    ) -> Result<Option<AccountValue>, VaultError> {
        let row = executor
            .connection()
            .query_row(
                "SELECT av.id, av.account_id, av.value_type, av.value, av.is_primary, av.created_at, av.updated_at, av.deleted_at
                 FROM account_values av
                 INNER JOIN accounts a ON a.id = av.account_id
                 WHERE av.id = ?1
                   AND av.deleted_at IS NULL
                   AND a.deleted_at IS NULL",
                params![value_id.to_string()],
                Self::map_row,
            )
            .optional()?;

        row.map(Self::build_account_value).transpose()
    }

    pub fn update(
        executor: &impl SqlExecutor,
        value_id: Uuid,
        value_type: &AccountValueType,
        value: &str,
        is_primary: bool,
        now: &DateTime<Utc>,
    ) -> Result<bool, VaultError> {
        let affected_rows = executor.connection().execute(
            "UPDATE account_values
             SET value_type = ?1,
                 value = ?2,
                 is_primary = ?3,
                 updated_at = ?4
             WHERE id = ?5
               AND deleted_at IS NULL
               AND EXISTS (
                   SELECT 1
                   FROM accounts a
                   WHERE a.id = account_values.account_id
                     AND a.deleted_at IS NULL
               )",
            params![
                value_type.as_str(),
                value,
                if is_primary { 1 } else { 0 },
                to_timestamp(now),
                value_id.to_string()
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
            "UPDATE account_values
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
        value_id: Uuid,
        now: &DateTime<Utc>,
    ) -> Result<bool, VaultError> {
        let timestamp = to_timestamp(now);
        let affected_rows = executor.connection().execute(
            "UPDATE account_values
             SET deleted_at = ?1,
                 updated_at = ?2
             WHERE id = ?3
               AND deleted_at IS NULL
               AND EXISTS (
                   SELECT 1
                   FROM accounts a
                   WHERE a.id = account_values.account_id
                     AND a.deleted_at IS NULL
               )",
            params![&timestamp, &timestamp, value_id.to_string()],
        )?;

        Ok(affected_rows > 0)
    }

    pub fn insert_history(
        executor: &impl SqlExecutor,
        history: &AccountValueHistory,
    ) -> Result<(), VaultError> {
        executor.connection().execute(
            "INSERT INTO account_value_history
                 (id, account_value_id, account_id, old_value, new_value, changed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                history.id.to_string(),
                history.account_value_id.to_string(),
                history.account_id.to_string(),
                &history.old_value,
                &history.new_value,
                to_timestamp(&history.changed_at)
            ],
        )?;

        Ok(())
    }

    pub fn list_history_by_value(
        executor: &impl SqlExecutor,
        value_id: Uuid,
    ) -> Result<Vec<AccountValueHistory>, VaultError> {
        let mut statement = executor.connection().prepare(
            "SELECT id, account_value_id, account_id, old_value, new_value, changed_at
             FROM account_value_history
             WHERE account_value_id = ?1
             ORDER BY changed_at DESC",
        )?;

        let rows = statement
            .query_map(params![value_id.to_string()], Self::map_history_row)?
            .collect::<Result<Vec<_>, _>>()?;

        rows.into_iter().map(Self::build_history).collect()
    }

    fn map_row(row: &Row<'_>) -> rusqlite::Result<AccountValueRow> {
        Ok(AccountValueRow {
            id: row.get(0)?,
            account_id: row.get(1)?,
            value_type: row.get(2)?,
            value: row.get(3)?,
            is_primary: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
            deleted_at: row.get(7)?,
        })
    }

    fn map_history_row(row: &Row<'_>) -> rusqlite::Result<AccountValueHistoryRow> {
        Ok(AccountValueHistoryRow {
            id: row.get(0)?,
            account_value_id: row.get(1)?,
            account_id: row.get(2)?,
            old_value: row.get(3)?,
            new_value: row.get(4)?,
            changed_at: row.get(5)?,
        })
    }

    fn build_account_value(row: AccountValueRow) -> Result<AccountValue, VaultError> {
        Ok(AccountValue {
            id: parse_uuid(&row.id)?,
            account_id: parse_uuid(&row.account_id)?,
            value_type: AccountValueType::from_str(&row.value_type)?,
            value: row.value,
            is_primary: row.is_primary != 0,
            created_at: parse_timestamp(&row.created_at)?,
            updated_at: parse_timestamp(&row.updated_at)?,
            deleted_at: parse_optional_timestamp(row.deleted_at)?,
        })
    }

    fn build_history(row: AccountValueHistoryRow) -> Result<AccountValueHistory, VaultError> {
        Ok(AccountValueHistory {
            id: parse_uuid(&row.id)?,
            account_value_id: parse_uuid(&row.account_value_id)?,
            account_id: parse_uuid(&row.account_id)?,
            old_value: row.old_value,
            new_value: row.new_value,
            changed_at: parse_timestamp(&row.changed_at)?,
        })
    }
}
