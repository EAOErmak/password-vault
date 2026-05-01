import { useEffect, useState, type FormEvent } from "react";
import type { AddSecretRequest, SecretType } from "../types";
import {
  getDefaultSecretLabel,
  normalizeSecretLabel,
  SECRET_TYPE_OPTIONS,
  usesMultilineSecretValue,
} from "../utils/secretHelpers";
import { PasswordGeneratorControls } from "./PasswordGeneratorControls";

type AddSecretDialogProps = {
  errorMessage: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (request: AddSecretRequest) => Promise<void>;
};

export function AddSecretDialog({
  errorMessage,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: AddSecretDialogProps) {
  const [secretType, setSecretType] = useState<SecretType>("PASSWORD");
  const [label, setLabel] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSecretType("PASSWORD");
      setLabel("");
      setSecretValue("");
      setIsPrimary(false);
      return;
    }

    setLabel("");
    setSecretValue("");
    setIsPrimary(false);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const multiline = usesMultilineSecretValue(secretType);
  const normalizedLabel = normalizeSecretLabel(secretType, label);
  const isSubmitDisabled = isSubmitting || secretValue.length === 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      secret_type: secretType,
      label: normalizedLabel,
      secret_value: secretValue,
      is_primary: isPrimary,
    });
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <div aria-modal="true" className="dialog-card" role="dialog">
        <div className="dialog-header">
          <div>
            <h3>Add secret</h3>
            <p>Add a sensitive field without exposing it in the account details view.</p>
          </div>
          <button className="button-ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form className="vault-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Type</span>
            <select
              className="select-input"
              disabled={isSubmitting}
              onChange={(event) => setSecretType(event.currentTarget.value as SecretType)}
              value={secretType}
            >
              {SECRET_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Label</span>
            <input
              autoComplete="off"
              disabled={isSubmitting}
              onChange={(event) => setLabel(event.currentTarget.value)}
              placeholder={getDefaultSecretLabel(secretType)}
              type="text"
              value={label}
            />
          </label>

          <p className="field-helper">
            Optional. If empty, "{getDefaultSecretLabel(secretType)}" will be used.
          </p>

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

          <label className="checkbox-field">
            <input
              checked={isPrimary}
              disabled={isSubmitting}
              onChange={(event) => setIsPrimary(event.currentTarget.checked)}
              type="checkbox"
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
    </div>
  );
}
