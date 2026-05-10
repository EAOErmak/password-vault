import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { revealSecret } from "../api/secretApi";
import type { SecretMetadataDto, UpdateSecretRequest } from "../types";
import { getVaultErrorMessage } from "../../../lib/vault";
import {
  usesMultilineSecretValue,
} from "../utils/secretHelpers";
import { DialogBackdrop } from "./DialogBackdrop";
import { PasswordGeneratorControls } from "./PasswordGeneratorControls";
import { SecretTypeSelect } from "./SecretTypeSelect";

type EditSecretDialogProps = {
  errorMessage: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (request: UpdateSecretRequest) => Promise<void>;
  secret: SecretMetadataDto | null;
};

export function EditSecretDialog({
  errorMessage,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
  secret,
}: EditSecretDialogProps) {
  const revealRequestRef = useRef(0);
  const [secretType, setSecretType] = useState(secret?.secret_type ?? "PASSWORD");
  const [secretValue, setSecretValue] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isLoadingCurrentValue, setIsLoadingCurrentValue] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !secret) {
      revealRequestRef.current += 1;
      setSecretType("PASSWORD");
      setSecretValue("");
      setIsPrimary(false);
      setIsLoadingCurrentValue(false);
      setRevealError(null);
      return;
    }

    revealRequestRef.current += 1;
    setSecretType(secret.secret_type);
    setSecretValue("");
    setIsPrimary(secret.is_primary);
    setIsLoadingCurrentValue(false);
    setRevealError(null);
  }, [isOpen, secret]);

  if (!isOpen || !secret) {
    return null;
  }

  const multiline = usesMultilineSecretValue(secretType);
  const isSubmitDisabled = isSubmitting || isLoadingCurrentValue || secretValue.length === 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      secret_type: secretType,
      secret_value: secretValue,
      is_primary: isPrimary,
    });
  };

  const handleLoadCurrentValue = async () => {
    if (isLoadingCurrentValue) return;
    const requestId = revealRequestRef.current + 1;
    revealRequestRef.current = requestId;
    setIsLoadingCurrentValue(true);
    setRevealError(null);

    try {
      const revealed = await revealSecret(secret.id);
      if (revealRequestRef.current !== requestId) {
        return;
      }

      setSecretValue(revealed.secret_value);
    } catch (error) {
      if (revealRequestRef.current !== requestId) {
        return;
      }

      setRevealError(getVaultErrorMessage(error));
    } finally {
      if (revealRequestRef.current === requestId) {
        setIsLoadingCurrentValue(false);
      }
    }
  };

  return (
    <DialogBackdrop onClose={onClose}>
      <div aria-modal="true" className="dialog-card edit-secret-dialog" role="dialog">


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

          <div className="secret-dialog-toolbar">
            <button
              className="button-secondary button-small"
              disabled={isSubmitting}
              onClick={handleLoadCurrentValue}
              type="button"
            >
              Load current value
            </button>
          </div>

          {secretType === "PASSWORD" ? (
            <PasswordGeneratorControls
              disabled={isSubmitting}
              onChangeValue={setSecretValue}
              value={secretValue}
            />
          ) : null}

          <label className="field">
            <span>Secret value</span>
            {multiline ? (
              <textarea
                disabled={isSubmitting}
                onChange={(event) => setSecretValue(event.currentTarget.value)}
                placeholder="Enter a replacement value or load the current one"
                rows={6}
                value={secretValue}
              />
            ) : (
              <input
                autoComplete="off"
                disabled={isSubmitting}
                onChange={(event) => setSecretValue(event.currentTarget.value)}
                placeholder="Enter a replacement value or load the current one"
                spellCheck={false}
                type="text"
                value={secretValue}
              />
            )}
          </label>

          <label className="checkbox-field">
            <input
              checked={isPrimary}
              disabled={isSubmitting}
              onChange={(event) => setIsPrimary(event.currentTarget.checked)}
              type="checkbox"
            />
            <span>Mark as primary</span>
          </label>

          {revealError ? <p className="error-banner">{revealError}</p> : null}
          {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

          <div className="actions">
            <button className="button-primary" disabled={isSubmitDisabled} type="submit">
              {isSubmitting ? "Saving..." : "Save changes"}
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
