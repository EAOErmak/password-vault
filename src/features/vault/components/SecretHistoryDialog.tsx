import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Copy, Check, X } from "lucide-react";
import type { SecretHistoryDto, SecretMetadataDto } from "../types";
import { formatDateTime } from "../utils/formatters";
import { DialogBackdrop } from "./DialogBackdrop";
import { SecretRow } from "./SecretRow";
import { revealSecretHistory } from "../api/secretApi";

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
  initialTab?: "history" | "other";
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
  initialTab = "history",
}: SecretHistoryDialogProps) {
  const [historyPage, setHistoryPage] = useState(1);
  const [otherSecretsPage, setOtherSecretsPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"history" | "other">(initialTab);
  const [revealedHistory, setRevealedHistory] = useState<Record<string, { old?: string; new?: string }>>({});
  const [isRevealingHistory, setIsRevealingHistory] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !secret) {
      return;
    }

    setHistoryPage(1);
    setOtherSecretsPage(1);
    setActiveTab(initialTab);
    setRevealedHistory({});
    setIsRevealingHistory({});
    setCopiedField(null);
  }, [isOpen, secret?.id, initialTab]);

  const handleToggleRevealHistory = async (historyId: string) => {
    if (revealedHistory[historyId]) {
      setRevealedHistory((prev) => {
        const next = { ...prev };
        delete next[historyId];
        return next;
      });
      return;
    }

    setIsRevealingHistory((prev) => ({ ...prev, [historyId]: true }));
    try {
      const revealed = await revealSecretHistory(historyId);
      setRevealedHistory((prev) => ({
        ...prev,
        [historyId]: {
          old: revealed.old_secret_value,
          new: revealed.new_secret_value,
        },
      }));
    } catch (error) {
      console.error("Failed to reveal history", error);
    } finally {
      setIsRevealingHistory((prev) => ({ ...prev, [historyId]: false }));
    }
  };

  const handleCopyValue = async (value: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error("Failed to copy", error);
    }
  };

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
        className="dialog-card dialog-card--wide history-dialog"
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
              <h3 style={{ margin: 0 }}>
                {activeTab === "history" ? "Secret history" : "Other secrets"}
              </h3>
              <button
                className="button-ghost button-small"
                onClick={onClose}
                type="button"
                style={{ padding: "4px 8px", margin: "-8px -8px -8px 0" }}
              >
                <X />
              </button>
            </div>
          </div>
        </div>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
        {isLoading ? <p className="muted-state">Loading history...</p> : null}



        {!isLoading && activeTab === "history" ? (
          <section className="history-dialog-section">

            {hasHistory ? (
              <>
                <div className="metadata-list">
                  {paginatedHistory.map((h) => {
                    const isRevealed = Boolean(revealedHistory[h.id]);
                    const isRevealing = Boolean(isRevealingHistory[h.id]);
                    const revealedData = revealedHistory[h.id];

                    return (
                      <article className="metadata-item history-card" key={h.id}>
                        <div className="metadata-item__header">
                          <div className="value-row__title">
                            <strong>{formatDateTime(h.changed_at)}</strong>
                          </div>
                          <button
                            className="button-ghost button-small"
                            onClick={() => handleToggleRevealHistory(h.id)}
                            disabled={isRevealing}
                            title={isRevealed ? "Hide secrets" : "Reveal secrets"}
                            type="button"
                          >
                            {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>

                        <div className="history-card__comparison">
                          <div className="history-card__field">
                            <span className="summary-label">Old Value</span>
                            <div className="secret-row__masked" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span className={!isRevealed && h.has_old_value ? "secret-row__masked--value" : ""} style={{ wordBreak: "break-all" }}>
                                {h.has_old_value
                                  ? isRevealed
                                    ? revealedData?.old || "********"
                                    : "********"
                                  : <span className="table-dash">-</span>}
                              </span>
                              {h.has_old_value && isRevealed && (
                                <button
                                  className="button-ghost value-row__copy-button"
                                  onClick={() => handleCopyValue(revealedData?.old || "", `${h.id}-old`)}
                                  type="button"
                                  title="Copy old value"
                                >
                                  {copiedField === `${h.id}-old` ? (
                                    <Check className="value-row__copy-icon value-row__copy-icon--copied" size={16} />
                                  ) : (
                                    <Copy className="value-row__copy-icon" size={16} />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="history-card__field">
                            <span className="summary-label">New Value</span>
                            <div className="secret-row__masked" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span className={!isRevealed && h.has_new_value ? "secret-row__masked--value" : ""} style={{ wordBreak: "break-all" }}>
                                {h.has_new_value
                                  ? isRevealed
                                    ? revealedData?.new || "********"
                                    : "********"
                                  : <span className="table-dash">-</span>}
                              </span>
                              {h.has_new_value && isRevealed && (
                                <button
                                  className="button-ghost value-row__copy-button"
                                  onClick={() => handleCopyValue(revealedData?.new || "", `${h.id}-new`)}
                                  type="button"
                                  title="Copy new value"
                                >
                                  {copiedField === `${h.id}-new` ? (
                                    <Check className="value-row__copy-icon value-row__copy-icon--copied" size={16} />
                                  ) : (
                                    <Copy className="value-row__copy-icon" size={16} />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
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

            <div className="metadata-list">
              {paginatedOtherSecrets.map((s) => (
                <SecretRow
                  isBusy={isLoading}
                  key={s.id}
                  onDelete={onDelete!}
                  onEdit={onEdit!}
                  onHistory={onHistory as any}
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
