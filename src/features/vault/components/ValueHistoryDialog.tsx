import type { AccountValueDto, AccountValueHistoryDto } from "../types";
import { formatDateTime, formatEnumLabel } from "../utils/formatters";
import { HistoryTimeline } from "./HistoryTimeline";

type ValueHistoryDialogProps = {
  errorMessage: string | null;
  history: AccountValueHistoryDto[];
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  value: AccountValueDto | null;
};

export function ValueHistoryDialog({
  errorMessage,
  history,
  isLoading,
  isOpen,
  onClose,
  value,
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
          background: "linear-gradient(180deg, #f4f7f9 0%, #eef3f6 100%)",
          boxShadow: "0 20px 40px rgba(25, 33, 38, 0.12)",
          border: "1px solid rgba(25, 33, 38, 0.08)",
          borderRadius: "24px"
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
            <p>
              {value.label} - {formatEnumLabel(value.value_type)}
            </p>
          </div>
        </div>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
        {isLoading ? <p className="muted-state">Loading history...</p> : null}

        {!isLoading ? (
          <HistoryTimeline
            columns={[
              { key: "changedAt", label: "Changed" },
              { key: "oldValue", label: "Old value" },
              { key: "newValue", label: "New value" },
            ]}
            emptyMessage="No history yet."
            rows={history.map((entry) => ({
              id: entry.id,
              cells: [
                formatDateTime(entry.changed_at),
                <span className="history-table__value" key={`${entry.id}:old`}>
                  {entry.old_value}
                </span>,
                <span className="history-table__value" key={`${entry.id}:new`}>
                  {entry.new_value}
                </span>,
              ],
            }))}
          />
        ) : null}

      </div>
    </div>
  );
}
