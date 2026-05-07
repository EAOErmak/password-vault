import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { AccountValueDto } from "../types";
import { formatDateTime, formatEnumLabel } from "../utils/formatters";

type AccountValueRowProps = {
  isBusy: boolean;
  onDelete: (value: AccountValueDto) => void;
  onEdit: (value: AccountValueDto) => void;
  onHistory: (value: AccountValueDto) => void;
  value: AccountValueDto;
};

export function AccountValueRow({
  isBusy,
  onDelete,
  onEdit,
  onHistory,
  value,
}: AccountValueRowProps) {
  const copyFeedbackTimerRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current !== null) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard access is unavailable.");
      }

      await navigator.clipboard.writeText(value.value);
      setCopied(true);
      if (copyFeedbackTimerRef.current !== null) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }
      copyFeedbackTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        copyFeedbackTimerRef.current = null;
      }, 2000);
    } catch (error) {
      console.error("Failed to copy value", error);
    }
  };

  return (
    <article className="metadata-item value-row">
      <div className="metadata-item__header">
        <div className="value-row__title">
          <strong>{value.label}</strong>
          <span className="value-row__type">{formatEnumLabel(value.value_type)}</span>
        </div>
        {value.is_primary ? <span className="pill">Primary</span> : null}
      </div>

      <div className="value-row__content-shell">
        <p className="value-row__content">{value.value}</p>
        <button
          className="button-ghost value-row__copy-button"
          disabled={isBusy}
          onClick={handleCopy}
          title="Copy value"
          type="button"
        >
          {copied ? (
            <Check className="value-row__copy-icon value-row__copy-icon--copied" size={16} />
          ) : (
            <Copy className="value-row__copy-icon" size={16} />
          )}
        </button>
      </div>

      <div className="value-row__footer">
        <small>Updated {formatDateTime(value.updated_at)}</small>
        <div className="value-row__actions">
          <button
            className="button-secondary button-small"
            disabled={isBusy}
            onClick={() => onHistory(value)}
            type="button"
          >
            History
          </button>
          <button
            className="button-secondary button-small"
            disabled={isBusy}
            onClick={() => onEdit(value)}
            type="button"
          >
            Edit
          </button>
          <button
            className="button-secondary button-small button-danger"
            disabled={isBusy}
            onClick={() => onDelete(value)}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
