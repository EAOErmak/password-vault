import type {
  AccountValueType,
  SecretType,
  TxtImportAccountDraftDto,
  TxtImportFieldDraftDto,
  TxtImportFieldTarget,
} from "../types";

type ImportMappingEditorProps = {
  account: TxtImportAccountDraftDto;
  accountIndex: number;
  disabled: boolean;
  onChangeAccount: (accountIndex: number, nextAccount: TxtImportAccountDraftDto) => void;
};

const TARGET_OPTIONS: Array<{ label: string; value: TxtImportFieldTarget }> = [
  { label: "Account value", value: "ACCOUNT_VALUE" },
  { label: "Secret", value: "SECRET" },
  { label: "Skip", value: "SKIP" },
];

const ACCOUNT_VALUE_OPTIONS: Array<{ label: string; value: AccountValueType }> = [
  { label: "Email", value: "EMAIL" },
  { label: "Phone number", value: "PHONE_NUMBER" },
  { label: "Nickname", value: "NICKNAME" },
  { label: "Username", value: "USERNAME" },
  { label: "Login", value: "LOGIN" },
  { label: "Custom", value: "CUSTOM" },
];

const SECRET_OPTIONS: Array<{ label: string; value: SecretType }> = [
  { label: "Password", value: "PASSWORD" },
  { label: "Backup code", value: "BACKUP_CODE" },
  { label: "Recovery key", value: "RECOVERY_KEY" },
  { label: "TOTP secret", value: "TOTP_SECRET" },
  { label: "Security answer", value: "SECURITY_ANSWER" },
  { label: "Custom secret", value: "CUSTOM_SECRET" },
];

export function ImportMappingEditor({
  account,
  accountIndex,
  disabled,
  onChangeAccount,
}: ImportMappingEditorProps) {
  const updateAccount = (patch: Partial<TxtImportAccountDraftDto>) => {
    onChangeAccount(accountIndex, {
      ...account,
      ...patch,
    });
  };

  const updateField = (
    fieldIndex: number,
    patch: Partial<TxtImportFieldDraftDto>,
  ) => {
    const nextFields = account.fields.map((field, currentIndex) =>
      currentIndex === fieldIndex ? { ...field, ...patch } : field,
    );

    updateAccount({ fields: nextFields });
  };

  const handleChangeTarget = (fieldIndex: number, target: TxtImportFieldTarget) => {
    const field = account.fields[fieldIndex];

    if (target === "ACCOUNT_VALUE") {
      updateField(fieldIndex, {
        target,
        value_type: field.value_type ?? "CUSTOM",
        secret_type: null,
      });
      return;
    }

    if (target === "SECRET") {
      updateField(fieldIndex, {
        target,
        value_type: null,
        secret_type: field.secret_type ?? "CUSTOM_SECRET",
      });
      return;
    }

    updateField(fieldIndex, {
      target,
      value_type: null,
      secret_type: null,
      is_primary: false,
    });
  };

  return (
    <article className="import-account-card">
      <div className="details-grid">
        <label className="field">
          <span>Platform</span>
          <input
            disabled={disabled}
            onChange={(event) => updateAccount({ platform_name: event.currentTarget.value })}
            type="text"
            value={account.platform_name}
          />
        </label>

        <label className="field">
          <span>Account name</span>
          <input
            disabled={disabled}
            onChange={(event) => updateAccount({ name: event.currentTarget.value || null })}
            type="text"
            value={account.name ?? ""}
          />
        </label>
      </div>

      <label className="field">
        <span>Notes</span>
        <textarea
          disabled={disabled}
          onChange={(event) => updateAccount({ notes: event.currentTarget.value || null })}
          rows={3}
          value={account.notes ?? ""}
        />
      </label>

      <div className="import-field-list">
        {account.fields.map((field, fieldIndex) => {
          const isSecretField = field.target === "SECRET";
          const isSkipped = field.target === "SKIP";
          const isMultiline =
            field.value.includes("\n") || field.secret_type === "BACKUP_CODE";

          return (
            <div className="import-field-card" key={`${field.source_key}-${fieldIndex}`}>
              <div className="import-field-card__header">
                <strong>{field.source_key}</strong>
                <span className="field-helper">Source field</span>
              </div>

              <div className="import-field-grid">
                <label className="field">
                  <span>Map to</span>
                  <select
                    className="select-input"
                    disabled={disabled}
                    onChange={(event) =>
                      handleChangeTarget(fieldIndex, event.currentTarget.value as TxtImportFieldTarget)
                    }
                    value={field.target}
                  >
                    {TARGET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {field.target === "ACCOUNT_VALUE" ? (
                  <label className="field">
                    <span>Value type</span>
                    <select
                      className="select-input"
                      disabled={disabled}
                      onChange={(event) =>
                        updateField(fieldIndex, {
                          value_type: event.currentTarget.value as AccountValueType,
                        })
                      }
                      value={field.value_type ?? "CUSTOM"}
                    >
                      {ACCOUNT_VALUE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {field.target === "SECRET" ? (
                  <label className="field">
                    <span>Secret type</span>
                    <select
                      className="select-input"
                      disabled={disabled}
                      onChange={(event) =>
                        updateField(fieldIndex, {
                          secret_type: event.currentTarget.value as SecretType,
                        })
                      }
                      value={field.secret_type ?? "CUSTOM_SECRET"}
                    >
                      {SECRET_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              {!isSkipped ? (
                <>
                  <label className="field">
                    <span>Label</span>
                    <input
                      disabled={disabled}
                      onChange={(event) => updateField(fieldIndex, { label: event.currentTarget.value })}
                      type="text"
                      value={field.label}
                    />
                  </label>

                  <label className="field">
                    <span>{isSecretField ? "Secret value" : "Value"}</span>
                    {isMultiline ? (
                      <textarea
                        disabled={disabled}
                        onChange={(event) => updateField(fieldIndex, { value: event.currentTarget.value })}
                        rows={4}
                        value={field.value}
                      />
                    ) : (
                      <input
                        disabled={disabled}
                        onChange={(event) => updateField(fieldIndex, { value: event.currentTarget.value })}
                        spellCheck={false}
                        type="text"
                        value={field.value}
                      />
                    )}
                  </label>

                  <label className="checkbox-field">
                    <input
                      checked={field.is_primary}
                      disabled={disabled}
                      onChange={(event) =>
                        updateField(fieldIndex, { is_primary: event.currentTarget.checked })
                      }
                      type="checkbox"
                    />
                    <span>Mark as primary</span>
                  </label>
                </>
              ) : (
                <p className="field-helper">
                  This field will be skipped during import.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
