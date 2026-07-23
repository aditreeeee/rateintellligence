import { useMemo, useState } from "react";
import { Search, Pencil, Trash2, Plus, Check, X, AlertCircle, Info, Power } from "lucide-react";
import Modal from "../ui/Modal";
import EmptyState from "../ui/EmptyState";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";

/**
 * Generic shared-configuration management modal.
 * Backed by DataContext's masterData[listKey] — every list is company-wide and
 * shaped to map directly onto a future SQL Server table (id, companyId, name,
 * description, status, createdBy, createdDate, modifiedDate).
 */
export default function ManageListModal({ open, onClose, listKey, title, icon: Icon }) {
  const { masterData, isConfigNameTaken, addConfigItem, updateConfigItem, deleteConfigItem } = useData();
  const toast = useToast();

  const items = masterData[listKey] || [];
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const filtered = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase())),
    [items, query]
  );

  function startEdit(item) {
    setEditingId(item.id);
    setDraftName(item.name);
  }

  function saveEdit(item) {
    const name = draftName.trim();
    if (!name) return;
    if (isConfigNameTaken(listKey, name, item.id)) {
      toast({ title: "Duplicate name", message: `"${name}" already exists in this list.`, type: "error" });
      return;
    }
    updateConfigItem(listKey, item.id, { name });
    toast({ title: "Updated", message: `"${name}" saved successfully.`, type: "success" });
    setEditingId(null);
  }

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    if (isConfigNameTaken(listKey, name)) {
      toast({ title: "Duplicate name", message: `"${name}" already exists in this list.`, type: "error" });
      return;
    }
    addConfigItem(listKey, { name });
    toast({ title: "Added", message: `"${name}" is now available across the company.`, type: "success" });
    setNewName("");
    setAdding(false);
  }

  function handleDelete(item) {
    deleteConfigItem(listKey, item.id);
    toast({ title: "Deleted", message: `"${item.name}" was removed from the shared list.`, type: "info" });
    setConfirmDeleteId(null);
  }

  function toggleActive(item) {
    const next = item.status === "Active" ? "Inactive" : "Active";
    updateConfigItem(listKey, item.id, { status: next });
    toast({ title: next === "Active" ? "Activated" : "Deactivated", message: `"${item.name}" is now ${next.toLowerCase()}.`, type: "success" });
  }

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={`${items.length} record${items.length === 1 ? "" : "s"}`}>
      <div className="manage-list">
        <p className="manage-list__notice">
          <Info /> These records are shared across this company. Changes are immediately available throughout the Rate Intelligence Platform.
        </p>

        <div className="manage-list__search">
          <Search />
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="manage-list__scroll">
          {filtered.length === 0 ? (
            <EmptyState icon={Icon || Search} title="No matching records" desc={query ? "Try a different search term." : "Add the first record for this list."} />
          ) : (
            filtered.map((item) => (
              <div className="manage-list__row" key={item.id}>
                {editingId === item.id ? (
                  <>
                    <input
                      className="manage-list__edit-input"
                      value={draftName}
                      autoFocus
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(item); if (e.key === "Escape") setEditingId(null); }}
                    />
                    <button className="icon-btn btn-sm" data-tooltip="Save" onClick={() => saveEdit(item)}><Check /></button>
                    <button className="icon-btn btn-sm" data-tooltip="Cancel" onClick={() => setEditingId(null)}><X /></button>
                  </>
                ) : confirmDeleteId === item.id ? (
                  <>
                    <span className="manage-list__confirm">
                      <AlertCircle /> Delete "{item.name}"?
                    </span>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item)}>Delete</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="manage-list__name">{item.name}</span>
                    {item.status !== "Active" && <span className="badge badge-neutral">{item.status}</span>}
                    <button className="icon-btn btn-sm" data-tooltip={item.status === "Active" ? "Deactivate" : "Activate"} onClick={() => toggleActive(item)}><Power /></button>
                    <button className="icon-btn btn-sm" data-tooltip="Edit" onClick={() => startEdit(item)}><Pencil /></button>
                    <button className="icon-btn btn-sm" data-tooltip="Delete" onClick={() => setConfirmDeleteId(item.id)}><Trash2 /></button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {adding ? (
          <div className="manage-list__add-row">
            <input
              className="manage-list__edit-input"
              placeholder={`New ${title.toLowerCase().replace(/^manage /, "").replace(/s$/, "")} name...`}
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAdd}><Check /> Add</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-secondary btn-block manage-list__add-btn" onClick={() => setAdding(true)}>
            <Plus /> Add New
          </button>
        )}
      </div>
    </Modal>
  );
}
