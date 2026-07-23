import { useState } from "react";
import { ChevronDown, AlertCircle, Settings2 } from "lucide-react";
import { useData } from "../../context/DataContext";
import ManageListModal from "./ManageListModal";

/**
 * Single-select dropdown backed by a shared company configuration list
 * (DataContext masterData[listKey]), value stored as the item's id.
 * Includes an inline "Manage" button to open the CRUD modal for that list.
 */
export default function ManagedSelectField({ listKey, label, value, onChange, required, error, manageLabel, icon }) {
  const { masterData } = useData();
  const [manageOpen, setManageOpen] = useState(false);
  const items = (masterData[listKey] || []).filter((i) => i.status === "Active");

  return (
    <div className="field field-float" style={{ display: "flex", flexDirection: "column" }}>
      <div className="flex items-center gap-2" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <select className={value ? "has-value" : ""} value={value || ""} onChange={(e) => onChange(e.target.value)} required={required}>
            <option value="" disabled hidden></option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
          <label>{label}{required ? " *" : ""}</label>
          <ChevronDown className="select-chevron" />
        </div>
        <button type="button" className="manage-inline-btn" style={{ marginTop: 18 }} onClick={() => setManageOpen(true)}>
          <Settings2 /> Manage
        </button>
      </div>
      {error && (
        <span className="field-error" style={{ display: "flex" }}>
          <AlertCircle /> {error}
        </span>
      )}
      <ManageListModal open={manageOpen} onClose={() => setManageOpen(false)} listKey={listKey} title={manageLabel || `Manage ${label}`} icon={icon} />
    </div>
  );
}
