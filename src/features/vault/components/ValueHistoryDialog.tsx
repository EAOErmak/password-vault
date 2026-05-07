import type { AccountValueDto, AccountValueHistoryDto } from "../types";
import { formatDateTime } from "../utils/formatters";
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
        {isLoading ? <p className="muted-state">Loading history...</p> : (
          <div style={{ maxHeight: "300px", overflowY: "auto", padding: "12px", background: "var(--surface-subtle)", borderRadius: "18px", marginBottom: "16px" }}>
            <HistoryTimeline
              columns={[
                { key: "date", label: "Date" },
                { key: "old", label: "Old Value" },
                { key: "new", label: "New Value" },
              ]}
              emptyMessage="No history records found for this value."
              rows={history.map((h) => ({
                id: h.id,
                cells: [
                  formatDateTime(h.changed_at),
                  h.old_value ? h.old_value : <span className="table-dash">-</span>,
                  h.new_value ? h.new_value : <span className="table-dash">-</span>,
                ],
              }))}
            />
          </div>
        )}



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
