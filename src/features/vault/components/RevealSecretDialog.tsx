import type { RevealedSecretDto } from "../types";
import { formatEnumLabel } from "../utils/formatters";

type RevealSecretDialogProps = {
  errorMessage: string | null;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  secret: RevealedSecretDto | null;
};

export function RevealSecretDialog({
  errorMessage,
  isLoading,
  isOpen,
  onClose,
  secret,
}: RevealSecretDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div aria-modal="true" className="dialog-card" role="dialog">
        <div className="dialog-header">
          <div>
            <h3>Reveal secret</h3>
            <p>Close this dialog to remove the revealed value from React state.</p>
          </div>
        </div>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
        {isLoading ? <p className="muted-state">Revealing secret...</p> : null}

        {!isLoading && secret ? (
          <div className="revealed-secret">
            <div className="metadata-item__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="value-row__title" style={{ flexGrow: 1 }}>
                <strong>{secret.label}</strong>
                <span className="value-row__type">{formatEnumLabel(secret.secret_type)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {secret.is_primary ? <span className="pill">Primary</span> : null}
                <button className="button-ghost button-small" onClick={onClose} type="button" style={{ padding: "4px 8px", margin: "-4px -8px -4px 0" }}>
                  Hide
                </button>
              </div>
            </div>

            <pre className="revealed-secret__value">{secret.secret_value}</pre>
          </div>
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
