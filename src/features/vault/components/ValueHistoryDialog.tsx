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
      <div aria-modal="true" className="dialog-card dialog-card--wide" role="dialog">
        <div className="dialog-header">
          <div>
            <h3>Value history</h3>
            <p>
              {value.label} - {formatEnumLabel(value.value_type)}
            </p>
          </div>
          <button className="button-ghost" onClick={onClose} type="button">
            Close
          </button>
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

        <div className="actions">
          <button className="button-primary" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
