import type { PlatformDto } from "../types";

type PlatformSidebarProps = {
  errorMessage: string | null;
  isLoading: boolean;
  onOpenCreatePlatform: () => void;
  onSelectPlatform: (platformId: string | null) => void;
  platforms: PlatformDto[];
  selectedPlatformId: string | null;
};

export function PlatformSidebar({
  errorMessage,
  isLoading,
  onOpenCreatePlatform,
  onSelectPlatform,
  platforms,
  selectedPlatformId,
}: PlatformSidebarProps) {
  return (
    <section className="vault-card panel-card">
      <div className="panel-header">
        <div>
          <h2>Platforms</h2>
          <p>Filter the account list by platform.</p>
        </div>
        <button className="button-secondary" onClick={onOpenCreatePlatform} type="button">
          Add
        </button>
      </div>

      <div className="platform-sidebar">
        <button
          className={
            selectedPlatformId === null
              ? "list-button list-button--selected"
              : "list-button"
          }
          onClick={() => onSelectPlatform(null)}
          type="button"
        >
          <span>All platforms</span>
          <small>{platforms.length}</small>
        </button>

        {isLoading && platforms.length === 0 ? (
          <p className="muted-state">Loading platforms...</p>
        ) : null}

        {!isLoading && platforms.length === 0 ? (
          <div className="empty-state">
            <p>No platforms yet.</p>
            <button className="button-primary" onClick={onOpenCreatePlatform} type="button">
              Create platform
            </button>
          </div>
        ) : null}

        {platforms.map((platform) => (
          <button
            className={
              selectedPlatformId === platform.id
                ? "list-button list-button--selected"
                : "list-button"
            }
            key={platform.id}
            onClick={() => onSelectPlatform(platform.id)}
            type="button"
          >
            <span>{platform.name}</span>
            <small>{platform.normalized_name}</small>
          </button>
        ))}

        {errorMessage && platforms.length > 0 ? (
          <p className="inline-error">{errorMessage}</p>
        ) : null}
      </div>
    </section>
  );
}
