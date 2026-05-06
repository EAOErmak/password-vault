import type { AccountDetails } from "../types";
import {
  formatDateTime,
  formatOptionalName,
  formatOptionalText,
} from "../utils/formatters";

type AccountDetailsPanelProps = {
  account: AccountDetails | null;
  errorMessage: string | null;
  hasAccounts: boolean;
  isLoading: boolean;
  onOpenDetails: (accountId: string) => void;
};

export function AccountDetailsPanel({
  account,
  errorMessage,
  hasAccounts,
  isLoading,
  onOpenDetails,
}: AccountDetailsPanelProps) {
  return (
    <section className="vault-card panel-card">
      <div className="panel-header">
        <div>
          <h2>Selected account</h2>
          <p>Review safe metadata here, then open full details for history and secret actions.</p>
        </div>
      </div>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      {isLoading ? <p className="muted-state">Loading account details...</p> : null}

      {!isLoading && !account ? (
        <div className="empty-state empty-state--compact">
          <p>{hasAccounts ? "Select an account row to preview it." : "No selected account."}</p>
        </div>
      ) : null}

      {!isLoading && account ? (
        <div className="details-panel">
          <section className="details-section">
            <h3>{formatOptionalName(account.name)}</h3>
            <dl className="details-grid">
              <div>
                <dt>Name</dt>
                <dd>{formatOptionalName(account.name)}</dd>
              </div>
              <div>
                <dt>Platform</dt>
                <dd>{account.platform.name}</dd>
              </div>
              <div>
                <dt>Values</dt>
                <dd>{account.values.length}</dd>
              </div>
              <div>
                <dt>Secrets</dt>
                <dd>{account.secrets.length}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(account.created_at)}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatDateTime(account.updated_at)}</dd>
              </div>
            </dl>
            <div className="details-block">
              <span className="summary-label">Notes</span>
              <p>{formatOptionalText(account.notes, "No notes.")}</p>
            </div>
            <div className="actions">
              <button
                className="button-primary"
                onClick={() => onOpenDetails(account.id)}
                type="button"
              >
                Open details
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
