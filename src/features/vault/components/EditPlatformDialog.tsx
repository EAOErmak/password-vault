import { useEffect, useState } from "react";
import { X, Pencil, Trash2, Check } from "lucide-react";
import type { PlatformDto } from "../types";
import { DialogBackdrop } from "./DialogBackdrop";

type EditPlatformDialogProps = {
  errorMessage: string | null;
  isOpen: boolean;
  onClose: () => void;
  onDeletePlatform: (id: string) => Promise<void>;
  onUpdatePlatform: (id: string, name: string) => Promise<void>;
  platforms: PlatformDto[];
};

export function EditPlatformDialog({
  errorMessage,
  isOpen,
  onClose,
  onDeletePlatform,
  onUpdatePlatform,
  platforms,
}: EditPlatformDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setEditName("");
      setLocalError(null);
      setIsSubmitting(false);
      setSearchQuery("");
      setPage(1);
    }
  }, [isOpen]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  if (!isOpen) {
    return null;
  }

  const handleStartEdit = (platform: PlatformDto) => {
    setEditingId(platform.id);
    setEditName(platform.name);
    setLocalError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setLocalError(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (editName.trim().length === 0) {
      setLocalError("Name cannot be empty.");
      return;
    }

    setLocalError(null);
    setIsSubmitting(true);
    try {
      await onUpdatePlatform(id, editName);
      setEditingId(null);
      setEditName("");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Failed to update platform");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this platform?")) {
      return;
    }

    setLocalError(null);
    setIsSubmitting(true);
    try {
      await onDeletePlatform(id);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Failed to delete platform");
    } finally {
      setIsSubmitting(false);
    }
  };

  const PAGE_SIZE = 6;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPlatforms = (platforms || []).filter((platform) =>
    platform.name && platform.name.toLowerCase().includes(normalizedQuery)
  );
  const totalPages = Math.max(1, Math.ceil(filteredPlatforms.length / PAGE_SIZE));
  const resolvedPage = Math.min(page, totalPages);
  const paginatedPlatforms = filteredPlatforms.slice(
    (resolvedPage - 1) * PAGE_SIZE,
    resolvedPage * PAGE_SIZE
  );
  const hasPagination = filteredPlatforms.length > PAGE_SIZE;



  return (
    <DialogBackdrop onClose={onClose}>
      <div
        aria-modal="true"
        className="dialog-card dialog-card--scrollable edit-platform-dialog"
        role="dialog"
        style={{
          background: "var(--dialog-tonal-bg)",
          boxShadow: "var(--shadow-dialog-tonal)",
          borderRadius: "24px",
          maxWidth: "500px",
          width: "100%",
        }}
      >
        <div className="dialog-header">
          <div>
            <h3>Edit Platforms</h3>
          </div>
          <button className="button-ghost" onClick={onClose} type="button">
            <X />
          </button>
        </div>

        {(errorMessage || localError) ? (
          <p className="error-banner">{errorMessage || localError}</p>
        ) : null}

        <div className="details-panel" style={{ padding: "5px" }}>
          <div className="field" style={{ marginBottom: "12px" }}>
            <input
              autoComplete="off"
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              placeholder="Search platforms..."
              type="text"
              value={searchQuery}
              style={{ border: "none", outline: "none" }}
            />
          </div>

          {filteredPlatforms.length === 0 ? (
            <p className="muted-state">No platforms found.</p>
          ) : (
            <ul className="custom-select-list">
              {paginatedPlatforms.map((platform) => (
                <li
                  key={platform.id}
                  className="custom-select-option"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  {editingId === platform.id ? (
                    <div style={{
                      display: "flex",
                      gap: "6px",
                      flex: 1,
                      background: "color-mix(in srgb, var(--color-accent) 5%, var(--dialog-tonal-bg))",
                      borderRadius: "12px",
                      padding: "4px",
                      border: "1px solid var(--color-accent)",
                      alignItems: "center"
                    }}>
                      <input
                        autoComplete="off"
                        disabled={isSubmitting}
                        onChange={(e) => setEditName(e.currentTarget.value)}
                        type="text"
                        value={editName}
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          padding: "6px 10px",
                          fontSize: "inherit",
                          color: "inherit"
                        }}
                      />
                      <button
                        className="button-primary"
                        disabled={isSubmitting || editName.trim().length === 0}
                        onClick={() => void handleSaveEdit(platform.id)}
                        type="button"
                        style={{ padding: "0", height: "28px", width: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "8px" }}
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        className="button-ghost"
                        disabled={isSubmitting}
                        onClick={handleCancelEdit}
                        type="button"
                        style={{ padding: "0", height: "28px", width: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "8px" }}
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontWeight: 500 }}>{platform.name}</span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="button-secondary"
                          disabled={isSubmitting}
                          onClick={() => handleStartEdit(platform)}
                          type="button"
                          style={{
                            padding: "0",
                            width: "32px",
                            height: "32px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%"
                          }}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="button-secondary button-danger"
                          disabled={isSubmitting}
                          onClick={() => void handleDelete(platform.id)}
                          type="button"
                          style={{
                            padding: "0",
                            width: "32px",
                            height: "32px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%"
                          }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {hasPagination ? (
            <div className="custom-select-pagination" style={{ marginTop: "12px" }}>
              <button
                className="custom-select-pagination__button"
                disabled={resolvedPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                type="button"
              >
                Previous
              </button>
              <span className="custom-select-pagination__summary">
                {resolvedPage} / {totalPages}
              </span>
              <button
                className="custom-select-pagination__button"
                disabled={resolvedPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                type="button"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </DialogBackdrop>
  );
}
