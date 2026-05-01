import { useEffect, useRef, useState } from "react";
import { listSecretHistory, revealSecret } from "../api/secretApi";
import type {
  AccountDetails,
  AddSecretRequest,
  RevealedSecretDto,
  SecretHistoryDto,
  SecretMetadataDto,
  UpdateSecretRequest,
} from "../types";
import { getVaultErrorMessage } from "../../../lib/vault";
import { AddSecretDialog } from "./AddSecretDialog";
import { EditSecretDialog } from "./EditSecretDialog";
import { RevealSecretDialog } from "./RevealSecretDialog";
import { SecretHistoryDialog } from "./SecretHistoryDialog";
import { SecretRow } from "./SecretRow";

type SecretsSectionProps = {
  account: AccountDetails;
  onAddSecret: (accountId: string, request: AddSecretRequest) => Promise<void>;
  onDeleteSecret: (secretId: string) => Promise<void>;
  onUpdateSecret: (secretId: string, request: UpdateSecretRequest) => Promise<void>;
};

export function SecretsSection({
  account,
  onAddSecret,
  onDeleteSecret,
  onUpdateSecret,
}: SecretsSectionProps) {
  const copyResetTimerRef = useRef<number | null>(null);
  const revealRequestRef = useRef(0);
  const historyRequestRef = useRef(0);

  const [dialogError, setDialogError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<SecretMetadataDto | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<RevealedSecretDto | null>(null);
  const [isRevealOpen, setIsRevealOpen] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);
  const [isCopyingSecretId, setIsCopyingSecretId] = useState<string | null>(null);
  const [historySecret, setHistorySecret] = useState<SecretMetadataDto | null>(null);
  const [secretHistory, setSecretHistory] = useState<SecretHistoryDto[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    historyRequestRef.current += 1;
    setDialogError(null);
    setActionError(null);
    setIsSubmitting(false);
    setIsAddOpen(false);
    setEditingSecret(null);
    setRevealedSecret(null);
    setIsRevealOpen(false);
    setIsRevealing(false);
    setRevealError(null);
    setCopiedSecretId(null);
    setIsCopyingSecretId(null);
    setHistorySecret(null);
    setSecretHistory([]);
    setHistoryError(null);
    setIsLoadingHistory(false);
  }, [account.id]);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

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

  const handleCloseReveal = () => {
    revealRequestRef.current += 1;
    setRevealError(null);
    setRevealedSecret(null);
    setIsRevealOpen(false);
    setIsRevealing(false);
  };

  const handleOpenHistory = async (secret: SecretMetadataDto) => {
    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;
    setActionError(null);
    setHistorySecret(secret);
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

  const handleDelete = async (secret: SecretMetadataDto) => {
    const confirmed = window.confirm(
      `Delete "${secret.label}" from ${account.name?.trim() || account.platform.name}?`,
    );
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setDialogError(null);
    setActionError(null);

    try {
      await onDeleteSecret(secret.id);
    } catch (error) {
      setActionError(getVaultErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReveal = async (secret: SecretMetadataDto) => {
    const requestId = revealRequestRef.current + 1;
    revealRequestRef.current = requestId;
    setRevealError(null);
    setIsRevealOpen(true);
    setIsRevealing(true);
    setRevealedSecret(null);

    try {
      const revealed = await revealSecret(secret.id);
      if (revealRequestRef.current !== requestId) {
        return;
      }

      setRevealedSecret(revealed);
    } catch (error) {
      if (revealRequestRef.current !== requestId) {
        return;
      }

      setRevealError(getVaultErrorMessage(error));
    } finally {
      if (revealRequestRef.current === requestId) {
        setIsRevealing(false);
      }
    }
  };

  const handleCopy = async (secret: SecretMetadataDto) => {
    setActionError(null);
    setIsCopyingSecretId(secret.id);

    try {
      const revealed = await revealSecret(secret.id);
      if (!navigator.clipboard) {
        throw new Error("Clipboard access is unavailable.");
      }

      // TODO: move clipboard writes to Rust so the app can clear the OS clipboard on a timer.
      await navigator.clipboard.writeText(revealed.secret_value);

      setCopiedSecretId(secret.id);
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
      copyResetTimerRef.current = window.setTimeout(() => {
        setCopiedSecretId(null);
        copyResetTimerRef.current = null;
      }, 2000);
    } catch (error) {
      setActionError(getVaultErrorMessage(error));
    } finally {
      setIsCopyingSecretId(null);
    }
  };

  return (
    <section className="details-section">
      <div className="section-heading">
        <h4>Secrets</h4>
        <div className="section-heading__actions">
          <span>{account.secrets.length}</span>
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
          {account.secrets.map((secret) => (
            <SecretRow
              copied={copiedSecretId === secret.id}
              isBusy={
                isSubmitting ||
                isRevealing ||
                isCopyingSecretId !== null ||
                isLoadingHistory
              }
              key={secret.id}
              onCopy={handleCopy}
              onDelete={handleDelete}
              onEdit={handleOpenEdit}
              onHistory={handleOpenHistory}
              onReveal={handleReveal}
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
      />

      <EditSecretDialog
        errorMessage={dialogError}
        isOpen={editingSecret !== null}
        isSubmitting={isSubmitting}
        onClose={handleCloseEdit}
        onSubmit={handleUpdate}
        secret={editingSecret}
      />

      <RevealSecretDialog
        errorMessage={revealError}
        isLoading={isRevealing}
        isOpen={isRevealOpen}
        onClose={handleCloseReveal}
        secret={revealedSecret}
      />

      <SecretHistoryDialog
        errorMessage={historyError}
        history={secretHistory}
        isLoading={isLoadingHistory}
        isOpen={historySecret !== null}
        onClose={handleCloseHistory}
        secret={historySecret}
      />
    </section>
  );
}
