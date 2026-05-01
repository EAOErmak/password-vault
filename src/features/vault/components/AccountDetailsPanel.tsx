import type {
  AccountDetails,
} from "../types";
import {
  formatDateTime,
  formatEnumLabel,
  formatOptionalName,
  formatOptionalText,
} from "../utils/formatters";

type AccountDetailsPanelProps = {
  account: AccountDetails | null;
  errorMessage: string | null;
  hasAccounts: boolean;
  isLoading: boolean;
};

export function AccountDetailsPanel({
  account,
  errorMessage,
  hasAccounts,
  isLoading,
}: AccountDetailsPanelProps) {
  return (
    <section className="vault-card panel-card">
      <div className="panel-header">
        <div>
          <h2>Account details</h2>
          <p>Secret values remain hidden.</p>
        </div>
      </div>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      {isLoading ? <p className="muted-state">Loading account details...</p> : null}

      {!isLoading && !account ? (
        <div className="empty-state empty-state--compact">
          <p>{hasAccounts ? "Select an account to see its metadata." : "No selected account."}</p>
        </div>
      ) : null}

      {!isLoading && account ? (
        <div className="details-panel">
          <section className="details-section">
            <h3>{formatOptionalName(account.name)}</h3>
            <dl className="details-grid">
              <div>
                <dt>Platform</dt>
                <dd>{account.platform.name}</dd>
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
          </section>

          <section className="details-section">
            <div className="section-heading">
              <h4>Value metadata</h4>
              <span>{account.values.length}</span>
            </div>

            {account.values.length === 0 ? (
              <p className="muted-state">No account value metadata yet.</p>
            ) : (
              <div className="metadata-list">
                {account.values.map((value) => (
                  <article className="metadata-item" key={value.id}>
                    <div className="metadata-item__header">
                      <strong>{value.label}</strong>
                      {value.is_primary ? <span className="pill">Primary</span> : null}
                    </div>
                    <p>{formatEnumLabel(value.value_type)}</p>
                    <small>Updated {formatDateTime(value.updated_at)}</small>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="details-section">
            <div className="section-heading">
              <h4>Secret metadata</h4>
              <span>{account.secrets.length}</span>
            </div>

            {account.secrets.length === 0 ? (
              <p className="muted-state">No secret metadata yet.</p>
            ) : (
              <div className="metadata-list">
                {account.secrets.map((secret) => (
                  <article className="metadata-item" key={secret.id}>
                    <div className="metadata-item__header">
                      <strong>{secret.label}</strong>
                      {secret.is_primary ? <span className="pill">Primary</span> : null}
                    </div>
                    <p>{formatEnumLabel(secret.secret_type)}</p>
                    <small>Value hidden. Updated {formatDateTime(secret.updated_at)}</small>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
