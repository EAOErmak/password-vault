import { useEffect, useState, useRef, type FormEvent } from "react";

type UnlockVaultPageProps = {
  errorMessage: string | null;
  initialPath: string | null;
  isSubmitting: boolean;
  onSubmit: (path: string, masterPassword: string, autoLockMs: number | null) => Promise<void>;
  onSwitchToCreate: () => void;
  statusMessage: string | null;
};

export function UnlockVaultPage({
  errorMessage,
  initialPath,
  isSubmitting,
  onSubmit,
  onSwitchToCreate,
  statusMessage,
}: UnlockVaultPageProps) {
  const [path, setPath] = useState(initialPath ?? "");
  const [masterPassword, setMasterPassword] = useState("");
  const [autoLockMs, setAutoLockMs] = useState<number | null>(5 * 60 * 1000); // Default to 5 mins
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const autoLockOptions = [
    { value: 300000, label: "5 minutes" },
    { value: 900000, label: "15 minutes" },
    { value: 1800000, label: "30 minutes" },
    { value: 3600000, label: "1 hour" },
    { value: 14400000, label: "4 hours" },
    { value: null, label: "Until app is closed" },
  ];

  useEffect(() => {
    setPath(initialPath ?? "");
  }, [initialPath]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await onSubmit(path, masterPassword, autoLockMs);
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

        <div className="field" ref={dropdownRef}>
          <span>Stay logged in for</span>
          <div className="custom-select-container">
            <button
              className="select-input custom-select-trigger"
              disabled={isSubmitting}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              type="button"
            >
              {autoLockOptions.find((opt) => opt.value === autoLockMs)?.label}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            {isDropdownOpen && !isSubmitting && (
              <ul className="custom-select-menu">
                {autoLockOptions.map((option) => (
                  <li
                    key={option.value === null ? "never" : option.value}
                    className={`custom-select-option ${autoLockMs === option.value ? "selected" : ""}`}
                    onClick={() => {
                      setAutoLockMs(option.value);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {option.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {statusMessage ? <p className="status-toast">{statusMessage}</p> : null}
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
