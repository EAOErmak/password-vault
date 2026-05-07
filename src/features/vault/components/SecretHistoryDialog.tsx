import type { SecretHistoryDto, SecretMetadataDto } from "../types";
import { formatDateTime } from "../utils/formatters";
import { HistoryTimeline } from "./HistoryTimeline";
import { SecretRow } from "./SecretRow";

type SecretHistoryDialogProps = {
  errorMessage: string | null;
  history: SecretHistoryDto[];
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  secret: SecretMetadataDto | null;
  otherSecrets?: SecretMetadataDto[];
  onDelete?: (secret: SecretMetadataDto) => void;
  onEdit?: (secret: SecretMetadataDto) => void;
  onHistory?: (secret: SecretMetadataDto) => Promise<void>;
};



export function SecretHistoryDialog({
  errorMessage,
  history,
  isLoading,
  isOpen,
  onClose,
  secret,
  otherSecrets,
  onDelete,
  onEdit,
  onHistory,
}: SecretHistoryDialogProps) {
  if (!isOpen || !secret) {
    return null;
  }

  const hasHistory = history.length > 0;
  const hasOtherSecrets = Boolean(otherSecrets && otherSecrets.length > 0 && onDelete && onEdit && onHistory);

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
              <h3 style={{ margin: 0 }}>Secret history</h3>
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

        {!isLoading && hasHistory ? (
          <section className="history-dialog-section">
            <div className="history-dialog-section__header">
              <h4>Change history</h4>
            </div>
            <div className="history-dialog-panel">
              <HistoryTimeline
                columns={[
                  { key: "date", label: "Date" },
                  { key: "old", label: "Old Value" },
                  { key: "new", label: "New Value" },
                ]}
                emptyMessage="No history records found for this secret."
                rows={history.map((h) => ({
                  id: h.id,
                  cells: [
                    formatDateTime(h.changed_at),
                    h.has_old_value ? "********" : <span className="table-dash">-</span>,
                    h.has_new_value ? "********" : <span className="table-dash">-</span>,
                  ],
                }))}
              />
            </div>
          </section>
        ) : null}

        {!isLoading && !hasHistory && !hasOtherSecrets ? (
          <div className="history-dialog-panel">
            <div className="empty-state empty-state--compact">
              <p>No history records found for this secret.</p>
            </div>
          </div>
        ) : null}

        {hasOtherSecrets ? (
          <section className="history-dialog-section">
            <div className="history-dialog-section__header">
              <h4>Other secrets</h4>
            </div>
            <div className="metadata-list">
              {otherSecrets!.map((s) => (
                <SecretRow
                  isBusy={isLoading}
                  key={s.id}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onHistory={onHistory}
                  secret={s}
                />
              ))}
            </div>
          </section>
        ) : null}

      </div>
    </div>
  );
}
