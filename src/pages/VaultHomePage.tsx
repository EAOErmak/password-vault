import React, { useEffect, useRef, useState } from "react";
import {
  createAccount,
  getAccountDetails,
  listAccounts,
  softDeleteAccount,
  updateAccount,
} from "../features/vault/api/accountApi";
import { createPlatform, listPlatforms, updatePlatform, deletePlatform } from "../features/vault/api/platformApi";
import { addSecret, softDeleteSecret, updateSecret } from "../features/vault/api/secretApi";
import {
  addAccountValue,
  softDeleteAccountValue,
  updateAccountValue,
} from "../features/vault/api/valueApi";
import { AccountDetailsDialog } from "../features/vault/components/AccountDetailsDialog";
import { BackupRestoreDialog } from "../features/vault/components/BackupRestoreDialog";
import { AccountList } from "../features/vault/components/AccountList";
import { CreateAccountDialog } from "../features/vault/components/CreateAccountDialog";
import { CreatePlatformDialog } from "../features/vault/components/CreatePlatformDialog";
import { EditPlatformDialog } from "../features/vault/components/EditPlatformDialog";
import { ImportTxtDialog } from "../features/vault/components/ImportTxtDialog";
import { VaultHeader } from "../features/vault/components/VaultHeader";
import { VaultLayout } from "../features/vault/components/VaultLayout";
import type {
  AccountDetails,
  AccountSummary,
  AddAccountValueRequest,
  AddSecretRequest,
  CreateAccountRequest,
  CreatePlatformRequest,
  PlatformDto,
  RestoreEncryptedBackupDto,
  UpdateAccountRequest,
  UpdateAccountValueRequest,
  UpdateSecretRequest,
} from "../features/vault/types";
import { getVaultErrorMessage } from "../lib/vault";

type VaultHomePageProps = {
  errorMessage: string | null;
  isLocking: boolean;
  onLock: () => Promise<void>;
  onRestoreComplete: (result: RestoreEncryptedBackupDto) => Promise<void> | void;
  onRestoreInterrupted: (message: string) => Promise<void> | void;
  sessionResetToken: number;
  vaultPath: string | null;
  themeToggle: React.ReactElement;
  isNameColumnEnabled: boolean;
  isPrimaryByDefault: boolean;
};

type LoadSnapshotOptions = {
  preferredAccountId?: string | null;
  seedDetails?: AccountDetails | null;
};

export type VaultHomePageRef = {
  openImport: () => void;
  openBackupRestore: () => void;
  openEditPlatform: () => void;
};

export const VaultHomePage = React.forwardRef<VaultHomePageRef, VaultHomePageProps>((props, ref) => {
  const {
    errorMessage,
    onRestoreComplete,
    onRestoreInterrupted,
    sessionResetToken,
    vaultPath,
    isNameColumnEnabled,
    isPrimaryByDefault,
  } = props;
  const snapshotRequestRef = useRef(0);
  const detailsRequestRef = useRef(0);
  const lastSessionResetTokenRef = useRef(sessionResetToken);

  const [platforms, setPlatforms] = useState<PlatformDto[]>([]);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountDetails | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isCreatePlatformOpen, setIsCreatePlatformOpen] = useState(false);
  const [isEditPlatformOpen, setIsEditPlatformOpen] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isBackupRestoreOpen, setIsBackupRestoreOpen] = useState(false);
  const [isAccountDetailsOpen, setIsAccountDetailsOpen] = useState(false);
  const [isCreatingPlatform, setIsCreatingPlatform] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [createPlatformError, setCreatePlatformError] = useState<string | null>(null);
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);
  const [editPlatformError, setEditPlatformError] = useState<string | null>(null);
  const [returnToAccountDialog, setReturnToAccountDialog] = useState(false);
  const [createAccountPlatformId, setCreateAccountPlatformId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPlatformId(null);
    setSearchQuery("");
    setSelectedAccountId(null);
    setSelectedAccount(null);
    setDataError(null);
    setDetailsError(null);
    setCreatePlatformError(null);
    setCreateAccountError(null);
    setIsCreatePlatformOpen(false);
    setIsEditPlatformOpen(false);
    setIsCreateAccountOpen(false);
    setIsImportOpen(false);
    setIsBackupRestoreOpen(false);
    setIsAccountDetailsOpen(false);
    setReturnToAccountDialog(false);
    setCreateAccountPlatformId(null);
    void loadSnapshot(null, "");
  }, [vaultPath]);

  useEffect(() => {
    if (sessionResetToken === lastSessionResetTokenRef.current) {
      return;
    }

    lastSessionResetTokenRef.current = sessionResetToken;
    snapshotRequestRef.current += 1;
    detailsRequestRef.current += 1;
    setSelectedAccountId(null);
    setSelectedAccount(null);
    setDetailsError(null);
    setIsLoadingDetails(false);
    setIsCreateAccountOpen(false);
    setIsCreatePlatformOpen(false);
    setIsImportOpen(false);
    setIsBackupRestoreOpen(false);
    setIsAccountDetailsOpen(false);
    setCreateAccountError(null);
    setCreatePlatformError(null);
    setReturnToAccountDialog(false);
  }, [sessionResetToken]);

  const requestAccountDetails = async (
    accountId: string,
    clearCurrentSelection = true,
  ): Promise<AccountDetails | null> => {
    const requestId = detailsRequestRef.current + 1;
    detailsRequestRef.current = requestId;
    setIsLoadingDetails(true);
    setDetailsError(null);

    if (clearCurrentSelection) {
      setSelectedAccount(null);
    }

    try {
      const details = await getAccountDetails(accountId);
      if (detailsRequestRef.current !== requestId) {
        return null;
      }

      setSelectedAccount(details);
      return details;
    } catch (currentError) {
      if (detailsRequestRef.current !== requestId) {
        return null;
      }

      setSelectedAccount(null);
      setDetailsError(getVaultErrorMessage(currentError));
      return null;
    } finally {
      if (detailsRequestRef.current === requestId) {
        setIsLoadingDetails(false);
      }
    }
  };

  const loadSnapshot = async (
    nextPlatformId: string | null,
    nextSearchQuery: string,
    options: LoadSnapshotOptions = {},
  ) => {
    const requestId = snapshotRequestRef.current + 1;
    snapshotRequestRef.current = requestId;
    const normalizedSearchQuery = nextSearchQuery.trim();

    setSelectedPlatformId(nextPlatformId);
    setIsLoadingSnapshot(true);
    setDataError(null);
    setDetailsError(null);

    try {
      const filter = {
        ...(nextPlatformId ? { platform_id: nextPlatformId } : {}),
        ...(normalizedSearchQuery ? { search: normalizedSearchQuery } : {}),
      };
      const [nextPlatforms, nextAccounts] = await Promise.all([
        listPlatforms(),
        Object.keys(filter).length > 0 ? listAccounts(filter) : listAccounts(),
      ]);

      if (snapshotRequestRef.current !== requestId) {
        return;
      }

      setPlatforms(nextPlatforms);
      setAccounts(nextAccounts);

      const currentSelectionId = selectedAccountId;
      const preferredAccountId = options.preferredAccountId ?? null;
      const currentSelectionVisible =
        currentSelectionId !== null &&
        nextAccounts.some((account) => account.id === currentSelectionId);
      const preferredSelectionVisible =
        preferredAccountId !== null &&
        nextAccounts.some((account) => account.id === preferredAccountId);

      const nextSelectedAccountId = preferredSelectionVisible
        ? preferredAccountId
        : currentSelectionVisible
          ? currentSelectionId
          : nextAccounts[0]?.id ?? null;

      setSelectedAccountId(nextSelectedAccountId);

      if (!nextSelectedAccountId) {
        setSelectedAccount(null);
      } else if (options.seedDetails?.id === nextSelectedAccountId) {
        setSelectedAccount(options.seedDetails);
      } else if (selectedAccount?.id !== nextSelectedAccountId) {
        setSelectedAccount(null);
      }
    } catch (currentError) {
      if (snapshotRequestRef.current !== requestId) {
        return;
      }

      setPlatforms([]);
      setAccounts([]);
      setSelectedAccountId(null);
      setSelectedAccount(null);
      setDataError(getVaultErrorMessage(currentError));
    } finally {
      if (snapshotRequestRef.current === requestId) {
        setIsLoadingSnapshot(false);
      }
    }
  };

  const handleRefresh = async () => {
    await loadSnapshot(selectedPlatformId, searchQuery, {
      preferredAccountId: selectedAccountId,
      seedDetails: selectedAccount,
    });
  };

  const refreshSelectedAccountContext = async (accountId: string) => {
    const details = await requestAccountDetails(accountId, false);
    await loadSnapshot(selectedPlatformId, searchQuery, {
      preferredAccountId: accountId,
      seedDetails: details,
    });
  };





  const handleClearSearch = () => {
    setSearchQuery("");
    void loadSnapshot(selectedPlatformId, "", {
      preferredAccountId: selectedAccountId,
      seedDetails: selectedAccount,
    });
  };

  const handlePlatformFilterChange = (platformId: string | null) => {
    void loadSnapshot(platformId, searchQuery, {
      preferredAccountId: selectedAccountId,
      seedDetails: selectedAccount,
    });
  };

  const handleSelectAccount = (accountId: string) => {
    if (selectedAccountId === accountId && selectedAccount) {
      return;
    }

    setSelectedAccountId(accountId);
    setSelectedAccount(null);
    setDetailsError(null);
  };

  const handleOpenAccountDetails = (accountId: string) => {
    if (selectedAccountId !== accountId) {
      setSelectedAccountId(accountId);
      setSelectedAccount(null);
      setDetailsError(null);
      void requestAccountDetails(accountId);
    } else if (!selectedAccount && !isLoadingDetails) {
      void requestAccountDetails(accountId);
    }

    setIsAccountDetailsOpen(true);
  };

  const handleCloseAccountDetails = () => {
    setIsAccountDetailsOpen(false);
  };

  const handleOpenCreatePlatform = (shouldReturnToAccountDialog = false) => {
    setCreatePlatformError(null);
    setReturnToAccountDialog(shouldReturnToAccountDialog);

    if (shouldReturnToAccountDialog) {
      setIsCreateAccountOpen(false);
    }

    setIsCreatePlatformOpen(true);
  };

  const handleCloseCreatePlatform = () => {
    const shouldReturn = returnToAccountDialog;

    setIsCreatePlatformOpen(false);
    setCreatePlatformError(null);
    setReturnToAccountDialog(false);

    if (shouldReturn) {
      setIsCreateAccountOpen(true);
    }
  };

  const handleOpenCreateAccount = () => {
    setCreateAccountError(null);
    setCreateAccountPlatformId(selectedPlatformId ?? platforms[0]?.id ?? null);
    setIsCreateAccountOpen(true);
  };

  const handleCloseCreateAccount = () => {
    setIsCreateAccountOpen(false);
    setCreateAccountError(null);
  };

  const handleOpenImport = () => {
    setIsImportOpen(true);
  };

  const handleCloseImport = () => {
    setIsImportOpen(false);
  };

  const handleOpenBackupRestore = () => {
    setIsBackupRestoreOpen(true);
  };

  const handleCloseBackupRestore = () => {
    setIsBackupRestoreOpen(false);
  };

  React.useImperativeHandle(ref, () => ({
    openImport: handleOpenImport,
    openBackupRestore: handleOpenBackupRestore,
    openEditPlatform: () => setIsEditPlatformOpen(true),
  }));

  const handleCreatePlatform = async (request: CreatePlatformRequest) => {
    setIsCreatingPlatform(true);
    setCreatePlatformError(null);

    try {
      const platform = await createPlatform(request);
      const shouldReturn = returnToAccountDialog;

      setReturnToAccountDialog(false);
      setCreateAccountPlatformId(platform.id);
      setIsCreatePlatformOpen(false);
      await loadSnapshot(platform.id, searchQuery);

      if (shouldReturn) {
        setIsCreateAccountOpen(true);
      }
    } catch (currentError) {
      setCreatePlatformError(getVaultErrorMessage(currentError));
    } finally {
      setIsCreatingPlatform(false);
    }
  };

  const handleUpdatePlatform = async (id: string, name: string) => {
    setEditPlatformError(null);
    try {
      await updatePlatform(id, name);
      await handleRefresh();
    } catch (error) {
      setEditPlatformError(getVaultErrorMessage(error));
      throw error;
    }
  };

  const handleDeletePlatform = async (id: string) => {
    setEditPlatformError(null);
    try {
      await deletePlatform(id);
      await handleRefresh();
    } catch (error) {
      setEditPlatformError(getVaultErrorMessage(error));
      throw error;
    }
  };

  const handleCreateAccount = async (request: CreateAccountRequest) => {
    setIsCreatingAccount(true);
    setCreateAccountError(null);

    try {
      const account = await createAccount(request);
      setIsCreateAccountOpen(false);
      setCreateAccountPlatformId(account.platform.id);
      await loadSnapshot(account.platform.id, searchQuery, {
        preferredAccountId: account.id,
        seedDetails: account,
      });
    } catch (currentError) {
      setCreateAccountError(getVaultErrorMessage(currentError));
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleAddAccountValue = async (
    accountId: string,
    request: AddAccountValueRequest,
  ) => {
    await addAccountValue(accountId, request);
    await refreshSelectedAccountContext(accountId);
  };

  const handleUpdateAccountValue = async (
    valueId: string,
    request: UpdateAccountValueRequest,
  ) => {
    if (!selectedAccountId) {
      throw new Error("No account selected.");
    }

    await updateAccountValue(valueId, request);
    await refreshSelectedAccountContext(selectedAccountId);
  };

  const handleDeleteAccountValue = async (valueId: string) => {
    if (!selectedAccountId) {
      throw new Error("No account selected.");
    }

    await softDeleteAccountValue(valueId);
    await refreshSelectedAccountContext(selectedAccountId);
  };

  const handleAddSecret = async (
    accountId: string,
    request: AddSecretRequest,
  ) => {
    await addSecret(accountId, request);
    await refreshSelectedAccountContext(accountId);
  };

  const handleUpdateSecret = async (
    secretId: string,
    request: UpdateSecretRequest,
  ) => {
    if (!selectedAccountId) {
      throw new Error("No account selected.");
    }

    await updateSecret(secretId, request);
    await refreshSelectedAccountContext(selectedAccountId);
  };

  const handleDeleteSecret = async (secretId: string) => {
    if (!selectedAccountId) {
      throw new Error("No account selected.");
    }

    await softDeleteSecret(secretId);
    await refreshSelectedAccountContext(selectedAccountId);
  };

  const handleUpdateAccountValueForAccount = async (
    accountId: string,
    valueId: string,
    request: UpdateAccountValueRequest,
  ) => {
    await updateAccountValue(valueId, request);
    await refreshSelectedAccountContext(accountId);
  };

  const handleUpdateSecretForAccount = async (
    accountId: string,
    secretId: string,
    request: UpdateSecretRequest,
  ) => {
    await updateSecret(secretId, request);
    await refreshSelectedAccountContext(accountId);
  };

  const handleDeleteAccount = async (accountId: string) => {
    await softDeleteAccount(accountId);
    setIsAccountDetailsOpen(false);
    await loadSnapshot(selectedPlatformId, searchQuery, {
      preferredAccountId: null,
      seedDetails: null,
    });
  };

  const handleUpdateAccount = async (
    accountId: string,
    request: UpdateAccountRequest,
  ) => {
    const updatedAccount = await updateAccount(accountId, request);
    const nextPlatformId = selectedPlatformId === null ? null : updatedAccount.platform.id;

    await loadSnapshot(nextPlatformId, searchQuery, {
      preferredAccountId: updatedAccount.id,
      seedDetails: updatedAccount,
    });
  };

  const selectedPlatformName =
    selectedPlatformId === null
      ? null
      : platforms.find((platform) => platform.id === selectedPlatformId)?.name ?? null;

  const headerErrorMessage = errorMessage ?? dataError;

  return (
    <>
      <VaultLayout
        header={
          <VaultHeader
            accountCount={accounts.length}
            canCreateAccount={platforms.length > 0}
            errorMessage={headerErrorMessage}
            onOpenCreateAccount={handleOpenCreateAccount}
            onOpenCreatePlatform={() => handleOpenCreatePlatform(false)}
            platformCount={platforms.length}
            vaultPath={vaultPath}
          />
        }
        main={
          <AccountList
            accounts={accounts}
            errorMessage={dataError}
            isLoading={isLoadingSnapshot}
            onAddValue={handleAddAccountValue}
            onAddSecret={handleAddSecret}
            onClearSearch={handleClearSearch}
            onOpenCreateAccount={handleOpenCreateAccount}
            onOpenDetails={handleOpenAccountDetails}
            onPlatformFilterChange={handlePlatformFilterChange}
            onSelectAccount={handleSelectAccount}
            onUpdateSecret={handleUpdateSecretForAccount}
            onUpdateValue={handleUpdateAccountValueForAccount}
            searchQuery={searchQuery}
            selectedAccountId={selectedAccountId}
            selectedPlatformId={selectedPlatformId}
            selectedPlatformName={selectedPlatformName}
            platforms={platforms}
            isNameColumnEnabled={isNameColumnEnabled}
            isPrimaryByDefault={isPrimaryByDefault}
          />
        }
      />

      <CreatePlatformDialog
        errorMessage={createPlatformError}
        isOpen={isCreatePlatformOpen}
        isSubmitting={isCreatingPlatform}
        onClose={handleCloseCreatePlatform}
        onSubmit={handleCreatePlatform}
      />

      <EditPlatformDialog
        errorMessage={editPlatformError}
        isOpen={isEditPlatformOpen}
        onClose={() => {
          setIsEditPlatformOpen(false);
          setEditPlatformError(null);
        }}
        onDeletePlatform={handleDeletePlatform}
        onUpdatePlatform={handleUpdatePlatform}
        platforms={platforms}
      />

      <CreateAccountDialog
        errorMessage={createAccountError}
        initialPlatformId={createAccountPlatformId}
        isOpen={isCreateAccountOpen}
        isSubmitting={isCreatingAccount}
        onClose={handleCloseCreateAccount}
        onOpenCreatePlatform={() => handleOpenCreatePlatform(true)}
        onSubmit={handleCreateAccount}
        platforms={platforms}
      />

      <ImportTxtDialog
        isOpen={isImportOpen}
        onClose={handleCloseImport}
        onImportComplete={handleRefresh}
      />

      <BackupRestoreDialog
        isOpen={isBackupRestoreOpen}
        onClose={handleCloseBackupRestore}
        onRestoreComplete={onRestoreComplete}
        onRestoreInterrupted={onRestoreInterrupted}
        vaultPath={vaultPath}
      />

      <AccountDetailsDialog
        account={selectedAccount}
        errorMessage={detailsError}
        isLoading={isLoadingDetails}
        isOpen={isAccountDetailsOpen}
        onAddValue={handleAddAccountValue}
        onAddSecret={handleAddSecret}
        onClose={handleCloseAccountDetails}
        onDeleteAccount={handleDeleteAccount}
        onDeleteSecret={handleDeleteSecret}
        onDeleteValue={handleDeleteAccountValue}
        onUpdateAccount={handleUpdateAccount}
        onUpdateSecret={handleUpdateSecret}
        onUpdateValue={handleUpdateAccountValue}
        platforms={platforms}
      />
    </>
  );
});
