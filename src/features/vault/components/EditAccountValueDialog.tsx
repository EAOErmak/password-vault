import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { AccountValueDto, AccountValueType, UpdateAccountValueRequest } from "../types";
import { AccountValueTypeSelect } from "./AccountValueTypeSelect";
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
  const [valueType, setValueType] = useState<AccountValueType>(value?.value_type ?? "EMAIL");
  const [fieldValue, setFieldValue] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    if (!isOpen || !value) {
      return;
    }

    setFieldValue(value.value);
    setIsPrimary(value.is_primary);
    setValueType(value.value_type);
  }, [isOpen, value]);

  if (!isOpen || !value) {
    return null;
  }

  const isSubmitDisabled =
    isSubmitting ||
    fieldValue.trim().length === 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      value_type: valueType,
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
                <X />
              </button>
            </div>
            <AccountValueTypeSelect
              disabled={isSubmitting}
              onChange={setValueType}
              value={valueType}
            />
          </div>

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
