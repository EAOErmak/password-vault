import type { TxtImportAccountDraftDto } from "../types";
import { ImportMappingEditor } from "./ImportMappingEditor";

type ImportPreviewTableProps = {
  accounts: TxtImportAccountDraftDto[];
  disabled: boolean;
  onChangeAccount: (accountIndex: number, nextAccount: TxtImportAccountDraftDto) => void;
};

export function ImportPreviewTable({
  accounts,
  disabled,
  onChangeAccount,
}: ImportPreviewTableProps) {
  return (
    <div className="import-preview">
      {accounts.map((account, accountIndex) => (
        <section className="vault-card import-preview-card" key={`${account.platform_name}-${accountIndex}`}>
          <div className="section-heading">
            <h4>
              Entry {accountIndex + 1}: {account.platform_name}
            </h4>
            <span>{account.fields.length} mapped fields</span>
          </div>

          <ImportMappingEditor
            account={account}
            accountIndex={accountIndex}
            disabled={disabled}
            onChangeAccount={onChangeAccount}
          />
        </section>
      ))}
    </div>
  );
}
