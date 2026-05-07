import { useEffect, useMemo, useState } from "react";
import type { AccountValueDto, AccountValueHistoryDto } from "../types";
import { formatDateTime } from "../utils/formatters";
import { DialogBackdrop } from "./DialogBackdrop";
import { HistoryTimeline } from "./HistoryTimeline";
import { AccountValueRow } from "./AccountValueRow";

const HISTORY_PAGE_SIZE = 4;
const OTHER_PAGE_SIZE = 3;

type ValueHistoryDialogProps = {
  errorMessage: string | null;
  history: AccountValueHistoryDto[];
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  value: AccountValueDto | null;
  otherValues?: AccountValueDto[];
  onDelete?: (value: AccountValueDto) => void;
  onEdit?: (value: AccountValueDto) => void;
  onHistory?: (value: AccountValueDto) => void;
};

export function ValueHistoryDialog({
  errorMessage,
  history,
  isLoading,
  isOpen,
  onClose,
  value,
  otherValues,
  onDelete,
  onEdit,
  onHistory,
}: ValueHistoryDialogProps) {
  const [historyPage, setHistoryPage] = useState(1);
  const [otherValuesPage, setOtherValuesPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"history" | "other">("history");

  useEffect(() => {
    if (!isOpen || !value) {
      return;
    }

    setHistoryPage(1);
    setOtherValuesPage(1);
    setActiveTab("history");
  }, [isOpen, value?.id]);

  const hasHistory = history.length > 0;
  const hasOtherValues = Boolean(otherValues && otherValues.length > 0 && onDelete && onEdit && onHistory);
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
  const otherValuesPageCount = Math.max(
    1,
    Math.ceil((otherValues?.length ?? 0) / OTHER_PAGE_SIZE),
  );
  const resolvedOtherValuesPage = Math.min(otherValuesPage, otherValuesPageCount);
  const paginatedOtherValues = useMemo(
    () =>
      (otherValues ?? []).slice(
        (resolvedOtherValuesPage - 1) * OTHER_PAGE_SIZE,
        resolvedOtherValuesPage * OTHER_PAGE_SIZE,
      ),
    [otherValues, resolvedOtherValuesPage],
  );

  if (!isOpen || !value) {
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
              <h3 style={{ margin: 0 }}>Value history</h3>
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

        {!isLoading && hasOtherValues ? (
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
              Other values
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
                            {h.old_value ? h.old_value : <span className="table-dash">-</span>}
                          </p>
                        </div>
                        <div className="history-card__field">
                          <span className="summary-label">New Value</span>
                          <p className="value-row__content">
                            {h.new_value ? h.new_value : <span className="table-dash">-</span>}
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
                  <p>No history records found for this value.</p>
                </div>
              </div>
            )}
          </section>
        ) : null}


        {hasOtherValues && activeTab === "other" ? (
          <section className="history-dialog-section">
            <div className="history-dialog-section__header">
              <h4>Other values</h4>
            </div>
            <div className="metadata-list">
              {paginatedOtherValues.map((v) => (
                <AccountValueRow
                  isBusy={isLoading}
                  key={v.id}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onHistory={onHistory}
                  value={v}
                />
              ))}
            </div>
            {otherValues!.length > OTHER_PAGE_SIZE ? (
              <div className="pagination-bar history-dialog-pagination">
                <p className="pagination-summary">
                  Page {resolvedOtherValuesPage} of {otherValuesPageCount}
                </p>
                <div className="pagination-controls">
                  <button
                    className="button-secondary button-small pagination-button"
                    disabled={resolvedOtherValuesPage === 1}
                    onClick={() => setOtherValuesPage((page) => Math.max(1, page - 1))}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="button-secondary button-small pagination-button"
                    disabled={resolvedOtherValuesPage === otherValuesPageCount}
                    onClick={() =>
                      setOtherValuesPage((page) =>
                        Math.min(otherValuesPageCount, page + 1),
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
