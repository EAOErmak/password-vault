import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { AddAccountValueRequest, AccountValueType } from "../types";
import { AccountValueTypeSelect } from "./AccountValueTypeSelect";
import { DialogBackdrop } from "./DialogBackdrop";

type AddAccountValueDialogProps = {
  errorMessage: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (request: AddAccountValueRequest) => Promise<void>;
  defaultIsPrimary?: boolean;
};

export function AddAccountValueDialog({
  errorMessage,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
  defaultIsPrimary = false,
}: AddAccountValueDialogProps) {
  const [valueType, setValueType] = useState<AccountValueType>("EMAIL");
  const [value, setValue] = useState("");
  const [isPrimary, setIsPrimary] = useState(defaultIsPrimary);
  const [isMounting, setIsMounting] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setValueType("EMAIL");
    setValue("");
    setIsMounting(false);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isSubmitDisabled =
    isSubmitting ||
    value.trim().length === 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      value_type: valueType,
      value,
      is_primary: isPrimary,
    });
  };

  return (
    <DialogBackdrop onClose={onClose}>
      <div aria-modal="true" className="dialog-card add-value-dialog" role="dialog">
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
              onChange={(event) => setValue(event.currentTarget.value)}
              placeholder="Enter the identifier value"
              type="text"
              value={value}
            />
          </label>


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
              {isSubmitting ? "Saving..." : "Save value"}
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
