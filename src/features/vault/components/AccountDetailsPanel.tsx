import type {
  AccountDetails,
  AddAccountValueRequest,
  AddSecretRequest,
  UpdateAccountValueRequest,
  UpdateSecretRequest,
} from "../types";
import { AccountValuesSection } from "./AccountValuesSection";
import { SecretsSection } from "./SecretsSection";
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
  onAddValue: (accountId: string, request: AddAccountValueRequest) => Promise<void>;
  onDeleteValue: (valueId: string) => Promise<void>;
  onUpdateValue: (valueId: string, request: UpdateAccountValueRequest) => Promise<void>;
  onAddSecret: (accountId: string, request: AddSecretRequest) => Promise<void>;
  onDeleteSecret: (secretId: string) => Promise<void>;
  onUpdateSecret: (secretId: string, request: UpdateSecretRequest) => Promise<void>;
};

export function AccountDetailsPanel({
  account,
  errorMessage,
  hasAccounts,
  isLoading,
  onAddValue,
  onDeleteValue,
  onUpdateValue,
  onAddSecret,
  onDeleteSecret,
  onUpdateSecret,
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

          <AccountValuesSection
            account={account}
            onAddValue={onAddValue}
            onDeleteValue={onDeleteValue}
            onUpdateValue={onUpdateValue}
          />

          <SecretsSection
            account={account}
            onAddSecret={onAddSecret}
            onDeleteSecret={onDeleteSecret}
            onUpdateSecret={onUpdateSecret}
          />
        </div>
      ) : null}
    </section>
  );
}
