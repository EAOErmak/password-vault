import type { AccountValueDto, AccountValueHistoryDto } from "../types";
import { formatDateTime, formatEnumLabel } from "../utils/formatters";
import { HistoryTimeline } from "./HistoryTimeline";
import { AccountValueRow } from "./AccountValueRow";

type ValueHistoryDialogProps = {
  errorMessage: string | null;
  history: AccountValueHistoryDto[];
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  value: AccountValueDto | null;
  otherValues?: AccountValueDto[];
  onDelete?: (value: AccountValueDto) => void;
  onEdit?: (value: AccountValueDto) => void;
  onHistory?: (value: AccountValueDto) => void;
};

export function ValueHistoryDialog({
  errorMessage,
  history,
  isLoading,
  isOpen,
  onClose,
  value,
  otherValues,
  onDelete,
  onEdit,
  onHistory,
}: ValueHistoryDialogProps) {
  if (!isOpen || !value) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        aria-modal="true"
        className="dialog-card dialog-card--wide"
        role="dialog"
        style={{
          background: "var(--dialog-tonal-bg)",
          boxShadow: "var(--shadow-dialog-tonal)",
          border: "1px solid var(--dialog-tonal-border)",
          borderRadius: "24px",
        }}
      >
        <div className="dialog-header">
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={{ margin: 0 }}>Value history</h3>
              <button
                className="button-ghost button-small"
                onClick={onClose}
                type="button"
                style={{ padding: "4px 8px", margin: "-8px -8px -8px 0" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
        {isLoading ? <p className="muted-state">Loading history...</p> : null}



        {otherValues && otherValues.length > 0 && onDelete && onEdit && onHistory && (
          <div style={{ marginTop: "16px" }}>
            <div className="metadata-list">
              {otherValues.map((v) => (
                <AccountValueRow
                  isBusy={isLoading}
                  key={v.id}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onHistory={onHistory}
                  value={v}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
