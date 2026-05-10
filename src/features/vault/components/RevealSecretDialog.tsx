import type { RevealedSecretDto } from "../types";
import { formatEnumLabel } from "../utils/formatters";
import { DialogBackdrop } from "./DialogBackdrop";

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
    <DialogBackdrop onClose={onClose}>
      <div aria-modal="true" className="dialog-card" role="dialog">
        <div className="dialog-header">
        </div>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
        {isLoading ? <p className="muted-state">Revealing secret...</p> : null}

        {!isLoading && secret ? (
          <div className="revealed-secret">
            <div className="metadata-item__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="value-row__title" style={{ flexGrow: 1 }}>
                <strong>{formatEnumLabel(secret.secret_type)}</strong>
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


      </div>
    </DialogBackdrop>
  );
}
