import type { AccountValueDto } from "../types";
import { formatDateTime, formatEnumLabel } from "../utils/formatters";

type AccountValueRowProps = {
  isBusy: boolean;
  onDelete: (value: AccountValueDto) => void;
  onEdit: (value: AccountValueDto) => void;
  value: AccountValueDto;
};

export function AccountValueRow({
  isBusy,
  onDelete,
  onEdit,
  value,
}: AccountValueRowProps) {
  return (
    <article className="metadata-item value-row">
      <div className="metadata-item__header">
        <div className="value-row__title">
          <strong>{value.label}</strong>
          <span className="value-row__type">{formatEnumLabel(value.value_type)}</span>
        </div>
        {value.is_primary ? <span className="pill">Primary</span> : null}
      </div>

      <p className="value-row__content">{value.value}</p>

      <div className="value-row__footer">
        <small>Updated {formatDateTime(value.updated_at)}</small>
        <div className="value-row__actions">
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
