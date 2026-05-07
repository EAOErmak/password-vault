import { useEffect, useRef, useState } from "react";
import { listAccountValueHistory } from "../api/valueApi";
import type {
  AccountDetails,
  AccountValueDto,
  AccountValueHistoryDto,
  AddAccountValueRequest,
  UpdateAccountValueRequest,
} from "../types";
import { getVaultErrorMessage } from "../../../lib/vault";
import { AddAccountValueDialog } from "./AddAccountValueDialog";
import { AccountValueRow } from "./AccountValueRow";
import { EditAccountValueDialog } from "./EditAccountValueDialog";
import { ValueHistoryDialog } from "./ValueHistoryDialog";
import { DeleteValueConfirmDialog } from "./DeleteValueConfirmDialog";

type AccountValuesSectionProps = {
  account: AccountDetails;
  onAddValue: (accountId: string, request: AddAccountValueRequest) => Promise<void>;
  onDeleteValue: (valueId: string) => Promise<void>;
  onUpdateValue: (valueId: string, request: UpdateAccountValueRequest) => Promise<void>;
};

export function AccountValuesSection({
  account,
  onAddValue,
  onDeleteValue,
  onUpdateValue,
}: AccountValuesSectionProps) {
  const historyRequestRef = useRef(0);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<AccountValueDto | null>(null);
  const [historyValue, setHistoryValue] = useState<AccountValueDto | null>(null);
  const [valueHistory, setValueHistory] = useState<AccountValueHistoryDto[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const [deletingValue, setDeletingValue] = useState<AccountValueDto | null>(null);

  useEffect(() => {
    historyRequestRef.current += 1;
    setDialogError(null);
    setActionError(null);
    setIsSubmitting(false);
    setIsAddOpen(false);
    setEditingValue(null);
    setHistoryValue(null);
    setValueHistory([]);
    setHistoryError(null);
    setHistoryError(null);
    setIsLoadingHistory(false);
    setDeletingValue(null);
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

  const handleOpenEdit = (value: AccountValueDto) => {
    setDialogError(null);
    setActionError(null);
    setEditingValue(value);
  };

  const handleCloseEdit = () => {
    setDialogError(null);
    setEditingValue(null);
  };

  const handleOpenHistory = async (value: AccountValueDto) => {
    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;
    setActionError(null);
    setHistoryValue(value);
    setValueHistory([]);
    setHistoryError(null);
    setIsLoadingHistory(true);

    try {
      const history = await listAccountValueHistory(value.id);
      if (historyRequestRef.current !== requestId) {
        return;
      }

      setValueHistory(history);
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
    setHistoryValue(null);
    setValueHistory([]);
    setHistoryError(null);
    setIsLoadingHistory(false);
  };

  const handleAdd = async (request: AddAccountValueRequest) => {
    setIsSubmitting(true);
    setDialogError(null);
    setActionError(null);

    try {
      await onAddValue(account.id, request);
      setIsAddOpen(false);
    } catch (error) {
      setDialogError(getVaultErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (request: UpdateAccountValueRequest) => {
    if (!editingValue) {
      return;
    }

    setIsSubmitting(true);
    setDialogError(null);
    setActionError(null);

    try {
      await onUpdateValue(editingValue.id, request);
      setEditingValue(null);
    } catch (error) {
      setDialogError(getVaultErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (value: AccountValueDto) => {
    setDeletingValue(value);
  };

  const handleConfirmDelete = async () => {
    if (!deletingValue) return;
    
    setIsSubmitting(true);
    setDialogError(null);
    setActionError(null);

    try {
      await onDeleteValue(deletingValue.id);
      setDeletingValue(null);
    } catch (error) {
      setActionError(getVaultErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="details-section">
      <div className="section-heading">
        <h4>Values</h4>
        <div className="section-heading__actions">
          <button className="button-secondary button-small" onClick={handleOpenAdd} type="button">
            Add value
          </button>
        </div>
      </div>

      {actionError ? <p className="error-banner">{actionError}</p> : null}

      {account.values.length === 0 ? (
        <div className="empty-state">
          <p>No values added yet.</p>
          <button className="button-primary" onClick={handleOpenAdd} type="button">
            Add first value
          </button>
        </div>
      ) : (
        <div className="metadata-list">
          {[account.values.find(v => v.is_primary) || account.values[0]].filter(Boolean).map((value) => (
            <AccountValueRow
              isBusy={isSubmitting || isLoadingHistory}
              key={value.id}
              onDelete={handleDeleteClick}
              onEdit={handleOpenEdit}
              onHistory={handleOpenHistory}
              value={value}
            />
          ))}
        </div>
      )}

      <AddAccountValueDialog
        errorMessage={dialogError}
        isOpen={isAddOpen}
        isSubmitting={isSubmitting}
        onClose={handleCloseAdd}
        onSubmit={handleAdd}
      />

      <ValueHistoryDialog
        errorMessage={historyError}
        history={valueHistory}
        isLoading={isLoadingHistory}
        isOpen={historyValue !== null}
        onClose={handleCloseHistory}
        value={historyValue}
        otherValues={account.values.filter(v => v.id !== (historyValue?.id))}
        onDelete={handleDeleteClick}
        onEdit={handleOpenEdit}
        onHistory={handleOpenHistory}
      />

      <EditAccountValueDialog
        errorMessage={dialogError}
        isOpen={editingValue !== null}
        isSubmitting={isSubmitting}
        onClose={handleCloseEdit}
        onSubmit={handleUpdate}
        value={editingValue}
      />

      <DeleteValueConfirmDialog
        account={account}
        value={deletingValue}
        isOpen={deletingValue !== null}
        isDeleting={isSubmitting}
        onClose={() => setDeletingValue(null)}
        onConfirm={handleConfirmDelete}
      />
    </section>
  );
}
