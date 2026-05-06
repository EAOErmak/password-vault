import { useEffect, useState, type FormEvent } from "react";
import type { CreatePlatformRequest } from "../types";

type CreatePlatformDialogProps = {
  errorMessage: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (request: CreatePlatformRequest) => Promise<void>;
};

export function CreatePlatformDialog({
  errorMessage,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: CreatePlatformDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName("");
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ name });
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <div aria-modal="true" className="dialog-card" role="dialog">


        <form className="vault-form" onSubmit={handleSubmit}>
          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="summary-label">Platform name</span>
              <button className="button-ghost button-small" onClick={onClose} type="button" style={{ padding: "4px 8px", margin: "-8px -8px -8px 0" }}>
                Close
              </button>
            </div>
            <input
              autoComplete="off"
              disabled={isSubmitting}
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="GitHub"
              type="text"
              value={name}
            />
          </div>

          {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

          <div className="actions">
            <button
              className="button-primary"
              disabled={isSubmitting || name.trim().length === 0}
              type="submit"
            >
              {isSubmitting ? "Creating..." : "Create platform"}
            </button>
            <button
              className="button-secondary"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
