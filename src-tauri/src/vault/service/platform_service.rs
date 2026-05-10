use crate::app_state::AppState;
use crate::vault::dto::platform_dto::PlatformDto;
use crate::vault::error::VaultError;
use crate::vault::repository::platform_repository::PlatformRepository;
use crate::vault::{normalize_platform_name, now_utc};
use uuid::Uuid;

pub struct PlatformService;

impl PlatformService {
    pub fn create_platform(&self, state: &AppState, name: &str) -> Result<PlatformDto, VaultError> {
        let normalized_name = normalize_platform_name(name);
        if normalized_name.is_empty() {
            return Err(VaultError::Validation(
                "platform name cannot be empty".to_string(),
            ));
        }

        let display_name = name.split_whitespace().collect::<Vec<_>>().join(" ");
        state.with_connection(|connection| {
            if PlatformRepository::normalized_name_exists(connection, &normalized_name)? {
                return Err(VaultError::Conflict(format!(
                    "platform already exists: {display_name}"
                )));
            }

            let platform = PlatformRepository::create(
                connection,
                &display_name,
                &normalized_name,
                &now_utc(),
            )?;

            Ok(Self::to_dto(platform))
        })
    }

    pub fn list_platforms(&self, state: &AppState) -> Result<Vec<PlatformDto>, VaultError> {
        state.with_connection(|connection| {
            PlatformRepository::list(connection)
                .map(|platforms| platforms.into_iter().map(Self::to_dto).collect())
        })
    }

    pub fn update_platform(&self, state: &AppState, id: Uuid, name: &str) -> Result<PlatformDto, VaultError> {
        let normalized_name = normalize_platform_name(name);
        if normalized_name.is_empty() {
            return Err(VaultError::Validation(
                "platform name cannot be empty".to_string(),
            ));
        }

        let display_name = name.split_whitespace().collect::<Vec<_>>().join(" ");
        state.with_connection(|connection| {
            let existing = PlatformRepository::find_by_id(connection, id)?;
            let existing = existing.ok_or_else(|| VaultError::NotFound(format!("platform not found: {id}")))?;

            if existing.normalized_name != normalized_name {
                if PlatformRepository::normalized_name_exists(connection, &normalized_name)? {
                    return Err(VaultError::Conflict(format!(
                        "platform already exists: {display_name}"
                    )));
                }
            }

            PlatformRepository::update(connection, id, &display_name, &normalized_name)?;
            
            let updated = PlatformRepository::find_by_id(connection, id)?
                .ok_or_else(|| VaultError::NotFound(format!("platform not found after update: {id}")))?;

            Ok(Self::to_dto(updated))
        })
    }

    pub fn delete_platform(&self, state: &AppState, id: Uuid) -> Result<(), VaultError> {
        state.with_connection(|connection| {
            if PlatformRepository::has_accounts(connection, id)? {
                return Err(VaultError::Conflict(
                    "cannot delete platform because it has associated accounts".to_string(),
                ));
            }

            PlatformRepository::delete(connection, id)?;
            Ok(())
        })
    }

    fn to_dto(platform: crate::vault::domain::Platform) -> PlatformDto {
        PlatformDto {
            id: platform.id,
            name: platform.name,
            normalized_name: platform.normalized_name,
            created_at: platform.created_at,
        }
    }
}
