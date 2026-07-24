import { useState } from "react";
import { Settings2 } from "lucide-react";
import { useData } from "../../context/DataContext";
import ManageListModal from "./ManageListModal";
import Select from "../ui/Select";

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
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div className="flex items-center gap-2" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <Select
            label={label}
            required={required}
            error={error}
            searchable={items.length > 8}
            value={value || ""}
            onChange={onChange}
            options={items.map((i) => ({ value: i.id, label: i.name }))}
          />
        </div>
        <button type="button" className="manage-inline-btn" style={{ marginTop: 22 }} onClick={() => setManageOpen(true)}>
          <Settings2 /> Manage
        </button>
      </div>
      <ManageListModal open={manageOpen} onClose={() => setManageOpen(false)} listKey={listKey} title={manageLabel || `Manage ${label}`} icon={icon} />
    </div>
  );
}
