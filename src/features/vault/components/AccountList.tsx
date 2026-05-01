import type { AccountSummary } from "../types";
import { AccountListItem } from "./AccountListItem";

type AccountListProps = {
  accounts: AccountSummary[];
  errorMessage: string | null;
  isLoading: boolean;
  onClearSearch: () => void;
  onOpenCreateAccount: () => void;
  onSelectAccount: (accountId: string) => void;
  searchQuery: string;
  selectedAccountId: string | null;
  selectedPlatformName: string | null;
};

export function AccountList({
  accounts,
  errorMessage,
  isLoading,
  onClearSearch,
  onOpenCreateAccount,
  onSelectAccount,
  searchQuery,
  selectedAccountId,
  selectedPlatformName,
}: AccountListProps) {
  const trimmedSearchQuery = searchQuery.trim();
  const hasSearchQuery = trimmedSearchQuery.length > 0;
  const title = selectedPlatformName
    ? `${selectedPlatformName} accounts`
    : "All accounts";

  return (
    <section className="vault-card panel-card">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>
            {hasSearchQuery
              ? `Matching "${trimmedSearchQuery}" across safe metadata only.`
              : "Only account metadata is listed here."}
          </p>
        </div>
        <button className="button-primary" onClick={onOpenCreateAccount} type="button">
          Create account
        </button>
      </div>

      {errorMessage && accounts.length === 0 ? (
        <p className="error-banner">{errorMessage}</p>
      ) : null}

      {isLoading && accounts.length === 0 ? (
        <p className="muted-state">Loading accounts...</p>
      ) : null}

      {!isLoading && accounts.length === 0 ? (
        <div className="empty-state">
          <p>
            {hasSearchQuery && selectedPlatformName
              ? `No accounts match "${trimmedSearchQuery}" in ${selectedPlatformName}.`
              : hasSearchQuery
                ? `No accounts match "${trimmedSearchQuery}".`
                : selectedPlatformName
                  ? `No accounts exist for ${selectedPlatformName} yet.`
                  : "No accounts exist yet."}
          </p>
          <div className="actions">
            {hasSearchQuery ? (
              <button className="button-secondary" onClick={onClearSearch} type="button">
                Clear search
              </button>
            ) : null}
            <button className="button-primary" onClick={onOpenCreateAccount} type="button">
              Create account
            </button>
          </div>
        </div>
      ) : null}

      {accounts.length > 0 ? (
        <div className="account-list">
          {accounts.map((account) => (
            <AccountListItem
              account={account}
              isSelected={selectedAccountId === account.id}
              key={account.id}
              onSelect={onSelectAccount}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
