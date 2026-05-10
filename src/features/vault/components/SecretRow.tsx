import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { SecretMetadataDto } from "../types";
import { formatDateTime, formatEnumLabel } from "../utils/formatters";
import { revealSecret, copySecretToClipboard } from "../api/secretApi";

type SecretRowProps = {
  isBusy: boolean;
  onDelete: (secret: SecretMetadataDto) => void;
  onEdit: (secret: SecretMetadataDto) => void;
  onHistory: (secret: SecretMetadataDto) => void;
  secret: SecretMetadataDto;
};

export function SecretRow({
  isBusy,
  onDelete,
  onEdit,
  onHistory,
  secret,
}: SecretRowProps) {
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [copiedState, setCopiedState] = useState<{ offsetX: number; offsetY: number } | null>(null);

  const handleToggleReveal = async () => {
    if (revealedValue !== null) {
      setRevealedValue(null);
      return;
    }

    setIsRevealing(true);
    try {
      const revealed = await revealSecret(secret.id);
      setRevealedValue(revealed.secret_value);
    } catch (error) {
      console.error("Failed to reveal secret", error);
    } finally {
      setIsRevealing(false);
    }
  };

  const handleCopy = async (event: React.MouseEvent<HTMLElement>) => {
    if (copiedState) {
      return;
    }
    const target = event.currentTarget;
    try {
      await copySecretToClipboard(secret.id, 30);
      
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
        duration: 1500,
        easing: 'ease-out'
      });
    } catch (error) {
      console.error("Failed to copy secret", error);
    }
  };

  return (
    <article className="metadata-item secret-row">
      <div className="metadata-item__header">
        <div className="value-row__title">
          <strong>{formatEnumLabel(secret.secret_type)}</strong>
        </div>
        {secret.is_primary ? <span className="pill">Primary</span> : null}
      </div>

      <div 
        className="secret-row__masked" 
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", position: 'relative' }}
        onClick={handleCopy}
      >
        <span 
          className={revealedValue === null ? "secret-row__masked--value" : ""} 
          style={{ wordBreak: "break-all" }}
        >
          {revealedValue !== null ? revealedValue : "********"}
        </span>
        <div style={{ display: "flex", gap: "8px", marginLeft: "12px", flexShrink: 0 }}>
          <button 
            type="button" 
            className="button-ghost value-row__copy-button"
            onClick={(e) => { e.stopPropagation(); void handleToggleReveal(); }}
            disabled={isBusy || isRevealing}
            title={revealedValue !== null ? "Hide secret" : "Reveal secret"}
          >
            {revealedValue !== null ? (
              <EyeOff className="value-row__copy-icon" size={16} />
            ) : (
              <Eye className="value-row__copy-icon" size={16} />
            )}
          </button>
        </div>
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
        <small>Updated {formatDateTime(secret.updated_at)}</small>
        <div className="value-row__actions">
          <button
            className="button-secondary button-small"
            disabled={isBusy}
            onClick={() => onHistory(secret)}
            type="button"
          >
            History
          </button>
          <button
            className="button-secondary button-small"
            disabled={isBusy}
            onClick={() => onEdit(secret)}
            type="button"
          >
            Edit
          </button>
          <button
            className="button-secondary button-small button-danger"
            disabled={isBusy}
            onClick={() => onDelete(secret)}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
