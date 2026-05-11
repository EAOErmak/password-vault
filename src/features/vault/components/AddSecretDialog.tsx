import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { AddSecretRequest, SecretType } from "../types";
import {
  usesMultilineSecretValue,
} from "../utils/secretHelpers";
import { PasswordGeneratorControls } from "./PasswordGeneratorControls";
import { DialogBackdrop } from "./DialogBackdrop";
import { SecretTypeSelect } from "./SecretTypeSelect";

type AddSecretDialogProps = {
  errorMessage: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (request: AddSecretRequest) => Promise<void>;
  defaultIsPrimary?: boolean;
};

export function AddSecretDialog({
  errorMessage,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
  defaultIsPrimary = false,
}: AddSecretDialogProps) {
  const [secretType, setSecretType] = useState<SecretType>("PASSWORD");
  const [secretValue, setSecretValue] = useState("");
  const [isPrimary, setIsPrimary] = useState(defaultIsPrimary);
  const [isMounting, setIsMounting] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSecretType("PASSWORD");
      setSecretValue("");
      setIsMounting(false);
      return;
    }

    setSecretValue("");
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const multiline = usesMultilineSecretValue(secretType);
  const isSubmitDisabled = isSubmitting || secretValue.length === 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      secret_type: secretType,
      secret_value: secretValue,
      is_primary: isPrimary,
    });
  };

  return (
    <DialogBackdrop onClose={onClose}>
      <div aria-modal="true" className="dialog-card add-secret-dialog" role="dialog">
        <form className="vault-form" onSubmit={handleSubmit}>
          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="summary-label">Type</span>
              <button className="button-ghost button-small" onClick={onClose} type="button" style={{ padding: "4px 8px", margin: "-8px -8px -8px 0" }}>
                <X />
              </button>
            </div>
            <SecretTypeSelect
              disabled={isSubmitting}
              onChange={setSecretType}
              value={secretType}
            />
          </div>

           <label className="field">
            <span>Secret value</span>
            {multiline ? (
              <textarea
                disabled={isSubmitting}
                onChange={(event) => setSecretValue(event.currentTarget.value)}
                placeholder="Enter secret data"
                rows={6}
                value={secretValue}
              />
            ) : (
              <input
                autoComplete="off"
                disabled={isSubmitting}
                onChange={(event) => setSecretValue(event.currentTarget.value)}
                placeholder="Enter secret data"
                spellCheck={false}
                type="text"
                value={secretValue}
              />
            )}
          </label>

          {secretType === "PASSWORD" ? (
            <PasswordGeneratorControls
              disabled={isSubmitting}
              onChangeValue={setSecretValue}
              value={secretValue}
            />
          ) : null}
 

          <label className="checkbox-field">
            <input
              checked={isPrimary}
              disabled={isSubmitting}
              onChange={(event) => setIsPrimary(event.currentTarget.checked)}
              type="checkbox"
              style={isMounting ? { transition: "none" } : undefined}
            />
            <span>Mark as primary</span>
          </label>

          {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

          <div className="actions">
            <button className="button-primary" disabled={isSubmitDisabled} type="submit">
              {isSubmitting ? "Saving..." : "Save secret"}
            </button>
            <button
              className="button-secondary"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DialogBackdrop>
  );
}
