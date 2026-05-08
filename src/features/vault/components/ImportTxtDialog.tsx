import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { importTxtAccounts, parseTxtImport } from "../api/importApi";
import type {
  ImportTxtAccountsResultDto,
  TxtImportAccountDraftDto,
} from "../types";
import { getVaultErrorMessage } from "../../../lib/vault";
import { DialogBackdrop } from "./DialogBackdrop";
import { ImportPreviewTable } from "./ImportPreviewTable";
import { ImportResultSummary } from "./ImportResultSummary";

type ImportTxtDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => Promise<void>;
};

type ImportStep = "select" | "preview" | "result";

export function ImportTxtDialog({
  isOpen,
  onClose,
  onImportComplete,
}: ImportTxtDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<ImportStep>("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [draftAccounts, setDraftAccounts] = useState<TxtImportAccountDraftDto[]>([]);
  const [result, setResult] = useState<ImportTxtAccountsResultDto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setStep("select");
    setSelectedFile(null);
    setFileName("");
    setDraftAccounts([]);
    setResult(null);
    setErrorMessage(null);
    setIsParsing(false);
    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isBusy = isParsing || isImporting;

  const handleParse = async () => {
    if (!selectedFile) {
      setErrorMessage("Select a .txt file to preview before import.");
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".txt")) {
      setErrorMessage("Select a .txt file to import.");
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    let content = "";
    try {
      content = await selectedFile.text();
      const parsed = await parseTxtImport(content);
      setDraftAccounts(parsed.accounts);
      setStep("preview");
    } catch (error) {
      setErrorMessage(getVaultErrorMessage(error));
    } finally {
      content = "";
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setErrorMessage(null);

    try {
      const nextResult = await importTxtAccounts({ accounts: draftAccounts });
      await onImportComplete();
      setResult(nextResult);
      setDraftAccounts([]);
      setSelectedFile(null);
      setStep("result");
    } catch (error) {
      setErrorMessage(getVaultErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  };

  const handleChangeAccount = (
    accountIndex: number,
    nextAccount: TxtImportAccountDraftDto,
  ) => {
    setDraftAccounts((currentAccounts) =>
      currentAccounts.map((account, currentIndex) =>
        currentIndex === accountIndex ? nextAccount : account,
      ),
    );
  };

  return (
    <DialogBackdrop disabled={isBusy} onClose={onClose}>
      <div aria-modal="true" className="dialog-card dialog-card--wide import-txt-dialog" role="dialog">
        {step === "select" ? (
          <div className="vault-form">
            <div className="field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="summary-label">TXT file</span>
                <button className="button-ghost button-small" disabled={isBusy} onClick={onClose} type="button" style={{ padding: "4px 8px", margin: "-8px -8px -8px 0" }}>
                  <X />
                </button>
              </div>
              <input
                accept=".txt,text/plain"
                className="import-file-input"
                disabled={isBusy}
                onChange={(event) => {
                  const nextFile = event.currentTarget.files?.[0] ?? null;
                  setSelectedFile(nextFile);
                  setFileName(nextFile?.name ?? "");
                  setErrorMessage(null);
                }}
                ref={fileInputRef}
                type="file"
              />
              <div className="import-file-picker">
                <button
                  className="button-secondary button-small"
                  disabled={isBusy}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  Choose TXT file
                </button>
                <span className="import-file-picker__name">
                  {fileName || "No file selected"}
                </span>
              </div>
            </div>

            {fileName ? <p className="field-helper">Selected file: {fileName}</p> : null}
            {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

            <div className="actions">
              <button className="button-primary" disabled={isBusy || !selectedFile} onClick={() => {
                void handleParse();
              }} type="button">
                {isParsing ? "Parsing..." : "Preview import"}
              </button>
              <button className="button-secondary" disabled={isBusy} onClick={onClose} type="button">
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {step === "preview" ? (
          <>
            <div className="warning-banner">
              Review every mapping carefully. Import runs as an all-or-nothing operation.
            </div>
            <ImportPreviewTable
              accounts={draftAccounts}
              disabled={isBusy}
              onChangeAccount={handleChangeAccount}
            />
            {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
            <div className="actions">
              <button className="button-primary" disabled={isBusy} onClick={() => {
                void handleImport();
              }} type="button">
                {isImporting ? "Importing..." : "Import into vault"}
              </button>
              <button
                className="button-secondary"
                disabled={isBusy}
                onClick={() => {
                  setStep("select");
                  setDraftAccounts([]);
                  setErrorMessage(null);
                }}
                type="button"
              >
                Back
              </button>
              <button className="button-secondary" disabled={isBusy} onClick={onClose} type="button">
                Cancel
              </button>
            </div>
          </>
        ) : null}

        {step === "result" && result ? (
          <>
            <ImportResultSummary fileName={fileName} result={result} />
            <div className="actions">
              <button className="button-primary" onClick={onClose} type="button">
                <X />
              </button>
            </div>
          </>
        ) : null}
      </div>
    </DialogBackdrop>
  );
}
