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
      <div aria-modal="true" className="dialog-card dialog-card--wide" role="dialog">
        <div className="dialog-header">
          <div>
            <h3>Secret history</h3>
            <p>
              {secret.label} - {formatEnumLabel(secret.secret_type)}
            </p>
          </div>
          <button className="button-ghost" onClick={onClose} type="button">
            Close
          </button>
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

        <div className="actions">
          <button className="button-primary" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
