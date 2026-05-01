import type { SecretMetadataDto } from "../types";
import { formatDateTime, formatEnumLabel } from "../utils/formatters";

type SecretRowProps = {
  copied: boolean;
  isBusy: boolean;
  onCopy: (secret: SecretMetadataDto) => void;
  onDelete: (secret: SecretMetadataDto) => void;
  onEdit: (secret: SecretMetadataDto) => void;
  onReveal: (secret: SecretMetadataDto) => void;
  secret: SecretMetadataDto;
};

export function SecretRow({
  copied,
  isBusy,
  onCopy,
  onDelete,
  onEdit,
  onReveal,
  secret,
}: SecretRowProps) {
  return (
    <article className="metadata-item secret-row">
      <div className="metadata-item__header">
        <div className="value-row__title">
          <strong>{secret.label}</strong>
          <span className="value-row__type">{formatEnumLabel(secret.secret_type)}</span>
        </div>
        {secret.is_primary ? <span className="pill">Primary</span> : null}
      </div>

      <p className="secret-row__masked">********</p>

      <div className="value-row__footer">
        <small>Updated {formatDateTime(secret.updated_at)}</small>
        <div className="value-row__actions">
          <button
            className="button-secondary button-small"
            disabled={isBusy}
            onClick={() => onReveal(secret)}
            type="button"
          >
            Reveal
          </button>
          <button
            className="button-secondary button-small"
            disabled={isBusy}
            onClick={() => onCopy(secret)}
            type="button"
          >
            {copied ? "Copied" : "Copy"}
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
