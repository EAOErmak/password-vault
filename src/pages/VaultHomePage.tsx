import { useEffect, useRef, useState } from "react";
import { createAccount, getAccountDetails, listAccounts } from "../features/vault/api/accountApi";
import { createPlatform, listPlatforms } from "../features/vault/api/platformApi";
import { addSecret, softDeleteSecret, updateSecret } from "../features/vault/api/secretApi";
import {
  addAccountValue,
  softDeleteAccountValue,
  updateAccountValue,
} from "../features/vault/api/valueApi";
import { AccountDetailsPanel } from "../features/vault/components/AccountDetailsPanel";
import { BackupRestoreDialog } from "../features/vault/components/BackupRestoreDialog";
import { AccountList } from "../features/vault/components/AccountList";
import { CreateAccountDialog } from "../features/vault/components/CreateAccountDialog";
import { CreatePlatformDialog } from "../features/vault/components/CreatePlatformDialog";
import { ImportTxtDialog } from "../features/vault/components/ImportTxtDialog";
import { PlatformSidebar } from "../features/vault/components/PlatformSidebar";
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
};

type LoadSnapshotOptions = {
  preferredAccountId?: string | null;
  seedDetails?: AccountDetails | null;
};

export function VaultHomePage({
  errorMessage,
  isLocking,
  onLock,
  onRestoreComplete,
  onRestoreInterrupted,
  sessionResetToken,
  vaultPath,
}: VaultHomePageProps) {
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
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isBackupRestoreOpen, setIsBackupRestoreOpen] = useState(false);
  const [isCreatingPlatform, setIsCreatingPlatform] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [createPlatformError, setCreatePlatformError] = useState<string | null>(null);
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);
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
    setIsCreateAccountOpen(false);
    setIsImportOpen(false);
    setIsBackupRestoreOpen(false);
    setReturnToAccountDialog(false);
    setCreateAccountPlatformId(null);
    void loadSnapshot(null, "");
  }, [vaultPath]);

  useEffect(() => {
    if (!selectedAccountId) {
      detailsRequestRef.current += 1;
      setSelectedAccount(null);
      setDetailsError(null);
      setIsLoadingDetails(false);
      return;
    }

    void requestAccountDetails(selectedAccountId);
  }, [selectedAccountId]);

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

  const handleSelectPlatform = (platformId: string | null) => {
    void loadSnapshot(platformId, searchQuery);
  };

  const handleSearchChange = (nextSearchQuery: string) => {
    setSearchQuery(nextSearchQuery);
    void loadSnapshot(selectedPlatformId, nextSearchQuery, {
      preferredAccountId: selectedAccountId,
      seedDetails: selectedAccount,
    });
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    void loadSnapshot(selectedPlatformId, "", {
      preferredAccountId: selectedAccountId,
      seedDetails: selectedAccount,
    });
  };

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
    setSelectedAccount(null);
    setDetailsError(null);
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

  const selectedPlatformName =
    selectedPlatformId === null
      ? null
      : platforms.find((platform) => platform.id === selectedPlatformId)?.name ?? null;

  const headerErrorMessage = errorMessage ?? dataError;

  return (
    <>
      <VaultLayout
        details={
          <AccountDetailsPanel
            account={selectedAccount}
            errorMessage={detailsError}
            hasAccounts={accounts.length > 0}
            isLoading={isLoadingDetails}
            onAddValue={handleAddAccountValue}
            onAddSecret={handleAddSecret}
            onDeleteSecret={handleDeleteSecret}
            onDeleteValue={handleDeleteAccountValue}
            onUpdateSecret={handleUpdateSecret}
            onUpdateValue={handleUpdateAccountValue}
          />
        }
        header={
          <VaultHeader
            accountCount={accounts.length}
            canCreateAccount={platforms.length > 0}
            errorMessage={headerErrorMessage}
            isLoading={isLoadingSnapshot}
            isLocking={isLocking}
            onLock={onLock}
            onOpenBackupRestore={handleOpenBackupRestore}
            onClearSearch={handleClearSearch}
            onOpenCreateAccount={handleOpenCreateAccount}
            onOpenImport={handleOpenImport}
            onOpenCreatePlatform={() => handleOpenCreatePlatform(false)}
            onRefresh={handleRefresh}
            onSearchChange={handleSearchChange}
            platformCount={platforms.length}
            searchQuery={searchQuery}
            vaultPath={vaultPath}
          />
        }
        main={
          <AccountList
            accounts={accounts}
            errorMessage={dataError}
            isLoading={isLoadingSnapshot}
            onClearSearch={handleClearSearch}
            onOpenCreateAccount={handleOpenCreateAccount}
            onSelectAccount={handleSelectAccount}
            searchQuery={searchQuery}
            selectedAccountId={selectedAccountId}
            selectedPlatformName={selectedPlatformName}
          />
        }
        sidebar={
          <PlatformSidebar
            errorMessage={dataError}
            isLoading={isLoadingSnapshot}
            onOpenCreatePlatform={() => handleOpenCreatePlatform(false)}
            onSelectPlatform={handleSelectPlatform}
            platforms={platforms}
            selectedPlatformId={selectedPlatformId}
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
    </>
  );
}
