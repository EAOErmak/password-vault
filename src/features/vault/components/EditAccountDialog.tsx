import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { AccountDetails, PlatformDto, UpdateAccountRequest } from "../types";
import { DialogBackdrop } from "./DialogBackdrop";
import { PlatformSelect } from "./PlatformSelect";

type EditAccountDialogProps = {
  account: AccountDetails | null;
  errorMessage: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (request: UpdateAccountRequest) => Promise<void>;
  platforms: PlatformDto[];
};

export function EditAccountDialog({
  account,
  errorMessage,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
  platforms,
}: EditAccountDialogProps) {
  const [platformId, setPlatformId] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen || !account) {
      return;
    }

    setPlatformId(account.platform.id);
    setName(account.name ?? "");
    setNotes(account.notes ?? "");
  }, [account, isOpen]);

  if (!isOpen || !account) {
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

  return (
    <DialogBackdrop onClose={onClose}>
      <div aria-modal="true" className="dialog-card edit-account-dialog" role="dialog">
        <form className="vault-form" onSubmit={handleSubmit}>
          <div className="field">
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span className="summary-label">Platform</span>
              <button
                className="button-ghost button-small"
                onClick={onClose}
                style={{ padding: "4px 8px", margin: "-8px -8px -8px 0" }}
                type="button"
              >
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
              {isSubmitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </DialogBackdrop>
  );
}
