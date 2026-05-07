import { useEffect, useState, type FormEvent } from "react";
import type { AccountValueDto, UpdateAccountValueRequest } from "../types";
import {
  getDefaultAccountValueLabel,
  isCustomAccountValueType,
  normalizeAccountValueLabel,
} from "../utils/accountValueHelpers";
import { formatEnumLabel } from "../utils/formatters";
import { DialogBackdrop } from "./DialogBackdrop";

type EditAccountValueDialogProps = {
  errorMessage: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (request: UpdateAccountValueRequest) => Promise<void>;
  value: AccountValueDto | null;
};

export function EditAccountValueDialog({
  errorMessage,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
  value,
}: EditAccountValueDialogProps) {
  const [label, setLabel] = useState("");
  const [fieldValue, setFieldValue] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    if (!isOpen || !value) {
      return;
    }

    setLabel(value.label);
    setFieldValue(value.value);
    setIsPrimary(value.is_primary);
  }, [isOpen, value]);

  if (!isOpen || !value) {
    return null;
  }

  const isCustom = isCustomAccountValueType(value.value_type);
  const normalizedLabel = normalizeAccountValueLabel(value.value_type, label);
  const isSubmitDisabled =
    isSubmitting ||
    fieldValue.trim().length === 0 ||
    (isCustom && label.trim().length === 0);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      value_type: value.value_type,
      label: normalizedLabel,
      value: fieldValue,
      is_primary: isPrimary,
    });
  };

  return (
    <DialogBackdrop onClose={onClose}>
      <div aria-modal="true" className="dialog-card edit-value-dialog" role="dialog">
        <form className="vault-form" onSubmit={handleSubmit}>
          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="summary-label">Type</span>
              <button className="button-ghost button-small" onClick={onClose} type="button" style={{ padding: "4px 8px", margin: "-8px -8px -8px 0" }}>
                Close
              </button>
            </div>
            <input disabled type="text" value={formatEnumLabel(value.value_type)} />
          </div>

          <label className="field">
            <span>Label</span>
            <input
              autoComplete="off"
              disabled={isSubmitting}
              onChange={(event) => setLabel(event.currentTarget.value)}
              placeholder={getDefaultAccountValueLabel(value.value_type)}
              type="text"
              value={label}
            />
          </label>

          {isCustom ? <p className="field-helper">Custom values need a label.</p> : null}

          <label className="field">
            <span>Value</span>
            <input
              autoComplete="off"
              disabled={isSubmitting}
              onChange={(event) => setFieldValue(event.currentTarget.value)}
              type="text"
              value={fieldValue}
            />
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
