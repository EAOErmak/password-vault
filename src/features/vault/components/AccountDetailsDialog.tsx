import { useEffect, useState } from "react";
import type {
  AccountDetails,
  AddAccountValueRequest,
  AddSecretRequest,
  UpdateAccountValueRequest,
  UpdateSecretRequest,
} from "../types";
import { getVaultErrorMessage } from "../../../lib/vault";
import {
  formatDateTime,
  formatOptionalName,
  formatOptionalText,
} from "../utils/formatters";
import { AccountValuesSection } from "./AccountValuesSection";
import { SecretsSection } from "./SecretsSection";
import { DeleteAccountConfirmDialog } from "./DeleteAccountConfirmDialog";

type AccountDetailsDialogProps = {
  account: AccountDetails | null;
  errorMessage: string | null;
  isLoading: boolean;
  isOpen: boolean;
  onAddValue: (accountId: string, request: AddAccountValueRequest) => Promise<void>;
  onAddSecret: (accountId: string, request: AddSecretRequest) => Promise<void>;
  onClose: () => void;
  onDeleteAccount: (accountId: string) => Promise<void>;
  onDeleteSecret: (secretId: string) => Promise<void>;
  onDeleteValue: (valueId: string) => Promise<void>;
  onUpdateSecret: (secretId: string, request: UpdateSecretRequest) => Promise<void>;
  onUpdateValue: (valueId: string, request: UpdateAccountValueRequest) => Promise<void>;
};

export function AccountDetailsDialog({
  account,
  errorMessage,
  isLoading,
  isOpen,
  onAddValue,
  onAddSecret,
  onClose,
  onDeleteAccount,
  onDeleteSecret,
  onDeleteValue,
  onUpdateSecret,
  onUpdateValue,
}: AccountDetailsDialogProps) {
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDeleteError(null);
      setIsDeleting(false);
      setIsConfirmDeleteOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setDeleteError(null);
    setIsDeleting(false);
    setIsConfirmDeleteOpen(false);
  }, [account?.id]);

  if (!isOpen) {
    return null;
  }
  const handleDelete = () => {
    if (!account) {
      return;
    }
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!account) {
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);

    try {
      await onDeleteAccount(account.id);
    } catch (error) {
      setDeleteError(getVaultErrorMessage(error));
      setIsDeleting(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        aria-modal="true"
        className="dialog-card dialog-card--scrollable account-details-dialog"
        role="dialog"
        style={{
          background: "linear-gradient(180deg, #f4f7f9 0%, #eef3f6 100%)",
          boxShadow: "0 20px 40px rgba(25, 33, 38, 0.12)",
          border: "1px solid rgba(25, 33, 38, 0.08)",
          borderRadius: "24px"
        }}
      >
        <div className="dialog-header">
          <div>
            <h3>Account details</h3>
          </div>
          <button className="button-ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
        {deleteError ? <p className="error-banner">{deleteError}</p> : null}
        {isLoading ? <p className="muted-state">Loading account details...</p> : null}

        {!isLoading && !account ? (
          <div className="empty-state">
            <p>Account details are unavailable.</p>
          </div>
        ) : null}

        {!isLoading && account ? (
          <div className="details-panel">
            <section className="details-section">
              <div className="account-details-summary">
                <div>
                  <h3>{formatOptionalName(account.name)}</h3>
                  <p>{account.platform.name}</p>
                </div>
                <div className="account-details-summary__stats">
                  <span className="status-pill">{account.values.length} values</span>
                  <span className="status-pill">{account.secrets.length} secrets</span>
                </div>
              </div>
              <dl className="details-grid details-grid--compact">
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

            <section className="details-section details-section--danger">
              <div className="section-heading">
                <h4>Delete account</h4>
              </div>
              <p className="field-helper">
                This performs a soft delete and removes the account from the active list.
              </p>
              <div className="actions">
                <button
                  className="button-secondary button-danger"
                  disabled={isDeleting}
                  onClick={() => {
                    void handleDelete();
                  }}
                  type="button"
                >
                  {isDeleting ? "Deleting..." : "Delete account"}
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {account && (
          <DeleteAccountConfirmDialog
            account={account}
            isDeleting={isDeleting}
            isOpen={isConfirmDeleteOpen}
            onClose={() => setIsConfirmDeleteOpen(false)}
            onConfirm={handleConfirmDelete}
          />
        )}
      </div>
    </div>
  );
}
