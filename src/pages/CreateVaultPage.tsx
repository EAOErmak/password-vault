import { useEffect, useState, type FormEvent } from "react";
import { open } from "@tauri-apps/plugin-dialog";

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
  const [vaultName, setVaultName] = useState("");
  const [vaultPath, setVaultPath] = useState(initialPath ?? "");
  const [masterPassword, setMasterPassword] = useState("");

  useEffect(() => {
    if (initialPath) {
      const separator = initialPath.includes("\\") ? "\\" : "/";
      const lastIndex = initialPath.lastIndexOf(separator);
      if (lastIndex !== -1 && initialPath.endsWith(".vault.db")) {
        setVaultPath(initialPath.substring(0, lastIndex));
        const name = initialPath.substring(lastIndex + 1).replace(".vault.db", "");
        setVaultName(name);
      } else {
        setVaultPath(initialPath);
      }
    }
  }, [initialPath]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const separator = vaultPath.includes("\\") ? "\\" : "/";
      const fullPath = vaultPath.endsWith(separator) 
        ? `${vaultPath}${vaultName}.vault.db` 
        : `${vaultPath}${separator}${vaultName}.vault.db`;

      await onSubmit(fullPath, masterPassword);
    } finally {
      setMasterPassword("");
    }
  };

  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (typeof selected === "string") {
        setVaultPath(selected);
      }
    } catch (err) {
      console.error("Failed to open dialog", err);
    }
  };

  const isSubmitDisabled =
    isSubmitting || 
    vaultName.trim().length === 0 || 
    vaultPath.trim().length === 0 || 
    masterPassword.length === 0;

  return (
    <section className="page">
      <form className="vault-form create-vault-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Vault name</span>
          <input
            autoComplete="off"
            disabled={isSubmitting}
            onChange={(event) => setVaultName(event.currentTarget.value)}
            placeholder="personal"
            spellCheck={false}
            type="text"
            value={vaultName}
          />
        </label>

        <label className="field">
          <span>Vault path</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              autoComplete="off"
              disabled={isSubmitting}
              onChange={(event) => setVaultPath(event.currentTarget.value)}
              placeholder="C:\\Vaults"
              spellCheck={false}
              type="text"
              value={vaultPath}
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
