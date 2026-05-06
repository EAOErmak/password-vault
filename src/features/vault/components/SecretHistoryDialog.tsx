import type { SecretHistoryDto, SecretMetadataDto } from "../types";
import { formatDateTime, formatEnumLabel } from "../utils/formatters";
import { HistoryTimeline } from "./HistoryTimeline";

type SecretHistoryDialogProps = {
  errorMessage: string | null;
  history: SecretHistoryDto[];
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  secret: SecretMetadataDto | null;
};

function renderMaskedValue(hasValue: boolean): string {
  return hasValue ? "********" : "--";
}

export function SecretHistoryDialog({
  errorMessage,
  history,
  isLoading,
  isOpen,
  onClose,
  secret,
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
          background: "linear-gradient(180deg, #f4f7f9 0%, #eef3f6 100%)",
          boxShadow: "0 20px 40px rgba(25, 33, 38, 0.12)",
          border: "1px solid rgba(25, 33, 38, 0.08)",
          borderRadius: "24px"
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
            <p>
              {secret.label} - {formatEnumLabel(secret.secret_type)}
            </p>
          </div>
        </div>

        <p className="field-helper">Historical secret values remain hidden by default.</p>
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
                <span className="secret-row__masked" key={`${entry.id}:old`}>
                  {renderMaskedValue(entry.has_old_value)}
                </span>,
                <span className="secret-row__masked" key={`${entry.id}:new`}>
                  {renderMaskedValue(entry.has_new_value)}
                </span>,
              ],
            }))}
          />
        ) : null}

      </div>
    </div>
  );
}
