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
        {isLoading ? <p className="muted-state">Loading history...</p> : (
          <div style={{ maxHeight: "300px", overflowY: "auto", padding: "12px", background: "var(--surface-subtle)", borderRadius: "18px", marginBottom: "16px" }}>
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
        )}

        {otherSecrets && otherSecrets.length > 0 && onDelete && onEdit && onHistory && (
          <div style={{ marginTop: "16px" }}>
            <div className="metadata-list">
              {otherSecrets.map((s) => (
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
          </div>
        )}

      </div>
    </div>
  );
}
