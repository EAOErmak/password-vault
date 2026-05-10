
import { useState } from "react";
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


  const [copiedState, setCopiedState] = useState<{ offsetX: number; offsetY: number } | null>(null);

  const handleCopy = async (event: React.MouseEvent<HTMLElement>) => {
    const target = event.currentTarget;
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard access is unavailable.");
      }

      await navigator.clipboard.writeText(value.value);
      
      const rect = target.getBoundingClientRect();
      const offsetX = Math.floor(Math.random() * rect.width) - rect.width / 2;
      const offsetY = Math.floor(Math.random() * rect.height) - rect.height / 2;
      
      setCopiedState({ offsetX, offsetY });
      setTimeout(() => {
        setCopiedState(null);
      }, 1500);

      target.animate([
        { backgroundColor: 'color-mix(in srgb, var(--color-accent) 30%, transparent)' },
        { backgroundColor: 'transparent' }
      ], {
        duration: 1000,
        easing: 'ease-out'
      });
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

      <div 
        className="value-row__content-shell"
        onClick={handleCopy}
        style={{ cursor: "pointer", position: 'relative' }}
      >
        <p className="value-row__content">
          {value.value}
        </p>
        {copiedState && (
          <div 
            className="copied-overlay"
            style={{ 
              transform: `translate(-50%, -50%) translate(${copiedState.offsetX}px, ${copiedState.offsetY}px)`,
              left: '50%',
              top: '50%'
            }}
          >Copied</div>
        )}
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
