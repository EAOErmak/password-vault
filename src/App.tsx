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
  attemptAutoUnlock,
  storeAutoUnlock,
  type VaultStatus,
  unlockVault,
} from "./lib/vault";
import {
  applyTheme,
  resolveInitialTheme,
  storeTheme,
  type AppTheme,
} from "./lib/theme";
import { CreateVaultPage } from "./pages/CreateVaultPage";
import { UnlockVaultPage } from "./pages/UnlockVaultPage";
import { VaultHomePage } from "./pages/VaultHomePage";

type AppView = "loading" | "create" | "unlock" | "home";

function App() {
  const autoLockTimerRef = useRef<number | null>(null);
  const isLockingRef = useRef(false);

  const [view, setView] = useState<AppView>("loading");
  const [autoLockTimeout, setAutoLockTimeout] = useState<number | null>(AUTO_LOCK_TIMEOUT_MS);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [knownVaultPath, setKnownVaultPath] = useState<string | null>(() =>
    readKnownVaultPath(),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [sessionResetToken, setSessionResetToken] = useState(0);
  const [theme, setTheme] = useState<AppTheme>(() => resolveInitialTheme());

  useEffect(() => {
    void syncVaultStatus();
  }, []);

  useEffect(() => {
    applyTheme(theme);
    storeTheme(theme);
  }, [theme]);

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
      if (autoLockTimeout === null) {
        return;
      }
      autoLockTimerRef.current = window.setTimeout(() => {
        void handleAutoLock();
      }, autoLockTimeout);
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
  }, [isBusy, view, autoLockTimeout]);

  const syncVaultStatus = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setView("loading");

    try {
      const autoStatus = await attemptAutoUnlock();
      if (autoStatus.is_unlocked) {
        applyVaultStatus(autoStatus, readKnownVaultPath());
        return;
      }

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

  const handleUnlockVault = async (path: string, masterPassword: string, autoLockMs: number | null) => {
    setIsBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setAutoLockTimeout(autoLockMs);

    try {
      const status = await unlockVault(path, masterPassword);
      if (autoLockMs !== null) {
        try {
          await storeAutoUnlock(path, masterPassword, autoLockMs);
        } catch (error) {
          console.error("Failed to store auto-unlock session:", error);
          setErrorMessage("Failed to store auto-unlock session in OS Keychain. You will need to enter password again next time.");
        }
      }
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

  const nextThemeLabel = theme === "dark" ? "Light theme" : "Dark theme";

  const themeToggle = (
    <button
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      aria-pressed={theme === "dark"}
      className="button-secondary theme-toggle"
      onClick={() => {
        setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
      }}
      type="button"
    >
      {nextThemeLabel}
    </button>
  );

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
        themeToggle={themeToggle}
      />
    );
  }

  const isAuthView = view === "create" || view === "unlock";

  return (
    <>
      {!isAuthView && themeToggle}
      <main className="app-shell">
        <section className={`app-panel${isAuthView ? " app-panel--auth" : ""}`}>
          <header className="app-header">
            <h1 className="app-title">Password Vault</h1>
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
    </>
  );
}

export default App;
