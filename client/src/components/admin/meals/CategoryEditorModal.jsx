import { X } from "lucide-react";

export default function CategoryEditorModal({
  editing,
  form,
  onFormChange,
  onSubmit,
  onClose,
  busy,
}) {
  if (!editing) return null;

  return (
    <div
      className="admin-modal-backdrop catalog-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="admin-confirm-modal catalog-editor" onSubmit={onSubmit}>
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          <X />
        </button>
        <h2>{editing.id ? "Edit Category" : "Add Category"}</h2>
        <label>
          Category name
          <input
            required
            minLength="2"
            maxLength="80"
            value={form.name}
            onChange={(event) =>
              onFormChange({ ...form, name: event.target.value })
            }
          />
        </label>
        <label>
          Description
          <textarea
            maxLength="500"
            value={form.description}
            onChange={(event) =>
              onFormChange({ ...form, description: event.target.value })
            }
          />
        </label>
        <div className="confirm-actions">
          <button
            type="button"
            className="cancel-confirm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="detail-edit" disabled={busy}>
            Save Category
          </button>
        </div>
      </form>
    </div>
  );
}
