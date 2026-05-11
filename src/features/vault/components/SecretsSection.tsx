import { useEffect, useRef, useState } from "react";
import { listSecretHistory } from "../api/secretApi";
import type {
  AccountDetails,
  AddSecretRequest,
  SecretHistoryDto,
  SecretMetadataDto,
  UpdateSecretRequest,
} from "../types";
import { getVaultErrorMessage } from "../../../lib/vault";
import { AddSecretDialog } from "./AddSecretDialog";
import { EditSecretDialog } from "./EditSecretDialog";

import { SecretHistoryDialog } from "./SecretHistoryDialog";
import { SecretRow } from "./SecretRow";
import { DeleteSecretConfirmDialog } from "./DeleteSecretConfirmDialog";

type SecretsSectionProps = {
  account: AccountDetails;
  onAddSecret: (accountId: string, request: AddSecretRequest) => Promise<void>;
  onDeleteSecret: (secretId: string) => Promise<void>;
  onUpdateSecret: (secretId: string, request: UpdateSecretRequest) => Promise<void>;
  isPrimaryByDefault: boolean;
};

export function SecretsSection({
  account,
  onAddSecret,
  onDeleteSecret,
  onUpdateSecret,
  isPrimaryByDefault,
}: SecretsSectionProps) {
  const historyRequestRef = useRef(0);

  const [dialogError, setDialogError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<SecretMetadataDto | null>(null);
  const [historySecret, setHistorySecret] = useState<SecretMetadataDto | null>(null);
  const [historyTab, setHistoryTab] = useState<"history" | "other">("history");
  const [secretHistory, setSecretHistory] = useState<SecretHistoryDto[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const [deletingSecret, setDeletingSecret] = useState<SecretMetadataDto | null>(null);



  useEffect(() => {
    historyRequestRef.current += 1;
    setDialogError(null);
    setActionError(null);
    setIsSubmitting(false);
    setIsAddOpen(false);
    setEditingSecret(null);
    setHistorySecret(null);
    setSecretHistory([]);
    setHistoryError(null);
    setIsLoadingHistory(false);
    setDeletingSecret(null);
  }, [account.id]);



  const handleOpenAdd = () => {
    setDialogError(null);
    setActionError(null);
    setIsAddOpen(true);
  };

  const handleCloseAdd = () => {
    setDialogError(null);
    setIsAddOpen(false);
  };

  const handleOpenEdit = (secret: SecretMetadataDto) => {
    setDialogError(null);
    setActionError(null);
    setEditingSecret(secret);
  };

  const handleCloseEdit = () => {
    setDialogError(null);
    setEditingSecret(null);
  };



  const handleOpenHistory = async (secret: SecretMetadataDto, tab: "history" | "other" = "history") => {
    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;
    setActionError(null);
    setHistorySecret(secret);
    setHistoryTab(tab);
    setSecretHistory([]);
    setHistoryError(null);
    setIsLoadingHistory(true);

    try {
      const history = await listSecretHistory(secret.id);
      if (historyRequestRef.current !== requestId) {
        return;
      }

      setSecretHistory(history);
    } catch (error) {
      if (historyRequestRef.current !== requestId) {
        return;
      }

      setHistoryError(getVaultErrorMessage(error));
    } finally {
      if (historyRequestRef.current === requestId) {
        setIsLoadingHistory(false);
      }
    }
  };

  const handleCloseHistory = () => {
    historyRequestRef.current += 1;
    setHistorySecret(null);
    setSecretHistory([]);
    setHistoryError(null);
    setIsLoadingHistory(false);
  };

  const handleAdd = async (request: AddSecretRequest) => {
    setIsSubmitting(true);
    setDialogError(null);
    setActionError(null);

    try {
      await onAddSecret(account.id, request);
      setIsAddOpen(false);
    } catch (error) {
      setDialogError(getVaultErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (request: UpdateSecretRequest) => {
    if (!editingSecret) {
      return;
    }

    setIsSubmitting(true);
    setDialogError(null);
    setActionError(null);

    try {
      await onUpdateSecret(editingSecret.id, request);
      setEditingSecret(null);
    } catch (error) {
      setDialogError(getVaultErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (secret: SecretMetadataDto) => {
    setDeletingSecret(secret);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSecret) return;
    
    setIsSubmitting(true);
    setDialogError(null);
    setActionError(null);

    try {
      await onDeleteSecret(deletingSecret.id);
      setDeletingSecret(null);
    } catch (error) {
      setActionError(getVaultErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };





  return (
    <section className="details-section">
      <div className="section-heading">
        <h4>Secrets</h4>
        <div className="section-heading__actions" style={{ display: "flex", gap: "8px" }}>
          {account.secrets.length > 1 ? (
            <button
              className="button-secondary button-small"
              onClick={() => {
                const primarySecret = account.secrets.find(s => s.is_primary) || account.secrets[0];
                if (primarySecret) {
                  void handleOpenHistory(primarySecret, "other");
                }
              }}
              type="button"
            >
              Other secrets
            </button>
          ) : null}
          <button className="button-secondary button-small" onClick={handleOpenAdd} type="button">
            Add secret
          </button>
        </div>
      </div>

      {actionError ? <p className="error-banner">{actionError}</p> : null}

      {account.secrets.length === 0 ? (
        <div className="empty-state">
          <p>No secrets added yet.</p>
          <button className="button-primary" onClick={handleOpenAdd} type="button">
            Add first secret
          </button>
        </div>
      ) : (
        <div className="metadata-list">
          {[account.secrets.find(s => s.is_primary) || account.secrets[0]].filter(Boolean).map((secret) => (
            <SecretRow
              isBusy={
                isSubmitting ||
                isLoadingHistory
              }
              key={secret.id}
              onDelete={handleDeleteClick}
              onEdit={handleOpenEdit}
              onHistory={handleOpenHistory}
              secret={secret}
            />
          ))}
        </div>
      )}

      <AddSecretDialog
        errorMessage={dialogError}
        isOpen={isAddOpen}
        isSubmitting={isSubmitting}
        onClose={handleCloseAdd}
        onSubmit={handleAdd}
        defaultIsPrimary={isPrimaryByDefault && (!account.secrets || account.secrets.length === 0)}
      />

      <SecretHistoryDialog
        errorMessage={historyError}
        history={secretHistory}
        isLoading={isLoadingHistory}
        isOpen={historySecret !== null}
        onClose={handleCloseHistory}
        secret={historySecret}
        otherSecrets={account.secrets.filter(s => s.id !== (historySecret?.id))}
        onDelete={handleDeleteClick}
        onEdit={handleOpenEdit}
        onHistory={handleOpenHistory}
        initialTab={historyTab}
      />

      <EditSecretDialog
        errorMessage={dialogError}
        isOpen={editingSecret !== null}
        isSubmitting={isSubmitting}
        onClose={handleCloseEdit}
        onSubmit={handleUpdate}
        secret={editingSecret}
      />

      <DeleteSecretConfirmDialog
        account={account}
        secret={deletingSecret}
        isOpen={deletingSecret !== null}
        isDeleting={isSubmitting}
        onClose={() => setDeletingSecret(null)}
        onConfirm={handleConfirmDelete}
      />
    </section>
  );
}
