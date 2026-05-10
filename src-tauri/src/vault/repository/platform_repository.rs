use rusqlite::{params, OptionalExtension, Row};
use uuid::Uuid;

use crate::vault::domain::Platform;
use crate::vault::error::VaultError;
use crate::vault::repository::SqlExecutor;
use crate::vault::{parse_timestamp, parse_uuid, to_timestamp};

pub struct PlatformRepository;

struct PlatformRow {
    id: String,
    name: String,
    normalized_name: String,
    created_at: String,
}

impl PlatformRepository {
    pub fn create(
        executor: &impl SqlExecutor,
        name: &str,
        normalized_name: &str,
        created_at: &chrono::DateTime<chrono::Utc>,
    ) -> Result<Platform, VaultError> {
        let id = Uuid::new_v4();
        executor.connection().execute(
            "INSERT INTO platforms (id, name, normalized_name, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![
                id.to_string(),
                name,
                normalized_name,
                to_timestamp(created_at)
            ],
        )?;

        Ok(Platform {
            id,
            name: name.to_string(),
            normalized_name: normalized_name.to_string(),
            created_at: created_at.clone(),
        })
    }

    pub fn list(executor: &impl SqlExecutor) -> Result<Vec<Platform>, VaultError> {
        let mut statement = executor.connection().prepare(
            "SELECT id, name, normalized_name, created_at
             FROM platforms
             ORDER BY name COLLATE NOCASE ASC",
        )?;

        let rows = statement
            .query_map([], Self::map_row)?
            .collect::<Result<Vec<_>, _>>()?;

        rows.into_iter().map(Self::build_platform).collect()
    }

    pub fn find_by_id(
        executor: &impl SqlExecutor,
        platform_id: Uuid,
    ) -> Result<Option<Platform>, VaultError> {
        let row = executor
            .connection()
            .query_row(
                "SELECT id, name, normalized_name, created_at
                 FROM platforms
                 WHERE id = ?1",
                params![platform_id.to_string()],
                Self::map_row,
            )
            .optional()?;

        row.map(Self::build_platform).transpose()
    }

    pub fn normalized_name_exists(
        executor: &impl SqlExecutor,
        normalized_name: &str,
    ) -> Result<bool, VaultError> {
        let count: i64 = executor.connection().query_row(
            "SELECT COUNT(1) FROM platforms WHERE normalized_name = ?1",
            params![normalized_name],
            |row| row.get(0),
        )?;

        Ok(count > 0)
    }

    pub fn find_by_normalized_name(
        executor: &impl SqlExecutor,
        normalized_name: &str,
    ) -> Result<Option<Platform>, VaultError> {
        let row = executor
            .connection()
            .query_row(
                "SELECT id, name, normalized_name, created_at
                 FROM platforms
                 WHERE normalized_name = ?1",
                params![normalized_name],
                Self::map_row,
            )
            .optional()?;

        row.map(Self::build_platform).transpose()
    }

    pub fn update(
        executor: &impl SqlExecutor,
        id: Uuid,
        name: &str,
        normalized_name: &str,
    ) -> Result<(), VaultError> {
        executor.connection().execute(
            "UPDATE platforms SET name = ?1, normalized_name = ?2 WHERE id = ?3",
            params![name, normalized_name, id.to_string()],
        )?;
        Ok(())
    }

    pub fn delete(executor: &impl SqlExecutor, id: Uuid) -> Result<(), VaultError> {
        executor.connection().execute(
            "DELETE FROM platforms WHERE id = ?1",
            params![id.to_string()],
        )?;
        Ok(())
    }

    pub fn has_accounts(executor: &impl SqlExecutor, id: Uuid) -> Result<bool, VaultError> {
        let count: i64 = executor.connection().query_row(
            "SELECT COUNT(1) FROM accounts WHERE platform_id = ?1",
            params![id.to_string()],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    fn map_row(row: &Row<'_>) -> rusqlite::Result<PlatformRow> {
        Ok(PlatformRow {
            id: row.get(0)?,
            name: row.get(1)?,
            normalized_name: row.get(2)?,
            created_at: row.get(3)?,
        })
    }

    fn build_platform(row: PlatformRow) -> Result<Platform, VaultError> {
        Ok(Platform {
            id: parse_uuid(&row.id)?,
            name: row.name,
            normalized_name: row.normalized_name,
            created_at: parse_timestamp(&row.created_at)?,
        })
    }
}
