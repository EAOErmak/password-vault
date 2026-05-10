import { invoke } from "@tauri-apps/api/core";
import type { CreatePlatformRequest, PlatformDto } from "../types";

function sanitizePlatform(platform: PlatformDto): PlatformDto {
  const { id, name, normalized_name, created_at } = platform;

  return {
    id,
    name,
    normalized_name,
    created_at,
  };
}

export async function listPlatforms(): Promise<PlatformDto[]> {
  const platforms = await invoke<PlatformDto[]>("list_platforms");
  return platforms.map(sanitizePlatform);
}

export async function createPlatform(
  request: CreatePlatformRequest,
): Promise<PlatformDto> {
  const platform = await invoke<PlatformDto>("create_platform", {
    name: request.name,
  });

  return sanitizePlatform(platform);
}

export async function updatePlatform(
  id: string,
  name: string,
): Promise<PlatformDto> {
  const platform = await invoke<PlatformDto>("update_platform", {
    id,
    name,
  });

  return sanitizePlatform(platform);
}

export async function deletePlatform(id: string): Promise<void> {
  await invoke<void>("delete_platform", { id });
}
