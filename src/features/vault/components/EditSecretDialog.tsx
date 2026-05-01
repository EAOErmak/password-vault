import { useEffect, useRef, useState, type FormEvent } from "react";
import { revealSecret } from "../api/secretApi";
import type { SecretMetadataDto, UpdateSecretRequest } from "../types";
import { getVaultErrorMessage } from "../../../lib/vault";
import {
  getDefaultSecretLabel,
  normalizeSecretLabel,
  usesMultilineSecretValue,
} from "../utils/secretHelpers";
import { formatEnumLabel } from "../utils/formatters";
import { PasswordGeneratorControls } from "./PasswordGeneratorControls";

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
  const [label, setLabel] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isLoadingCurrentValue, setIsLoadingCurrentValue] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !secret) {
      revealRequestRef.current += 1;
      setLabel("");
      setSecretValue("");
      setIsPrimary(false);
      setIsLoadingCurrentValue(false);
      setRevealError(null);
      return;
    }

    revealRequestRef.current += 1;
    setLabel(secret.label);
    setSecretValue("");
    setIsPrimary(secret.is_primary);
    setIsLoadingCurrentValue(false);
    setRevealError(null);
  }, [isOpen, secret]);

  if (!isOpen || !secret) {
    return null;
  }

  const multiline = usesMultilineSecretValue(secret.secret_type);
  const normalizedLabel = normalizeSecretLabel(secret.secret_type, label);
  const isSubmitDisabled = isSubmitting || isLoadingCurrentValue || secretValue.length === 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      secret_type: secret.secret_type,
      label: normalizedLabel,
      secret_value: secretValue,
      is_primary: isPrimary,
    });
  };

  const handleLoadCurrentValue = async () => {
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
    <div className="dialog-backdrop" role="presentation">
      <div aria-modal="true" className="dialog-card" role="dialog">
        <div className="dialog-header">
          <div>
            <h3>Edit secret</h3>
            <p>Enter a replacement value or load the current one explicitly first.</p>
          </div>
          <button className="button-ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form className="vault-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Type</span>
            <input disabled type="text" value={formatEnumLabel(secret.secret_type)} />
          </label>

          <label className="field">
            <span>Label</span>
            <input
              autoComplete="off"
              disabled={isSubmitting || isLoadingCurrentValue}
              onChange={(event) => setLabel(event.currentTarget.value)}
              placeholder={getDefaultSecretLabel(secret.secret_type)}
              type="text"
              value={label}
            />
          </label>

          <p className="field-helper">
            Optional. If empty, "{getDefaultSecretLabel(secret.secret_type)}" will be used.
          </p>

          <div className="secret-dialog-toolbar">
            <span className="field-helper">Current secret value is not prefilled.</span>
            <button
              className="button-secondary button-small"
              disabled={isSubmitting || isLoadingCurrentValue}
              onClick={handleLoadCurrentValue}
              type="button"
            >
              {isLoadingCurrentValue ? "Loading current value..." : "Load current value"}
            </button>
          </div>

          {secret.secret_type === "PASSWORD" ? (
            <PasswordGeneratorControls
              disabled={isSubmitting || isLoadingCurrentValue}
              onChangeValue={setSecretValue}
              value={secretValue}
            />
          ) : null}

          <label className="field">
            <span>Secret value</span>
            {multiline ? (
              <textarea
                disabled={isSubmitting || isLoadingCurrentValue}
                onChange={(event) => setSecretValue(event.currentTarget.value)}
                placeholder="Enter a replacement value or load the current one"
                rows={6}
                value={secretValue}
              />
            ) : (
              <input
                autoComplete="off"
                disabled={isSubmitting || isLoadingCurrentValue}
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
              disabled={isSubmitting || isLoadingCurrentValue}
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
              disabled={isSubmitting || isLoadingCurrentValue}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
