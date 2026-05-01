use chrono::{DateTime, Utc};
use rusqlite::{params, OptionalExtension, Row};
use uuid::Uuid;

use crate::vault::domain::{Account, Platform};
use crate::vault::error::VaultError;
use crate::vault::repository::SqlExecutor;
use crate::vault::{parse_optional_timestamp, parse_timestamp, parse_uuid, to_timestamp};

pub struct AccountRepository;

#[derive(Debug, Clone)]
pub struct AccountWithPlatform {
    pub account: Account,
    pub platform: Platform,
}

struct AccountWithPlatformRow {
    account_id: String,
    account_name: Option<String>,
    account_platform_id: String,
    notes: Option<String>,
    account_created_at: String,
    account_updated_at: String,
    account_deleted_at: Option<String>,
    platform_id: String,
    platform_name: String,
    platform_normalized_name: String,
    platform_created_at: String,
}

impl AccountRepository {
    pub fn create(
        executor: &impl SqlExecutor,
        name: Option<&str>,
        platform_id: Uuid,
        notes: Option<&str>,
        now: &DateTime<Utc>,
    ) -> Result<Account, VaultError> {
        let id = Uuid::new_v4();
        let timestamp = to_timestamp(now);

        executor.connection().execute(
            "INSERT INTO accounts (id, name, platform_id, notes, created_at, updated_at, deleted_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL)",
            params![
                id.to_string(),
                name,
                platform_id.to_string(),
                notes,
                &timestamp,
                &timestamp
            ],
        )?;

        Ok(Account {
            id,
            name: name.map(str::to_string),
            platform_id,
            notes: notes.map(str::to_string),
            created_at: now.clone(),
            updated_at: now.clone(),
            deleted_at: None,
        })
    }

    pub fn list_active(
        executor: &impl SqlExecutor,
        platform_id: Option<Uuid>,
        search: Option<&str>,
    ) -> Result<Vec<AccountWithPlatform>, VaultError> {
        let mut statement = executor.connection().prepare(
            "SELECT
                 a.id,
                 a.name,
                 a.platform_id,
                 a.notes,
                 a.created_at,
                 a.updated_at,
                 a.deleted_at,
                 p.id,
                 p.name,
                 p.normalized_name,
                 p.created_at
             FROM accounts a
             INNER JOIN platforms p ON p.id = a.platform_id
             WHERE a.deleted_at IS NULL
               AND (?1 IS NULL OR a.platform_id = ?1)
               AND (
                   ?2 IS NULL
                   OR LOWER(COALESCE(a.name, '')) LIKE '%' || LOWER(?2) || '%'
                   OR LOWER(COALESCE(a.notes, '')) LIKE '%' || LOWER(?2) || '%'
                   OR LOWER(p.name) LIKE '%' || LOWER(?2) || '%'
                   OR EXISTS (
                       SELECT 1
                       FROM account_values av
                       WHERE av.account_id = a.id
                         AND av.deleted_at IS NULL
                         AND LOWER(av.value) LIKE '%' || LOWER(?2) || '%'
                   )
               )
             ORDER BY a.updated_at DESC, a.created_at DESC",
        )?;

        let rows = statement
            .query_map(
                params![platform_id.map(|value| value.to_string()), search],
                Self::map_account_with_platform_row,
            )?
            .collect::<Result<Vec<_>, _>>()?;

        rows.into_iter()
            .map(Self::build_account_with_platform)
            .collect()
    }

    pub fn find_active_by_id(
        executor: &impl SqlExecutor,
        account_id: Uuid,
    ) -> Result<Option<AccountWithPlatform>, VaultError> {
        let row = executor
            .connection()
            .query_row(
                "SELECT
                     a.id,
                     a.name,
                     a.platform_id,
                     a.notes,
                     a.created_at,
                     a.updated_at,
                     a.deleted_at,
                     p.id,
                     p.name,
                     p.normalized_name,
                     p.created_at
                 FROM accounts a
                 INNER JOIN platforms p ON p.id = a.platform_id
                 WHERE a.id = ?1
                   AND a.deleted_at IS NULL",
                params![account_id.to_string()],
                Self::map_account_with_platform_row,
            )
            .optional()?;

        row.map(Self::build_account_with_platform).transpose()
    }

    pub fn exists_active(
        executor: &impl SqlExecutor,
        account_id: Uuid,
    ) -> Result<bool, VaultError> {
        let count: i64 = executor.connection().query_row(
            "SELECT COUNT(1) FROM accounts WHERE id = ?1 AND deleted_at IS NULL",
            params![account_id.to_string()],
            |row| row.get(0),
        )?;

        Ok(count > 0)
    }

    pub fn update(
        executor: &impl SqlExecutor,
        account_id: Uuid,
        name: Option<&str>,
        platform_id: Uuid,
        notes: Option<&str>,
        now: &DateTime<Utc>,
    ) -> Result<bool, VaultError> {
        let affected_rows = executor.connection().execute(
            "UPDATE accounts
             SET name = ?1,
                 platform_id = ?2,
                 notes = ?3,
                 updated_at = ?4
             WHERE id = ?5
               AND deleted_at IS NULL",
            params![
                name,
                platform_id.to_string(),
                notes,
                to_timestamp(now),
                account_id.to_string()
            ],
        )?;

        Ok(affected_rows > 0)
    }

    pub fn soft_delete(
        executor: &impl SqlExecutor,
        account_id: Uuid,
        now: &DateTime<Utc>,
    ) -> Result<bool, VaultError> {
        let timestamp = to_timestamp(now);
        let affected_rows = executor.connection().execute(
            "UPDATE accounts
             SET deleted_at = ?1,
                 updated_at = ?2
             WHERE id = ?3
               AND deleted_at IS NULL",
            params![&timestamp, &timestamp, account_id.to_string()],
        )?;

        Ok(affected_rows > 0)
    }

    fn map_account_with_platform_row(row: &Row<'_>) -> rusqlite::Result<AccountWithPlatformRow> {
        Ok(AccountWithPlatformRow {
            account_id: row.get(0)?,
            account_name: row.get(1)?,
            account_platform_id: row.get(2)?,
            notes: row.get(3)?,
            account_created_at: row.get(4)?,
            account_updated_at: row.get(5)?,
            account_deleted_at: row.get(6)?,
            platform_id: row.get(7)?,
            platform_name: row.get(8)?,
            platform_normalized_name: row.get(9)?,
            platform_created_at: row.get(10)?,
        })
    }

    fn build_account_with_platform(
        row: AccountWithPlatformRow,
    ) -> Result<AccountWithPlatform, VaultError> {
        Ok(AccountWithPlatform {
            account: Account {
                id: parse_uuid(&row.account_id)?,
                name: row.account_name,
                platform_id: parse_uuid(&row.account_platform_id)?,
                notes: row.notes,
                created_at: parse_timestamp(&row.account_created_at)?,
                updated_at: parse_timestamp(&row.account_updated_at)?,
                deleted_at: parse_optional_timestamp(row.account_deleted_at)?,
            },
            platform: Platform {
                id: parse_uuid(&row.platform_id)?,
                name: row.platform_name,
                normalized_name: row.platform_normalized_name,
                created_at: parse_timestamp(&row.platform_created_at)?,
            },
        })
    }
}
