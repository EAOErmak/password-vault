import { useEffect, useState } from "react";
import type {
  AccountDetails,
  AddAccountValueRequest,
  AddSecretRequest,
  PlatformDto,
  UpdateAccountRequest,
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
import { DeleteAccountConfirmDialog } from "./DeleteAccountConfirmDialog";
import { DialogBackdrop } from "./DialogBackdrop";
import { EditAccountDialog } from "./EditAccountDialog";
import { SecretsSection } from "./SecretsSection";

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
  onUpdateAccount: (accountId: string, request: UpdateAccountRequest) => Promise<void>;
  onUpdateSecret: (secretId: string, request: UpdateSecretRequest) => Promise<void>;
  onUpdateValue: (valueId: string, request: UpdateAccountValueRequest) => Promise<void>;
  platforms: PlatformDto[];
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
  onUpdateAccount,
  onUpdateSecret,
  onUpdateValue,
  platforms,
}: AccountDetailsDialogProps) {
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDeleteError(null);
      setEditError(null);
      setIsEditOpen(false);
      setIsDeleting(false);
      setIsEditing(false);
      setIsConfirmDeleteOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setDeleteError(null);
    setEditError(null);
    setIsEditOpen(false);
    setIsDeleting(false);
    setIsEditing(false);
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

  const handleSubmitEdit = async (request: UpdateAccountRequest) => {
    if (!account) {
      return;
    }

    setEditError(null);
    setIsEditing(true);

    try {
      await onUpdateAccount(account.id, request);
      setIsEditOpen(false);
    } catch (error) {
      setEditError(getVaultErrorMessage(error));
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <DialogBackdrop onClose={onClose}>
      <div
        aria-modal="true"
        className="dialog-card dialog-card--scrollable account-details-dialog"
        role="dialog"
        style={{
          background: "var(--dialog-tonal-bg)",
          boxShadow: "var(--shadow-dialog-tonal)",
          borderRadius: "24px",
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
                <div className="details-card details-card--summary">
                  <h3>{formatOptionalName(account.name)}</h3>
                  <p>{account.platform.name}</p>
                </div>
                <div className="account-details-summary__stats">
                  <span className="status-pill">{account.values.length} values</span>
                  <span className="status-pill">{account.secrets.length} secrets</span>
                </div>
              </div>
              <dl className="details-grid details-grid--compact">
                <div className="details-card">
                  <dt>Created</dt>
                  <dd>{formatDateTime(account.created_at)}</dd>
                </div>
                <div className="details-card">
                  <dt>Updated</dt>
                  <dd>{formatDateTime(account.updated_at)}</dd>
                </div>
              </dl>
              <div className="details-block details-card">
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

              <div className="actions">
                <button
                  className="button-secondary"
                  disabled={isDeleting || isEditing}
                  onClick={() => {
                    setEditError(null);
                    setIsEditOpen(true);
                  }}
                  type="button"
                >
                  {isEditing ? "Saving..." : "Edit account"}
                </button>
                <button
                  className="button-secondary button-danger"
                  disabled={isDeleting || isEditing}
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

        <EditAccountDialog
          account={account}
          errorMessage={editError}
          isOpen={isEditOpen}
          isSubmitting={isEditing}
          onClose={() => {
            setEditError(null);
            setIsEditOpen(false);
          }}
          onSubmit={handleSubmitEdit}
          platforms={platforms}
        />
      </div>
    </DialogBackdrop>
  );
}
