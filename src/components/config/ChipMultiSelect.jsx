import { useMemo, useState } from "react";
import { Search, Settings2 } from "lucide-react";
import { useData } from "../../context/DataContext";
import ManageListModal from "./ManageListModal";

/**
 * Multi-select chip grid backed by a shared company configuration list
 * (DataContext masterData[listKey]). Includes search, Select All / Clear All,
 * and a "Manage" button that opens the CRUD modal for that shared list —
 * so the list can be edited in place without leaving the current form.
 */
export default function ChipMultiSelect({ listKey, label, manageLabel, selected, onChange, icon: Icon }) {
  const { masterData } = useData();
  const items = (masterData[listKey] || []).filter((i) => i.status === "Active");
  const [query, setQuery] = useState("");
  const [manageOpen, setManageOpen] = useState(false);

  const filtered = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase())),
    [items, query]
  );

  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const selectAll = () => onChange(items.map((i) => i.id));
  const clearAll = () => onChange([]);

  return (
    <div className="chip-multiselect">
      <div className="chip-multiselect__head">
        <div className="filter-panel__label" style={{ marginBottom: 0 }}>
          {Icon && <Icon />} {label} <span className="badge badge-info">{selected.length} selected</span>
        </div>
        <div className="chip-multiselect__actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={selectAll}>Select All</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>Clear All</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setManageOpen(true)}>
            <Settings2 /> {manageLabel || `Manage ${label}`}
          </button>
        </div>
      </div>

      <div className="chip-multiselect__search">
        <Search />
        <input type="text" placeholder={`Search ${label.toLowerCase()}...`} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="filter-empty">No matching records. Try Manage to add one.</div>
      ) : (
        <div className="chip-multiselect__grid">
          {filtered.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`chip-tile ${selected.includes(item.id) ? "is-active" : ""}`}
              onClick={() => toggle(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      <ManageListModal open={manageOpen} onClose={() => setManageOpen(false)} listKey={listKey} title={manageLabel || `Manage ${label}`} icon={Icon} />
    </div>
  );
}
