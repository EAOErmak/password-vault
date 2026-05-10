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

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setEditName("");
      setLocalError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

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

        <div className="details-panel" style={{ padding: "16px" }}>
          {platforms.length === 0 ? (
            <p className="muted-state">No platforms found.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {platforms.map((platform) => (
                <li
                  key={platform.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px",
                    borderBottom: "1px solid var(--color-border-soft)",
                    gap: "12px",
                  }}
                >
                  {editingId === platform.id ? (
                    <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                      <input
                        autoComplete="off"
                        disabled={isSubmitting}
                        onChange={(e) => setEditName(e.currentTarget.value)}
                        type="text"
                        value={editName}
                        style={{ flex: 1 }}
                      />
                      <button
                        className="button-primary"
                        disabled={isSubmitting || editName.trim().length === 0}
                        onClick={() => void handleSaveEdit(platform.id)}
                        type="button"
                        style={{ padding: "4px 8px" }}
                        title="Save"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className="button-secondary"
                        disabled={isSubmitting}
                        onClick={handleCancelEdit}
                        type="button"
                        style={{ padding: "4px 8px" }}
                        title="Cancel"
                      >
                        <X size={16} />
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
                          style={{ padding: "4px 8px" }}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="button-secondary button-danger"
                          disabled={isSubmitting}
                          onClick={() => void handleDelete(platform.id)}
                          type="button"
                          style={{ padding: "4px 8px" }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DialogBackdrop>
  );
}
