import { useEffect, useState, type FormEvent } from "react";
import { save } from "@tauri-apps/plugin-dialog";

type CreateVaultPageProps = {
  errorMessage: string | null;
  initialPath: string | null;
  isSubmitting: boolean;
  onSubmit: (path: string, masterPassword: string) => Promise<void>;
  onSwitchToUnlock: () => void;
  statusMessage: string | null;
};

export function CreateVaultPage({
  errorMessage,
  initialPath,
  isSubmitting,
  onSubmit,
  onSwitchToUnlock,
  statusMessage,
}: CreateVaultPageProps) {
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

  const handleBrowse = async () => {
    try {
      const selected = await save({
        filters: [{ name: "Vault Database", extensions: ["vault.db"] }],
      });
      if (typeof selected === "string") {
        setPath(selected);
      }
    } catch (err) {
      console.error("Failed to save dialog", err);
    }
  };

  const isSubmitDisabled =
    isSubmitting || path.trim().length === 0 || masterPassword.length === 0;

  return (
    <section className="page">
      <form className="vault-form create-vault-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Vault path</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              autoComplete="off"
              disabled={isSubmitting}
              onChange={(event) => setPath(event.currentTarget.value)}
              placeholder="C:\\Vaults\\personal.vault.db"
              spellCheck={false}
              type="text"
              value={path}
            />
            <button
              type="button"
              className="button-secondary"
              onClick={handleBrowse}
              disabled={isSubmitting}
            >
              Browse
            </button>
          </div>
        </label>

        <label className="field">
          <span>Master password</span>
          <input
            autoComplete="new-password"
            disabled={isSubmitting}
            onChange={(event) => setMasterPassword(event.currentTarget.value)}
            placeholder="Enter a strong master password"
            type="password"
            value={masterPassword}
          />
        </label>

        {statusMessage ? <p className="status-toast">{statusMessage}</p> : null}
        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

        <div className="actions">
          <button className="button-primary" disabled={isSubmitDisabled} type="submit">
            {isSubmitting ? "Creating..." : "Create vault"}
          </button>
          <button
            className="button-secondary"
            disabled={isSubmitting}
            onClick={onSwitchToUnlock}
            type="button"
          >
            Unlock existing vault
          </button>
        </div>
      </form>
    </section>
  );
}
