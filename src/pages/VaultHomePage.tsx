import { useEffect, useRef, useState } from "react";
import { createAccount, getAccountDetails, listAccounts } from "../features/vault/api/accountApi";
import { createPlatform, listPlatforms } from "../features/vault/api/platformApi";
import { AccountDetailsPanel } from "../features/vault/components/AccountDetailsPanel";
import { AccountList } from "../features/vault/components/AccountList";
import { CreateAccountDialog } from "../features/vault/components/CreateAccountDialog";
import { CreatePlatformDialog } from "../features/vault/components/CreatePlatformDialog";
import { PlatformSidebar } from "../features/vault/components/PlatformSidebar";
import { VaultHeader } from "../features/vault/components/VaultHeader";
import { VaultLayout } from "../features/vault/components/VaultLayout";
import type {
  AccountDetails,
  AccountSummary,
  CreateAccountRequest,
  CreatePlatformRequest,
  PlatformDto,
} from "../features/vault/types";
import { getVaultErrorMessage } from "../lib/vault";

type VaultHomePageProps = {
  errorMessage: string | null;
  isLocking: boolean;
  onLock: () => Promise<void>;
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
  vaultPath,
}: VaultHomePageProps) {
  const snapshotRequestRef = useRef(0);
  const detailsRequestRef = useRef(0);

  const [platforms, setPlatforms] = useState<PlatformDto[]>([]);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountDetails | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isCreatePlatformOpen, setIsCreatePlatformOpen] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isCreatingPlatform, setIsCreatingPlatform] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [createPlatformError, setCreatePlatformError] = useState<string | null>(null);
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);
  const [returnToAccountDialog, setReturnToAccountDialog] = useState(false);
  const [createAccountPlatformId, setCreateAccountPlatformId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPlatformId(null);
    setSelectedAccountId(null);
    setSelectedAccount(null);
    setDataError(null);
    setDetailsError(null);
    setCreatePlatformError(null);
    setCreateAccountError(null);
    setIsCreatePlatformOpen(false);
    setIsCreateAccountOpen(false);
    setReturnToAccountDialog(false);
    setCreateAccountPlatformId(null);
    void loadSnapshot(null);
  }, [vaultPath]);

  useEffect(() => {
    if (!selectedAccountId) {
      detailsRequestRef.current += 1;
      setSelectedAccount(null);
      setDetailsError(null);
      setIsLoadingDetails(false);
      return;
    }

    const requestId = detailsRequestRef.current + 1;
    detailsRequestRef.current = requestId;
    setIsLoadingDetails(true);
    setDetailsError(null);

    void getAccountDetails(selectedAccountId)
      .then((details) => {
        if (detailsRequestRef.current !== requestId) {
          return;
        }

        setSelectedAccount(details);
      })
      .catch((currentError: unknown) => {
        if (detailsRequestRef.current !== requestId) {
          return;
        }

        setSelectedAccount(null);
        setDetailsError(getVaultErrorMessage(currentError));
      })
      .finally(() => {
        if (detailsRequestRef.current === requestId) {
          setIsLoadingDetails(false);
        }
      });
  }, [selectedAccountId]);

  const loadSnapshot = async (
    nextPlatformId: string | null,
    options: LoadSnapshotOptions = {},
  ) => {
    const requestId = snapshotRequestRef.current + 1;
    snapshotRequestRef.current = requestId;

    setSelectedPlatformId(nextPlatformId);
    setIsLoadingSnapshot(true);
    setDataError(null);
    setDetailsError(null);

    try {
      const [nextPlatforms, nextAccounts] = await Promise.all([
        listPlatforms(),
        listAccounts(nextPlatformId ? { platform_id: nextPlatformId } : undefined),
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
    await loadSnapshot(selectedPlatformId, {
      preferredAccountId: selectedAccountId,
      seedDetails: selectedAccount,
    });
  };

  const handleSelectPlatform = (platformId: string | null) => {
    void loadSnapshot(platformId);
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

  const handleCreatePlatform = async (request: CreatePlatformRequest) => {
    setIsCreatingPlatform(true);
    setCreatePlatformError(null);

    try {
      const platform = await createPlatform(request);
      const shouldReturn = returnToAccountDialog;

      setReturnToAccountDialog(false);
      setCreateAccountPlatformId(platform.id);
      setIsCreatePlatformOpen(false);
      await loadSnapshot(platform.id);

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
      await loadSnapshot(account.platform.id, {
        preferredAccountId: account.id,
        seedDetails: account,
      });
    } catch (currentError) {
      setCreateAccountError(getVaultErrorMessage(currentError));
    } finally {
      setIsCreatingAccount(false);
    }
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
            onOpenCreateAccount={handleOpenCreateAccount}
            onOpenCreatePlatform={() => handleOpenCreatePlatform(false)}
            onRefresh={handleRefresh}
            platformCount={platforms.length}
            vaultPath={vaultPath}
          />
        }
        main={
          <AccountList
            accounts={accounts}
            errorMessage={dataError}
            isLoading={isLoadingSnapshot}
            onOpenCreateAccount={handleOpenCreateAccount}
            onSelectAccount={handleSelectAccount}
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
    </>
  );
}
