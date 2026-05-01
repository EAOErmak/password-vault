import { useEffect, useState } from "react";
import "./App.css";
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
  const [view, setView] = useState<AppView>("loading");
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [knownVaultPath, setKnownVaultPath] = useState<string | null>(() =>
    readKnownVaultPath(),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    void syncVaultStatus();
  }, []);

  const syncVaultStatus = async () => {
    setErrorMessage(null);
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

  const handleLockVault = async () => {
    setIsBusy(true);
    setErrorMessage(null);

    try {
      const status = await lockVault();
      applyVaultStatus(status, knownVaultPath);
    } catch (error) {
      setErrorMessage(getVaultErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  const showCreatePage = () => {
    setErrorMessage(null);
    setView("create");
  };

  const showUnlockPage = () => {
    setErrorMessage(null);
    setView("unlock");
  };

  const currentVaultPath =
    normalizeVaultPath(vaultStatus?.path) ?? knownVaultPath ?? null;

  if (view === "home") {
    return (
      <VaultHomePage
        errorMessage={errorMessage}
        isLocking={isBusy}
        onLock={handleLockVault}
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
          />
        ) : null}

        {view === "unlock" ? (
          <UnlockVaultPage
            errorMessage={errorMessage}
            initialPath={currentVaultPath}
            isSubmitting={isBusy}
            onSubmit={handleUnlockVault}
            onSwitchToCreate={showCreatePage}
          />
        ) : null}

      </section>
    </main>
  );
}

export default App;
