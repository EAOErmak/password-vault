import { useEffect, useMemo, useState } from "react";
import type { SecretHistoryDto, SecretMetadataDto } from "../types";
import { formatDateTime } from "../utils/formatters";
import { DialogBackdrop } from "./DialogBackdrop";
import { HistoryTimeline } from "./HistoryTimeline";
import { SecretRow } from "./SecretRow";

const HISTORY_PAGE_SIZE = 4;
const OTHER_PAGE_SIZE = 3;

type SecretHistoryDialogProps = {
  errorMessage: string | null;
  history: SecretHistoryDto[];
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  secret: SecretMetadataDto | null;
  otherSecrets?: SecretMetadataDto[];
  onDelete?: (secret: SecretMetadataDto) => void;
  onEdit?: (secret: SecretMetadataDto) => void;
  onHistory?: (secret: SecretMetadataDto) => Promise<void>;
};



export function SecretHistoryDialog({
  errorMessage,
  history,
  isLoading,
  isOpen,
  onClose,
  secret,
  otherSecrets,
  onDelete,
  onEdit,
  onHistory,
}: SecretHistoryDialogProps) {
  const [historyPage, setHistoryPage] = useState(1);
  const [otherSecretsPage, setOtherSecretsPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"history" | "other">("history");

  useEffect(() => {
    if (!isOpen || !secret) {
      return;
    }

    setHistoryPage(1);
    setOtherSecretsPage(1);
    setActiveTab("history");
  }, [isOpen, secret?.id]);

  const hasHistory = history.length > 0;
  const hasOtherSecrets = Boolean(otherSecrets && otherSecrets.length > 0 && onDelete && onEdit && onHistory);
  const historyPageCount = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const resolvedHistoryPage = Math.min(historyPage, historyPageCount);
  const paginatedHistory = useMemo(
    () =>
      history.slice(
        (resolvedHistoryPage - 1) * HISTORY_PAGE_SIZE,
        resolvedHistoryPage * HISTORY_PAGE_SIZE,
      ),
    [history, resolvedHistoryPage],
  );
  const otherSecretsPageCount = Math.max(
    1,
    Math.ceil((otherSecrets?.length ?? 0) / OTHER_PAGE_SIZE),
  );
  const resolvedOtherSecretsPage = Math.min(otherSecretsPage, otherSecretsPageCount);
  const paginatedOtherSecrets = useMemo(
    () =>
      (otherSecrets ?? []).slice(
        (resolvedOtherSecretsPage - 1) * OTHER_PAGE_SIZE,
        resolvedOtherSecretsPage * OTHER_PAGE_SIZE,
      ),
    [otherSecrets, resolvedOtherSecretsPage],
  );

  if (!isOpen || !secret) {
    return null;
  }

  return (
    <DialogBackdrop onClose={onClose}>
      <div
        aria-modal="true"
        className="dialog-card dialog-card--wide"
        role="dialog"
        style={{
          background: "var(--dialog-tonal-bg)",
          boxShadow: "var(--shadow-dialog-tonal)",
          borderRadius: "24px",
        }}
      >
        <div className="dialog-header">
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={{ margin: 0 }}>Secret history</h3>
              <button
                className="button-ghost button-small"
                onClick={onClose}
                type="button"
                style={{ padding: "4px 8px", margin: "-8px -8px -8px 0" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
        {isLoading ? <p className="muted-state">Loading history...</p> : null}

        {!isLoading && hasOtherSecrets ? (
          <div className="actions" style={{ marginBottom: "20px" }}>
            <button
              className={activeTab === "history" ? "button-primary" : "button-secondary"}
              onClick={() => setActiveTab("history")}
              type="button"
            >
              Change history
            </button>
            <button
              className={activeTab === "other" ? "button-primary" : "button-secondary"}
              onClick={() => setActiveTab("other")}
              type="button"
            >
              Other secrets
            </button>
          </div>
        ) : null}

        {!isLoading && activeTab === "history" ? (
          <section className="history-dialog-section">
            <div className="history-dialog-section__header">
              <h4>Change history</h4>
            </div>
            {hasHistory ? (
              <>
                <div className="metadata-list">
                  {paginatedHistory.map((h) => (
                    <article className="metadata-item history-card" key={h.id}>
                      <div className="metadata-item__header">
                        <div className="value-row__title">
                          <strong>{formatDateTime(h.changed_at)}</strong>
                        </div>
                      </div>

                      <div className="history-card__comparison">
                        <div className="history-card__field">
                          <span className="summary-label">Old Value</span>
                          <p className="value-row__content">
                            {h.has_old_value ? "********" : <span className="table-dash">-</span>}
                          </p>
                        </div>
                        <div className="history-card__field">
                          <span className="summary-label">New Value</span>
                          <p className="value-row__content">
                            {h.has_new_value ? "********" : <span className="table-dash">-</span>}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                {history.length > HISTORY_PAGE_SIZE ? (
                  <div className="pagination-bar history-dialog-pagination">
                    <p className="pagination-summary">
                      Page {resolvedHistoryPage} of {historyPageCount}
                    </p>
                    <div className="pagination-controls">
                      <button
                        className="button-secondary button-small pagination-button"
                        disabled={resolvedHistoryPage === 1}
                        onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                        type="button"
                      >
                        Previous
                      </button>
                      <button
                        className="button-secondary button-small pagination-button"
                        disabled={resolvedHistoryPage === historyPageCount}
                        onClick={() =>
                          setHistoryPage((page) => Math.min(historyPageCount, page + 1))
                        }
                        type="button"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="history-dialog-panel">
                <div className="empty-state empty-state--compact">
                  <p>No history records found for this secret.</p>
                </div>
              </div>
            )}
          </section>
        ) : null}


        {hasOtherSecrets && activeTab === "other" ? (
          <section className="history-dialog-section">
            <div className="history-dialog-section__header">
              <h4>Other secrets</h4>
            </div>
            <div className="metadata-list">
              {paginatedOtherSecrets.map((s) => (
                <SecretRow
                  isBusy={isLoading}
                  key={s.id}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onHistory={onHistory}
                  secret={s}
                />
              ))}
            </div>
            {otherSecrets!.length > OTHER_PAGE_SIZE ? (
              <div className="pagination-bar history-dialog-pagination">
                <p className="pagination-summary">
                  Page {resolvedOtherSecretsPage} of {otherSecretsPageCount}
                </p>
                <div className="pagination-controls">
                  <button
                    className="button-secondary button-small pagination-button"
                    disabled={resolvedOtherSecretsPage === 1}
                    onClick={() => setOtherSecretsPage((page) => Math.max(1, page - 1))}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="button-secondary button-small pagination-button"
                    disabled={resolvedOtherSecretsPage === otherSecretsPageCount}
                    onClick={() =>
                      setOtherSecretsPage((page) =>
                        Math.min(otherSecretsPageCount, page + 1),
                      )
                    }
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

      </div>
    </DialogBackdrop>
  );
}
