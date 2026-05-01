import { useEffect, useState } from "react";
import type {
  AccountDetails,
  AccountValueDto,
  AddAccountValueRequest,
  UpdateAccountValueRequest,
} from "../types";
import { getVaultErrorMessage } from "../../../lib/vault";
import { AddAccountValueDialog } from "./AddAccountValueDialog";
import { AccountValueRow } from "./AccountValueRow";
import { EditAccountValueDialog } from "./EditAccountValueDialog";

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
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<AccountValueDto | null>(null);

  useEffect(() => {
    setDialogError(null);
    setActionError(null);
    setIsSubmitting(false);
    setIsAddOpen(false);
    setEditingValue(null);
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

  const handleDelete = async (value: AccountValueDto) => {
    const confirmed = window.confirm(
      `Delete "${value.label}" from ${account.name?.trim() || account.platform.name}?`,
    );
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setDialogError(null);
    setActionError(null);

    try {
      await onDeleteValue(value.id);
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
          <span>{account.values.length}</span>
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
          {account.values.map((value) => (
            <AccountValueRow
              isBusy={isSubmitting}
              key={value.id}
              onDelete={handleDelete}
              onEdit={handleOpenEdit}
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

      <EditAccountValueDialog
        errorMessage={dialogError}
        isOpen={editingValue !== null}
        isSubmitting={isSubmitting}
        onClose={handleCloseEdit}
        onSubmit={handleUpdate}
        value={editingValue}
      />
    </section>
  );
}
