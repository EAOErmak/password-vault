import { useEffect, useState, type FormEvent } from "react";
import type { CreateAccountRequest, PlatformDto } from "../types";

type CreateAccountDialogProps = {
  errorMessage: string | null;
  initialPlatformId: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onOpenCreatePlatform: () => void;
  onSubmit: (request: CreateAccountRequest) => Promise<void>;
  platforms: PlatformDto[];
};

export function CreateAccountDialog({
  errorMessage,
  initialPlatformId,
  isOpen,
  isSubmitting,
  onClose,
  onOpenCreatePlatform,
  onSubmit,
  platforms,
}: CreateAccountDialogProps) {
  const [platformId, setPlatformId] = useState(initialPlatformId ?? "");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setPlatformId(initialPlatformId ?? platforms[0]?.id ?? "");
    setName("");
    setNotes("");
  }, [initialPlatformId, isOpen, platforms]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      name: name.trim() || null,
      platform_id: platformId,
      notes: notes.trim() || null,
    });
  };

  const hasPlatforms = platforms.length > 0;

  return (
    <div className="dialog-backdrop" role="presentation">
      <div aria-modal="true" className="dialog-card" role="dialog">
        <div className="dialog-header dialog-header--actions-only">
          <button className="button-ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {!hasPlatforms ? (
          <div className="empty-state">
            <p>Create a platform before adding an account.</p>
            <div className="actions">
              <button className="button-primary" onClick={onOpenCreatePlatform} type="button">
                Create platform
              </button>
              <button className="button-secondary" onClick={onClose} type="button">
                Close
              </button>
            </div>
          </div>
        ) : (
          <form className="vault-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Platform</span>
              <select
                className="select-input"
                disabled={isSubmitting}
                onChange={(event) => setPlatformId(event.currentTarget.value)}
                value={platformId}
              >
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Account name</span>
              <input
                autoComplete="off"
                disabled={isSubmitting}
                onChange={(event) => setName(event.currentTarget.value)}
                placeholder="Optional display name"
                type="text"
                value={name}
              />
            </label>

            <label className="field">
              <span>Notes</span>
              <textarea
                disabled={isSubmitting}
                onChange={(event) => setNotes(event.currentTarget.value)}
                placeholder="Optional notes"
                rows={4}
                value={notes}
              />
            </label>

            {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

            <div className="actions">
              <button
                className="button-primary"
                disabled={isSubmitting || platformId.length === 0}
                type="submit"
              >
                {isSubmitting ? "Creating..." : "Create account"}
              </button>
              <button
                className="button-secondary"
                disabled={isSubmitting}
                onClick={onOpenCreatePlatform}
                type="button"
              >
                New platform
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
