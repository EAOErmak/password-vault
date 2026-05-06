import type { SecretHistoryDto, SecretMetadataDto } from "../types";
import { formatDateTime, formatEnumLabel } from "../utils/formatters";
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
  onCopy?: (secret: SecretMetadataDto) => Promise<void>;
  onDelete?: (secret: SecretMetadataDto) => void;
  onEdit?: (secret: SecretMetadataDto) => void;
  onHistory?: (secret: SecretMetadataDto) => Promise<void>;
  onReveal?: (secret: SecretMetadataDto) => Promise<void>;
  copiedSecretId?: string | null;
  isCopyingSecretId?: string | null;
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
  otherSecrets,
  onCopy,
  onDelete,
  onEdit,
  onHistory,
  onReveal,
  copiedSecretId,
  isCopyingSecretId,
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
          </div>
        </div>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
        {isLoading ? <p className="muted-state">Loading history...</p> : null}

        {otherSecrets && otherSecrets.length > 0 && onCopy && onDelete && onEdit && onHistory && onReveal && (
          <div style={{ marginTop: "16px" }}>
            <div className="metadata-list">
              {otherSecrets.map((s) => (
                <SecretRow
                  copied={copiedSecretId === s.id}
                  isBusy={isLoading}
                  isCopying={isCopyingSecretId === s.id}
                  key={s.id}
                  onCopy={onCopy}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onHistory={onHistory}
                  onReveal={onReveal}
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
