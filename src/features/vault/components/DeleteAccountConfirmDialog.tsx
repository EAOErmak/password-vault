import type { AccountDetails } from "../types";
import { DialogBackdrop } from "./DialogBackdrop";

type DeleteAccountConfirmDialogProps = {
  account: AccountDetails;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function DeleteAccountConfirmDialog({
  account,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteAccountConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  const accountLabel = account.name?.trim() || account.platform.name;

  return (
    <DialogBackdrop onClose={onClose}>
      <div
        aria-modal="true"
        className="dialog-card"
        role="dialog"
        style={{
          background: "var(--surface-danger-dialog)",
          boxShadow: "var(--shadow-dialog-danger)",
          borderRadius: "24px",
        }}
      >
        <div className="dialog-header">
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={{ color: "var(--color-danger-strong)", margin: 0 }}>Delete Account</h3>
              <button
                className="button-ghost button-small"
                onClick={onClose}
                type="button"
                style={{ padding: "4px 8px", margin: "-8px -8px -8px 0" }}
              >
                Close
              </button>
            </div>
            <p style={{ color: "var(--color-danger-muted)", fontSize: "0.95rem", margin: "16px 0" }}>
              Are you sure you want to soft-delete <strong>"{accountLabel}"</strong>?
            </p>
            <p style={{ color: "var(--color-danger-strong)", fontSize: "0.85rem", opacity: 0.8 }}>
              This will hide the account and all its values/secrets from the active vault view.
            </p>
          </div>
        </div>

        <div className="actions" style={{ marginTop: "24px" }}>
          <button
            className="button-primary"
            disabled={isDeleting}
            onClick={() => void onConfirm()}
            style={{ backgroundColor: "var(--color-danger-button)" }}
            type="button"
          >
            {isDeleting ? "Deleting..." : "Yes, delete account"}
          </button>
          <button
            className="button-secondary"
            disabled={isDeleting}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
