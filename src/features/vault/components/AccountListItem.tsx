import type { AccountSummary } from "../types";
import { formatDateTime, formatOptionalName } from "../utils/formatters";

type AccountListItemProps = {
  account: AccountSummary;
  isSelected: boolean;
  onSelect: (accountId: string) => void;
};

export function AccountListItem({
  account,
  isSelected,
  onSelect,
}: AccountListItemProps) {
  return (
    <button
      className={isSelected ? "account-list-item account-list-item--selected" : "account-list-item"}
      onClick={() => onSelect(account.id)}
      type="button"
    >
      <div className="account-list-item__header">
        <strong>{formatOptionalName(account.name)}</strong>
        <span className="pill">{account.platform.name}</span>
      </div>

      <div className="account-list-item__meta">
        <span>{account.values.length} value metadata</span>
        <span>{account.secret_count} secret metadata</span>
      </div>

      <div className="account-list-item__meta">
        <span>Created {formatDateTime(account.created_at)}</span>
        <span>Updated {formatDateTime(account.updated_at)}</span>
      </div>
    </button>
  );
}
