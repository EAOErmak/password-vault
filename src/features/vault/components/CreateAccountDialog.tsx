import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { CreateAccountRequest, PlatformDto } from "../types";
import { DialogBackdrop } from "./DialogBackdrop";
import { PlatformSelect } from "./PlatformSelect";

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
    <DialogBackdrop onClose={onClose}>
      <div aria-modal="true" className="dialog-card create-account-dialog" role="dialog">
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
            <div className="field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="summary-label">Platform</span>
                <button className="button-ghost button-small" onClick={onClose} type="button" style={{ padding: "4px 8px", margin: "-8px -8px -8px 0" }}>
                  <X />
                </button>
              </div>
              <PlatformSelect
                disabled={isSubmitting}
                onChange={setPlatformId}
                platforms={platforms}
                value={platformId}
              />
            </div>

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
    </DialogBackdrop>
  );
}
