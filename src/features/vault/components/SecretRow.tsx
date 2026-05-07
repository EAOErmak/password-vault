import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  const copyFeedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current !== null) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }
    };
  }, []);

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

  const handleCopy = async () => {
    try {
      await copySecretToClipboard(secret.id, 30);
      setCopied(true);
      if (copyFeedbackTimerRef.current !== null) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }
      copyFeedbackTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        copyFeedbackTimerRef.current = null;
      }, 2000);
    } catch (error) {
      console.error("Failed to copy secret", error);
    }
  };

  return (
    <article className="metadata-item secret-row">
      <div className="metadata-item__header">
        <div className="value-row__title">
          <strong>{secret.label}</strong>
          <span className="value-row__type">{formatEnumLabel(secret.secret_type)}</span>
        </div>
        {secret.is_primary ? <span className="pill">Primary</span> : null}
      </div>

      <div className="secret-row__masked" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className={revealedValue === null ? "secret-row__masked--value" : ""} style={{ wordBreak: "break-all" }}>
          {revealedValue !== null ? revealedValue : "********"}
        </span>
        <div style={{ display: "flex", gap: "8px", marginLeft: "12px", flexShrink: 0 }}>
          <button 
            type="button" 
            className="button-ghost value-row__copy-button"
            onClick={handleToggleReveal}
            disabled={isBusy || isRevealing}
            title={revealedValue !== null ? "Hide secret" : "Reveal secret"}
          >
            {revealedValue !== null ? (
              <EyeOff className="value-row__copy-icon" size={16} />
            ) : (
              <Eye className="value-row__copy-icon" size={16} />
            )}
          </button>
          <button 
            type="button" 
            className="button-ghost value-row__copy-button"
            onClick={handleCopy}
            disabled={isBusy}
            title="Copy secret"
          >
            {copied ? (
              <Check className="value-row__copy-icon value-row__copy-icon--copied" size={16} />
            ) : (
              <Copy className="value-row__copy-icon" size={16} />
            )}
          </button>
        </div>
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
