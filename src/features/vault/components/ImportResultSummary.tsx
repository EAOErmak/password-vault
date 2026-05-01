import type { ImportTxtAccountsResultDto } from "../types";

type ImportResultSummaryProps = {
  fileName: string;
  result: ImportTxtAccountsResultDto;
};

export function ImportResultSummary({ fileName, result }: ImportResultSummaryProps) {
  return (
    <div className="import-result">
      <div className="section-heading">
        <h4>Import complete</h4>
        <span>{result.accounts_imported} accounts imported</span>
      </div>

      <div className="details-grid">
        <div>
          <dt>Platforms created</dt>
          <dd>{result.platforms_created}</dd>
        </div>
        <div>
          <dt>Accounts imported</dt>
          <dd>{result.accounts_imported}</dd>
        </div>
        <div>
          <dt>Values imported</dt>
          <dd>{result.values_imported}</dd>
        </div>
        <div>
          <dt>Secrets imported</dt>
          <dd>{result.secrets_imported}</dd>
        </div>
      </div>

      <div className="warning-banner">
        Verify the imported accounts, then manually delete the original plaintext file:
        <strong> {fileName}</strong>.
      </div>
    </div>
  );
}
