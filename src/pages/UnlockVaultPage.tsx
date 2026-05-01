import { useEffect, useState, type FormEvent } from "react";

type UnlockVaultPageProps = {
  errorMessage: string | null;
  initialPath: string | null;
  isSubmitting: boolean;
  onSubmit: (path: string, masterPassword: string) => Promise<void>;
  onSwitchToCreate: () => void;
};

export function UnlockVaultPage({
  errorMessage,
  initialPath,
  isSubmitting,
  onSubmit,
  onSwitchToCreate,
}: UnlockVaultPageProps) {
  const [path, setPath] = useState(initialPath ?? "");
  const [masterPassword, setMasterPassword] = useState("");

  useEffect(() => {
    setPath(initialPath ?? "");
  }, [initialPath]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await onSubmit(path, masterPassword);
    } finally {
      setMasterPassword("");
    }
  };

  const isSubmitDisabled =
    isSubmitting || path.trim().length === 0 || masterPassword.length === 0;

  return (
    <section className="page">
      <div className="page-copy">
        <h2>Unlock Vault</h2>
        <p>Unlock an existing vault for the current desktop session.</p>
      </div>

      <form className="vault-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Vault path</span>
          <input
            autoComplete="off"
            disabled={isSubmitting}
            onChange={(event) => setPath(event.currentTarget.value)}
            placeholder="C:\\Vaults\\personal.vault.db"
            spellCheck={false}
            type="text"
            value={path}
          />
        </label>

        <label className="field">
          <span>Master password</span>
          <input
            autoComplete="current-password"
            disabled={isSubmitting}
            onChange={(event) => setMasterPassword(event.currentTarget.value)}
            placeholder="Enter your master password"
            type="password"
            value={masterPassword}
          />
        </label>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

        <div className="actions">
          <button className="button-primary" disabled={isSubmitDisabled} type="submit">
            {isSubmitting ? "Unlocking..." : "Unlock vault"}
          </button>
          <button
            className="button-secondary"
            disabled={isSubmitting}
            onClick={onSwitchToCreate}
            type="button"
          >
            Create new vault
          </button>
        </div>
      </form>
    </section>
  );
}
