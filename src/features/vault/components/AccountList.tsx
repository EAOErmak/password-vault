import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { copySecretToClipboard } from "../api/secretApi";
import type {
  AccountSummary,
  AccountTableRow,
  AccountValueDto,
  AddAccountValueRequest,
  AddSecretRequest,
  SecretMetadataDto,
  UpdateAccountValueRequest,
  UpdateSecretRequest,
} from "../types";
import { getVaultErrorMessage } from "../../../lib/vault";
import { AddAccountValueDialog } from "./AddAccountValueDialog";
import { AddSecretDialog } from "./AddSecretDialog";
import { EditAccountValueDialog } from "./EditAccountValueDialog";
import { EditSecretDialog } from "./EditSecretDialog";
import { AccountFiltersBar } from "./AccountFiltersBar";
import type { PlatformDto } from "../types";

type AccountListProps = {
  accounts: AccountSummary[];
  errorMessage: string | null;
  isLoading: boolean;
  onAddValue: (accountId: string, request: AddAccountValueRequest) => Promise<void>;
  onAddSecret: (accountId: string, request: AddSecretRequest) => Promise<void>;
  onClearSearch: () => void;
  onOpenCreateAccount: () => void;
  onOpenDetails: (accountId: string) => void;
  onPlatformFilterChange: (platformId: string | null) => void;
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
  selectedPlatformId: string | null;
  selectedPlatformName: string | null;
  platforms: PlatformDto[];
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

const ACCOUNTS_PER_PAGE = 10;

function getPrimaryPasswordSecret(account: AccountSummary): SecretMetadataDto | null {
  const primary = account.secrets.find(
    (secret) => secret.secret_type === "PASSWORD" && secret.is_primary,
  );
  if (primary) return primary;
  
  return account.secrets.find((secret) => secret.secret_type === "PASSWORD") ?? null;
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

    const primaryValue = account.values.find((v) => v.is_primary) || account.values[0] || null;

    return [
      {
        ...sharedFields,
        rowId: account.id,
        value: primaryValue?.value ?? null,
        valueEntry: primaryValue,
        valueId: primaryValue?.id ?? null,
        valueType: primaryValue?.value_type ?? null,
      },
    ];
  });
}

function renderStaticField(content: ReactNode, className?: string, onClick?: (event: MouseEvent<HTMLElement>) => void) {
  return (
    <span 
      className={className ? `account-table__static-field ${className}` : "account-table__static-field"}
      onClick={onClick}
    >
      {content}
    </span>
  );
}

function renderAccountName(name: string | null) {
  if (name?.trim()) {
    return renderStaticField(name);
  }

  return renderStaticField(<span className="table-dash">-</span>, "account-table__static-field--empty");
}

export function AccountList({
  accounts,
  errorMessage,
  isLoading,
  onAddValue,
  onAddSecret,
  onClearSearch,
  onOpenCreateAccount,
  onOpenDetails,
  onPlatformFilterChange,
  onSelectAccount,
  onUpdateSecret,
  onUpdateValue,
  searchQuery,
  selectedAccountId,
  selectedPlatformId,
  selectedPlatformName,
  platforms,
}: AccountListProps) {
  const clipboardClearAfterSeconds = 30;
  const [actionError, setActionError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [editingSecret, setEditingSecret] = useState<EditingSecretState | null>(null);
  const [editingValue, setEditingValue] = useState<EditingValueState | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addingValueAccount, setAddingValueAccount] = useState<AccountSummary | null>(null);
  const [addingSecretAccount, setAddingSecretAccount] = useState<AccountSummary | null>(null);

  const [clientValueFilter, setClientValueFilter] = useState("");
  const [clientNameFilter, setClientNameFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [sortColumn, setSortColumn] = useState<"name" | "platform" | "value" | "secret" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [copiedStates, setCopiedStates] = useState<Record<string, { offsetX: number; offsetY: number }>>({});

  const handleSort = (event: MouseEvent<HTMLElement>, column: "name" | "platform" | "value" | "secret") => {
    const target = event.currentTarget;
    
    target.animate([
      { backgroundColor: 'color-mix(in srgb, var(--color-accent) 25%, var(--surface-muted))' },
      { backgroundColor: 'var(--surface-muted)' }
    ], {
      duration: 600,
      easing: 'ease-out'
    });

    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const trimmedSearchQuery = searchQuery.trim();
  const hasSearchQuery = trimmedSearchQuery.length > 0;

  const trimmedValueFilter = clientValueFilter.trim().toLowerCase();
  const trimmedNameFilter = clientNameFilter.trim().toLowerCase();
  const hasClientFilters =
    selectedPlatformId !== null ||
    trimmedValueFilter.length > 0 ||
    trimmedNameFilter.length > 0;

  const rows = useMemo(() => {
    let baseRows = buildTableRows(accounts);

    if (trimmedValueFilter) {
      baseRows = baseRows.filter((r) => r.value && r.value.toLowerCase().includes(trimmedValueFilter));
    }
    if (trimmedNameFilter) {
      baseRows = baseRows.filter((r) => r.accountName && r.accountName.toLowerCase().includes(trimmedNameFilter));
    }

    if (sortColumn) {
      baseRows.sort((a, b) => {
        if (sortColumn === "secret") {
          const lenA = a.primaryPasswordSecret?.secret_length || 0;
          const lenB = b.primaryPasswordSecret?.secret_length || 0;
          return sortDirection === "asc" ? lenA - lenB : lenB - lenA;
        }

        let valA = "";
        let valB = "";
        
        if (sortColumn === "name") {
          valA = a.accountName || "";
          valB = b.accountName || "";
        } else if (sortColumn === "platform") {
          valA = a.platformName || "";
          valB = b.platformName || "";
        } else if (sortColumn === "value") {
          valA = a.value || "";
          valB = b.value || "";
        }
        
        const cmp = valA.localeCompare(valB, undefined, { sensitivity: 'accent' });
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }

    return baseRows;
  }, [accounts, trimmedValueFilter, trimmedNameFilter, sortColumn, sortDirection]);

  const visibleAccountCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(visibleAccountCount / ACCOUNTS_PER_PAGE));
  const resolvedCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (resolvedCurrentPage - 1) * ACCOUNTS_PER_PAGE;
  const paginatedRows = rows.slice(pageStartIndex, pageStartIndex + ACCOUNTS_PER_PAGE);
  const currentRangeStart = visibleAccountCount === 0 ? 0 : pageStartIndex + 1;
  const currentRangeEnd = Math.min(pageStartIndex + ACCOUNTS_PER_PAGE, visibleAccountCount);


  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlatformId, trimmedValueFilter, trimmedNameFilter, searchQuery, selectedPlatformName]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);



  const handleCopyValue = async (event: MouseEvent<HTMLElement>, row: AccountTableDisplayRow) => {
    event.stopPropagation();

    if (!row.valueEntry) {
      return;
    }

    const key = `${row.rowId}-value`;
    if (copiedStates[key]) {
      return;
    }

    setActionError(null);
    const target = event.currentTarget;

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard access is unavailable.");
      }

      await navigator.clipboard.writeText(row.valueEntry.value);
      onSelectAccount(row.accountId);
      
      const offsetX = Math.floor(Math.random() * 60) - 30; // -30 to 30
      const offsetY = Math.floor(Math.random() * 30) - 15; // -15 to 15
      
      setCopiedStates(prev => ({ ...prev, [key]: { offsetX, offsetY } }));
      setTimeout(() => {
        setCopiedStates(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
      }, 1500);
      
      target.animate([
        { backgroundColor: 'color-mix(in srgb, var(--color-accent) 30%, transparent)' },
        { backgroundColor: 'transparent' }
      ], {
        duration: 1000,
        easing: 'ease-out'
      });
    } catch (error) {
      setActionError(getVaultErrorMessage(error));
    }
  };

  const handleCopySecret = async (
    event: MouseEvent<HTMLElement>,
    row: AccountTableDisplayRow,
  ) => {
    event.stopPropagation();
    const target = event.currentTarget;

    if (!row.primaryPasswordSecret) {
      return;
    }

    const key = `${row.rowId}-secret`;
    if (copiedStates[key]) {
      return;
    }

    setActionError(null);

    try {
      await copySecretToClipboard(row.primaryPasswordSecret.id, clipboardClearAfterSeconds);
      onSelectAccount(row.accountId);
      
      const offsetX = Math.floor(Math.random() * 60) - 30; // -30 to 30
      const offsetY = Math.floor(Math.random() * 30) - 15; // -15 to 15
      
      setCopiedStates(prev => ({ ...prev, [key]: { offsetX, offsetY } }));
      setTimeout(() => {
        setCopiedStates(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
      }, 1500);
      
      target.animate([
        { backgroundColor: 'color-mix(in srgb, var(--color-accent) 30%, transparent)' },
        { backgroundColor: 'transparent' }
      ], {
        duration: 1000,
        easing: 'ease-out'
      });
    } catch (error) {
      setActionError(getVaultErrorMessage(error));
    }
  };

  const handleOpenAddSecret = (event: MouseEvent<HTMLButtonElement>, row: AccountTableDisplayRow) => {
    event.stopPropagation();
    setActionError(null);
    setDialogError(null);
    setAddingSecretAccount(row.account);
    onSelectAccount(row.accountId);
  };

  const handleOpenAddValue = (event: MouseEvent<HTMLButtonElement>, row: AccountTableDisplayRow) => {
    event.stopPropagation();
    setActionError(null);
    setDialogError(null);
    setAddingValueAccount(row.account);
    onSelectAccount(row.accountId);
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

  const handleSubmitAddValue = async (request: AddAccountValueRequest) => {
    if (!addingValueAccount) {
      return;
    }

    setDialogError(null);
    setIsSubmitting(true);

    try {
      await onAddValue(addingValueAccount.id, request);
      setAddingValueAccount(null);
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
    <div className="account-list-stack">
      <section className="vault-card panel-card account-filters-card">
        <AccountFiltersBar
          clientNameFilter={clientNameFilter}
          clientPlatformFilter={selectedPlatformId}
          clientValueFilter={clientValueFilter}
          onNameFilterChange={setClientNameFilter}
          onPlatformFilterChange={onPlatformFilterChange}
          onValueFilterChange={setClientValueFilter}
          platforms={platforms}
        />
      </section>

      <section className="vault-card panel-card account-list-card">
        <div className="panel-header account-list-card__header">
          <div className="page-copy">
            <h2 className="no-select">Accounts</h2>
          </div>
          <span className="status-pill">
            {visibleAccountCount === 0
              ? "0 shown"
              : `${currentRangeStart}-${currentRangeEnd} of ${visibleAccountCount}`}
          </span>
        </div>

        {errorMessage && accounts.length === 0 ? <p className="error-banner">{errorMessage}</p> : null}
        {actionError ? <p className="error-banner">{actionError}</p> : null}

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
        ) : !isLoading && accounts.length > 0 && rows.length === 0 && hasClientFilters ? (
          <div className="empty-state">
            <p>No accounts match the current filters.</p>
            <div className="actions">
              <button
                className="button-secondary"
                onClick={() => {
                  setClientNameFilter("");
                  setClientValueFilter("");
                  onPlatformFilterChange(null);
                }}
                type="button"
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : null}

        {accounts.length > 0 && rows.length > 0 ? (
          <div className="account-table-wrapper">
            <table className="account-table">
              <thead>
                <tr>
                  <th scope="col">
                    <span 
                      className="account-table__heading-chip" 
                      onClick={(event) => handleSort(event, "name")} 
                      style={{ cursor: "pointer" }}
                    >
                      Name {sortColumn === "name" ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
                    </span>
                  </th>
                  <th scope="col">
                    <span 
                      className="account-table__heading-chip" 
                      onClick={(event) => handleSort(event, "platform")} 
                      style={{ cursor: "pointer" }}
                    >
                      Platform {sortColumn === "platform" ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
                    </span>
                  </th>
                  <th scope="col">
                    <span 
                      className="account-table__heading-chip" 
                      onClick={(event) => handleSort(event, "value")} 
                      style={{ cursor: "pointer" }}
                    >
                      Value {sortColumn === "value" ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
                    </span>
                  </th>
                  <th scope="col">
                    <span 
                      className="account-table__heading-chip" 
                      onClick={(event) => handleSort(event, "secret")} 
                      style={{ cursor: "pointer" }}
                    >
                      Secret {sortColumn === "secret" ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
                    </span>
                  </th>



                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => (
                  <tr
                    className={
                      row.accountId === selectedAccountId
                        ? "account-table__row account-table__row--selected"
                        : "account-table__row"
                    }
                    key={row.rowId}
                    onClick={() => {
                      onSelectAccount(row.accountId);
                      onOpenDetails(row.accountId);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{renderAccountName(row.accountName)}</td>
                    <td>{renderStaticField(row.platformName)}</td>
                    <td>
                      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                        {row.valueEntry ? (
                          renderStaticField(
                            row.valueEntry.value,
                            "account-table__static-field--value",
                            (event) => {
                              event.stopPropagation();
                              void handleCopyValue(event, row);
                            }
                          )
                        ) : (
                          <button 
                            className="button-secondary button-small button-create-value" 
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenAddValue(event, row);
                            }}
                          >
                            Create Value
                          </button>
                        )}
                        {copiedStates[`${row.rowId}-value`] && (
                          <div 
                            className="copied-overlay"
                            style={{ 
                              transform: `translate(-50%, -50%) translate(${copiedStates[`${row.rowId}-value`].offsetX}px, ${copiedStates[`${row.rowId}-value`].offsetY}px)`,
                              left: '50%',
                              top: '50%'
                            }}
                          >Copied</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                        {row.hasAnyPasswordSecret ? (
                          renderStaticField(
                            "•".repeat(row.primaryPasswordSecret?.secret_length || 8),
                            "account-table__static-field--secret",
                            (event) => {
                              if (row.primaryPasswordSecret) {
                                event.stopPropagation();
                                void handleCopySecret(event, row);
                              }
                            }
                          )
                        ) : (
                          <button 
                            className="button-secondary button-small button-create-value" 
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenAddSecret(event, row);
                            }}
                          >
                            Create Secret
                          </button>
                        )}
                        {copiedStates[`${row.rowId}-secret`] && (
                          <div 
                            className="copied-overlay"
                            style={{ 
                              transform: `translate(-50%, -50%) translate(${copiedStates[`${row.rowId}-secret`].offsetX}px, ${copiedStates[`${row.rowId}-secret`].offsetY}px)`,
                              left: '50%',
                              top: '50%'
                            }}
                          >Copied</div>
                        )}
                      </div>
                    </td>



                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Pagination removed from bottom */}
      </section>

      <AddAccountValueDialog
        errorMessage={dialogError}
        isOpen={addingValueAccount !== null}
        isSubmitting={isSubmitting}
        onClose={() => {
          setDialogError(null);
          setAddingValueAccount(null);
        }}
        onSubmit={handleSubmitAddValue}
      />

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
    </div>
  );
}
