import { useEffect, useRef, useState } from "react";
import "./App.css";
import { AUTO_LOCK_TIMEOUT_MS } from "./features/vault/constants/security";
import {
  createVault,
  getVaultErrorMessage,
  getVaultStatus,
  lockVault,
  normalizeVaultPath,
  readKnownVaultPath,
  storeKnownVaultPath,
  type VaultStatus,
  unlockVault,
} from "./lib/vault";
import { CreateVaultPage } from "./pages/CreateVaultPage";
import { UnlockVaultPage } from "./pages/UnlockVaultPage";
import { VaultHomePage } from "./pages/VaultHomePage";

type AppView = "loading" | "create" | "unlock" | "home";

function App() {
  const autoLockTimerRef = useRef<number | null>(null);
  const isLockingRef = useRef(false);

  const [view, setView] = useState<AppView>("loading");
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [knownVaultPath, setKnownVaultPath] = useState<string | null>(() =>
    readKnownVaultPath(),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [sessionResetToken, setSessionResetToken] = useState(0);

  useEffect(() => {
    void syncVaultStatus();
  }, []);

  useEffect(() => {
    isLockingRef.current = isBusy;
  }, [isBusy]);

  useEffect(() => {
    const clearAutoLockTimer = () => {
      if (autoLockTimerRef.current !== null) {
        window.clearTimeout(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }
    };

    if (view !== "home" || isBusy) {
      clearAutoLockTimer();
      return;
    }

    const scheduleAutoLock = () => {
      clearAutoLockTimer();
      autoLockTimerRef.current = window.setTimeout(() => {
        void handleAutoLock();
      }, AUTO_LOCK_TIMEOUT_MS);
    };

    const handleActivity = () => {
      if (isLockingRef.current) {
        return;
      }

      scheduleAutoLock();
    };

    scheduleAutoLock();

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      clearAutoLockTimer();
    };
  }, [isBusy, view]);

  const syncVaultStatus = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setView("loading");

    try {
      const status = await getVaultStatus();
      applyVaultStatus(status, readKnownVaultPath());
    } catch (error) {
      const fallbackPath = readKnownVaultPath();
      setVaultStatus(null);
      setKnownVaultPath(fallbackPath);
      setErrorMessage(getVaultErrorMessage(error));
      setView(fallbackPath ? "unlock" : "create");
    }
  };

  const applyVaultStatus = (
    status: VaultStatus,
    fallbackPath: string | null = knownVaultPath,
  ) => {
    const rememberedPath =
      storeKnownVaultPath(status.path) ?? normalizeVaultPath(fallbackPath);

    setVaultStatus(status);
    setKnownVaultPath(rememberedPath);
    setErrorMessage(null);

    if (status.is_unlocked) {
      setView("home");
      return;
    }

    setView(rememberedPath ? "unlock" : "create");
  };

  const handleCreateVault = async (path: string, masterPassword: string) => {
    setIsBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const status = await createVault(path, masterPassword);
      const fallbackPath = storeKnownVaultPath(path);
      applyVaultStatus(status, fallbackPath);
    } catch (error) {
      setErrorMessage(getVaultErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleUnlockVault = async (path: string, masterPassword: string) => {
    setIsBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const status = await unlockVault(path, masterPassword);
      const fallbackPath = storeKnownVaultPath(path);
      applyVaultStatus(status, fallbackPath);
    } catch (error) {
      setErrorMessage(getVaultErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  const lockCurrentVault = async (reason: "auto" | "manual") => {
    if (isLockingRef.current) {
      return;
    }

    isLockingRef.current = true;
    setIsBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);

    if (reason === "auto") {
      setSessionResetToken((currentToken) => currentToken + 1);
    }

    try {
      const status = await lockVault();
      applyVaultStatus(status, knownVaultPath);
    } catch (error) {
      setErrorMessage(getVaultErrorMessage(error));
    } finally {
      isLockingRef.current = false;
      setIsBusy(false);
    }
  };

  const handleLockVault = async () => {
    await lockCurrentVault("manual");
  };

  const handleAutoLock = async () => {
    await lockCurrentVault("auto");
  };

  const showCreatePage = () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setView("create");
  };

  const showUnlockPage = () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setView("unlock");
  };

  const handleRestoreComplete = async ({
    restored_path: restoredPath,
    safety_backup_path: safetyBackupPath,
  }: {
    restored_path: string;
    safety_backup_path: string;
  }) => {
    const rememberedPath = storeKnownVaultPath(restoredPath);

    setSessionResetToken((currentToken) => currentToken + 1);
    setVaultStatus({
      is_unlocked: false,
      path: null,
    });
    setKnownVaultPath(rememberedPath);
    setErrorMessage(null);
    setStatusMessage(
      `Restore complete. Unlock the restored vault to continue. Safety backup created at ${safetyBackupPath}.`,
    );
    setView("unlock");
  };

  const handleRestoreInterrupted = async (message: string) => {
    const rememberedPath = readKnownVaultPath() ?? knownVaultPath;

    setSessionResetToken((currentToken) => currentToken + 1);
    setVaultStatus({
      is_unlocked: false,
      path: null,
    });
    setKnownVaultPath(rememberedPath);
    setStatusMessage(null);
    setErrorMessage(message);
    setView(rememberedPath ? "unlock" : "create");
  };

  const currentVaultPath =
    normalizeVaultPath(vaultStatus?.path) ?? knownVaultPath ?? null;

  if (view === "home") {
    return (
      <VaultHomePage
        errorMessage={errorMessage}
        isLocking={isBusy}
        onLock={handleLockVault}
        onRestoreComplete={handleRestoreComplete}
        onRestoreInterrupted={handleRestoreInterrupted}
        sessionResetToken={sessionResetToken}
        vaultPath={currentVaultPath}
      />
    );
  }

  return (
    <main className="app-shell">
      <section className="app-panel">
        <header className="app-header">
          <p className="eyebrow">Password Vault</p>
          <h1>Vault Lifecycle</h1>
          <p className="intro">
            Create a vault, unlock an existing one, or lock the current session.
            Account management comes next.
          </p>
        </header>

        {view === "loading" ? (
          <section className="loading-state">
            <h2>Checking vault status</h2>
            <p>Loading the current session state from Tauri.</p>
          </section>
        ) : null}

        {view === "create" ? (
          <CreateVaultPage
            errorMessage={errorMessage}
            initialPath={currentVaultPath}
            isSubmitting={isBusy}
            onSubmit={handleCreateVault}
            onSwitchToUnlock={showUnlockPage}
            statusMessage={statusMessage}
          />
        ) : null}

        {view === "unlock" ? (
          <UnlockVaultPage
            errorMessage={errorMessage}
            initialPath={currentVaultPath}
            isSubmitting={isBusy}
            onSubmit={handleUnlockVault}
            onSwitchToCreate={showCreatePage}
            statusMessage={statusMessage}
          />
        ) : null}

      </section>
    </main>
  );
}

export default App;
