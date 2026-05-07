import type { AccountDetails, AccountValueDto } from "../types";

type DeleteValueConfirmDialogProps = {
  account: AccountDetails;
  value: AccountValueDto | null;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function DeleteValueConfirmDialog({
  account,
  value,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteValueConfirmDialogProps) {
  if (!isOpen || !value) {
    return null;
  }

  const accountLabel = account.name?.trim() || account.platform.name;

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        aria-modal="true"
        className="dialog-card"
        role="dialog"
        style={{
          background: "var(--surface-danger-dialog)",
          boxShadow: "var(--shadow-dialog-danger)",
          border: "1px solid var(--dialog-danger-border)",
          borderRadius: "24px",
        }}
      >
        <div className="dialog-header">
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={{ color: "var(--color-danger-strong)", margin: 0 }}>Delete Value</h3>
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
              Are you sure you want to delete the value <strong>"{value.label}"</strong> from <strong>"{accountLabel}"</strong>?
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
            {isDeleting ? "Deleting..." : "Yes, delete value"}
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
    </div>
  );
}
