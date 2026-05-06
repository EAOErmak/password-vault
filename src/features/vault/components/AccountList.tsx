import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { copySecretToClipboard } from "../api/secretApi";
import type {
  AccountSummary,
  AccountTableRow,
  AccountValueDto,
  AddSecretRequest,
  SecretMetadataDto,
  UpdateAccountValueRequest,
  UpdateSecretRequest,
} from "../types";
import { getVaultErrorMessage } from "../../../lib/vault";
import { ACCOUNT_VALUE_TYPE_OPTIONS } from "../utils/accountValueHelpers";
import { AddSecretDialog } from "./AddSecretDialog";
import { EditAccountValueDialog } from "./EditAccountValueDialog";
import { EditSecretDialog } from "./EditSecretDialog";

type AccountListProps = {
  accounts: AccountSummary[];
  errorMessage: string | null;
  isLoading: boolean;
  onAddSecret: (accountId: string, request: AddSecretRequest) => Promise<void>;
  onClearSearch: () => void;
  onOpenCreateAccount: () => void;
  onOpenDetails: (accountId: string) => void;
  onSelectAccount: (accountId: string) => void;
  onUpdateSecret: (
    accountId: string,
    secretId: string,
    request: UpdateSecretRequest,
  ) => Promise<void>;
  onUpdateValue: (
    accountId: string,
    valueId: string,
    request: UpdateAccountValueRequest,
  ) => Promise<void>;
  searchQuery: string;
  selectedAccountId: string | null;
  selectedPlatformName: string | null;
};

type AccountTableDisplayRow = AccountTableRow & {
  account: AccountSummary;
  hasMoreSecrets: boolean;
  primaryPasswordSecret: SecretMetadataDto | null;
  rowId: string;
  valueEntry: AccountValueDto | null;
};

type EditingValueState = {
  accountId: string;
  value: AccountValueDto;
};

type EditingSecretState = {
  accountId: string;
  secret: SecretMetadataDto;
};

const VALUE_TYPE_LABELS = new Map(
  ACCOUNT_VALUE_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

function getValueTypeLabel(valueType: AccountValueDto["value_type"]): string {
  return VALUE_TYPE_LABELS.get(valueType) ?? valueType;
}

function getPrimaryPasswordSecret(account: AccountSummary): SecretMetadataDto | null {
  return (
    account.secrets.find(
      (secret) => secret.secret_type === "PASSWORD" && secret.is_primary,
    ) ?? null
  );
}

function hasAnyPasswordSecret(account: AccountSummary): boolean {
  return account.secrets.some((secret) => secret.secret_type === "PASSWORD");
}

function buildTableRows(accounts: AccountSummary[]): AccountTableDisplayRow[] {
  return accounts.flatMap<AccountTableDisplayRow>((account) => {
    const hasPasswordSecret = hasAnyPasswordSecret(account);
    const primaryPasswordSecret = getPrimaryPasswordSecret(account);
    const hasMoreSecrets =
      account.secrets.length > 1 || (account.secrets.length > 0 && !primaryPasswordSecret);
    const sharedFields = {
      account,
      accountId: account.id,
      accountName: account.name,
      createdAt: account.created_at,
      hasAnyPasswordSecret: hasPasswordSecret,
      hasMoreSecrets,
      hasPrimaryPasswordSecret: primaryPasswordSecret !== null,
      platformName: account.platform.name,
      primaryPasswordSecret,
      primaryPasswordSecretId: primaryPasswordSecret?.id ?? null,
      updatedAt: account.updated_at,
    };

    if (account.values.length === 0) {
      return [
        {
          ...sharedFields,
          rowId: `${account.id}:empty`,
          value: null,
          valueEntry: null,
          valueId: null,
          valueType: null,
        },
      ];
    }

    return account.values.map((value) => ({
      ...sharedFields,
      rowId: value.id,
      value: value.value,
      valueEntry: value,
      valueId: value.id,
      valueType: value.value_type,
    }));
  });
}

function renderAccountName(name: string | null) {
  if (name?.trim()) {
    return name;
  }

  return <span className="table-dash">-</span>;
}

export function AccountList({
  accounts,
  errorMessage,
  isLoading,
  onAddSecret,
  onClearSearch,
  onOpenCreateAccount,
  onOpenDetails,
  onSelectAccount,
  onUpdateSecret,
  onUpdateValue,
  searchQuery,
  selectedAccountId,
  selectedPlatformName,
}: AccountListProps) {
  const clipboardClearAfterSeconds = 30;
  const feedbackTimerRef = useRef<number | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [editingSecret, setEditingSecret] = useState<EditingSecretState | null>(null);
  const [editingValue, setEditingValue] = useState<EditingValueState | null>(null);
  const [isCopyingSecretId, setIsCopyingSecretId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addingSecretAccount, setAddingSecretAccount] = useState<AccountSummary | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const trimmedSearchQuery = searchQuery.trim();
  const hasSearchQuery = trimmedSearchQuery.length > 0;
  const title = selectedPlatformName
    ? `${selectedPlatformName} account access`
    : "Account access";
  const rows = useMemo(() => buildTableRows(accounts), [accounts]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const clearStatusMessage = () => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    setStatusMessage(null);
  };

  const showStatusMessage = (message: string) => {
    clearStatusMessage();
    setStatusMessage(message);
    feedbackTimerRef.current = window.setTimeout(() => {
      setStatusMessage(null);
      feedbackTimerRef.current = null;
    }, 2000);
  };

  const handleCopyValue = async (event: MouseEvent<HTMLButtonElement>, row: AccountTableDisplayRow) => {
    event.stopPropagation();

    if (!row.valueEntry) {
      return;
    }

    setActionError(null);

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard access is unavailable.");
      }

      await navigator.clipboard.writeText(row.valueEntry.value);
      onSelectAccount(row.accountId);
      showStatusMessage("Value copied to clipboard.");
    } catch (error) {
      clearStatusMessage();
      setActionError(getVaultErrorMessage(error));
    }
  };

  const handleCopySecret = async (
    event: MouseEvent<HTMLButtonElement>,
    row: AccountTableDisplayRow,
  ) => {
    event.stopPropagation();

    if (!row.primaryPasswordSecret) {
      return;
    }

    setActionError(null);
    setIsCopyingSecretId(row.primaryPasswordSecret.id);

    try {
      await copySecretToClipboard(row.primaryPasswordSecret.id, clipboardClearAfterSeconds);
      onSelectAccount(row.accountId);
      showStatusMessage(
        `Secret copied. Clipboard will clear in ${clipboardClearAfterSeconds} seconds.`,
      );
    } catch (error) {
      clearStatusMessage();
      setActionError(getVaultErrorMessage(error));
    } finally {
      setIsCopyingSecretId(null);
    }
  };

  const handleOpenAddSecret = (event: MouseEvent<HTMLButtonElement>, row: AccountTableDisplayRow) => {
    event.stopPropagation();
    setActionError(null);
    setDialogError(null);
    setAddingSecretAccount(row.account);
    onSelectAccount(row.accountId);
  };

  const handleOpenEditValue = (event: MouseEvent<HTMLButtonElement>, row: AccountTableDisplayRow) => {
    event.stopPropagation();

    if (!row.valueEntry) {
      return;
    }

    setActionError(null);
    setDialogError(null);
    setEditingValue({
      accountId: row.accountId,
      value: row.valueEntry,
    });
    onSelectAccount(row.accountId);
  };

  const handleOpenEditSecret = (
    event: MouseEvent<HTMLButtonElement>,
    row: AccountTableDisplayRow,
  ) => {
    event.stopPropagation();

    if (!row.primaryPasswordSecret) {
      return;
    }

    setActionError(null);
    setDialogError(null);
    setEditingSecret({
      accountId: row.accountId,
      secret: row.primaryPasswordSecret,
    });
    onSelectAccount(row.accountId);
  };

  const handleOpenDetails = (event: MouseEvent<HTMLButtonElement>, accountId: string) => {
    event.stopPropagation();
    onOpenDetails(accountId);
  };

  const handleSubmitAddSecret = async (request: AddSecretRequest) => {
    if (!addingSecretAccount) {
      return;
    }

    setDialogError(null);
    setIsSubmitting(true);

    try {
      await onAddSecret(addingSecretAccount.id, request);
      setAddingSecretAccount(null);
    } catch (error) {
      setDialogError(getVaultErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEditValue = async (request: UpdateAccountValueRequest) => {
    if (!editingValue) {
      return;
    }

    setDialogError(null);
    setIsSubmitting(true);

    try {
      await onUpdateValue(editingValue.accountId, editingValue.value.id, request);
      setEditingValue(null);
    } catch (error) {
      setDialogError(getVaultErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEditSecret = async (request: UpdateSecretRequest) => {
    if (!editingSecret) {
      return;
    }

    setDialogError(null);
    setIsSubmitting(true);

    try {
      await onUpdateSecret(editingSecret.accountId, editingSecret.secret.id, request);
      setEditingSecret(null);
    } catch (error) {
      setDialogError(getVaultErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="vault-card panel-card">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>
            {hasSearchQuery
              ? `Matching "${trimmedSearchQuery}" across safe account metadata only.`
              : "Fast actions stay on safe values and password metadata only."}
          </p>
        </div>
        <button className="button-primary" onClick={onOpenCreateAccount} type="button">
          Create account
        </button>
      </div>

      {errorMessage && accounts.length === 0 ? <p className="error-banner">{errorMessage}</p> : null}
      {actionError ? <p className="error-banner">{actionError}</p> : null}
      {statusMessage ? (
        <div aria-live="polite" className="status-toast" role="status">
          {statusMessage}
        </div>
      ) : null}

      {isLoading && accounts.length === 0 ? <p className="muted-state">Loading accounts...</p> : null}

      {!isLoading && accounts.length === 0 ? (
        <div className="empty-state">
          <p>
            {hasSearchQuery && selectedPlatformName
              ? `No accounts match "${trimmedSearchQuery}" in ${selectedPlatformName}.`
              : hasSearchQuery
                ? `No accounts match "${trimmedSearchQuery}".`
                : selectedPlatformName
                  ? `No accounts yet for ${selectedPlatformName}.`
                  : "No accounts yet."}
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
        <div className="account-table-wrapper">
          {isLoading ? <p className="muted-state">Refreshing account table...</p> : null}
          <table className="account-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Platform</th>
                <th scope="col">Value</th>
                <th scope="col">Type</th>
                <th scope="col">Value actions</th>
                <th scope="col">Secret actions</th>
                <th scope="col">Additional Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  className={
                    row.accountId === selectedAccountId
                      ? "account-table__row account-table__row--selected"
                      : "account-table__row"
                  }
                  key={row.rowId}
                  onClick={() => onSelectAccount(row.accountId)}
                >
                  <td>{renderAccountName(row.accountName)}</td>
                  <td>{row.platformName}</td>
                  <td>
                    {row.valueEntry ? (
                      <span className="account-table__value">{row.valueEntry.value}</span>
                    ) : (
                      <span className="table-empty">No values for this account</span>
                    )}
                  </td>
                  <td>{row.valueType ? getValueTypeLabel(row.valueType) : <span className="table-dash">-</span>}</td>
                  <td>
                    {row.valueEntry ? (
                      <div className="account-table__actions">
                        <button
                          className="button-secondary button-small"
                          onClick={(event) => {
                            void handleCopyValue(event, row);
                          }}
                          type="button"
                        >
                          Copy value
                        </button>
                        <button
                          className="button-secondary button-small"
                          disabled={isSubmitting}
                          onClick={(event) => handleOpenEditValue(event, row)}
                          type="button"
                        >
                          Edit value
                        </button>
                      </div>
                    ) : (
                      <span className="table-empty">No values for this account</span>
                    )}
                  </td>
                  <td>
                    <div className="account-table__actions">
                      {row.primaryPasswordSecret ? (
                        <>
                          <button
                            className="button-secondary button-small"
                            disabled={isCopyingSecretId !== null || isSubmitting}
                            onClick={(event) => {
                              void handleCopySecret(event, row);
                            }}
                            type="button"
                          >
                            {isCopyingSecretId === row.primaryPasswordSecret.id
                              ? "Copying..."
                              : "Copy secret"}
                          </button>
                          <button
                            className="button-secondary button-small"
                            disabled={isSubmitting}
                            onClick={(event) => handleOpenEditSecret(event, row)}
                            type="button"
                          >
                            Edit secret
                          </button>
                        </>
                      ) : row.hasAnyPasswordSecret ? (
                        <span className="table-empty">No primary password</span>
                      ) : (
                        <>
                          <span className="table-empty">No password</span>
                          <button
                            className="button-secondary button-small"
                            disabled={isSubmitting}
                            onClick={(event) => handleOpenAddSecret(event, row)}
                            type="button"
                          >
                            Add secret
                          </button>
                        </>
                      )}
                      {row.hasMoreSecrets ? (
                        <button
                          className="button-secondary button-small"
                          onClick={(event) => handleOpenDetails(event, row.accountId)}
                          type="button"
                        >
                          More
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <button
                      className="button-secondary button-small"
                      onClick={(event) => handleOpenDetails(event, row.accountId)}
                      type="button"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <AddSecretDialog
        errorMessage={dialogError}
        isOpen={addingSecretAccount !== null}
        isSubmitting={isSubmitting}
        onClose={() => {
          setDialogError(null);
          setAddingSecretAccount(null);
        }}
        onSubmit={handleSubmitAddSecret}
      />

      <EditAccountValueDialog
        errorMessage={dialogError}
        isOpen={editingValue !== null}
        isSubmitting={isSubmitting}
        onClose={() => {
          setDialogError(null);
          setEditingValue(null);
        }}
        onSubmit={handleSubmitEditValue}
        value={editingValue?.value ?? null}
      />

      <EditSecretDialog
        errorMessage={dialogError}
        isOpen={editingSecret !== null}
        isSubmitting={isSubmitting}
        onClose={() => {
          setDialogError(null);
          setEditingSecret(null);
        }}
        onSubmit={handleSubmitEditSecret}
        secret={editingSecret?.secret ?? null}
      />
    </section>
  );
}
