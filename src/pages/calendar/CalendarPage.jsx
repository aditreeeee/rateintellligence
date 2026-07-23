import { useEffect, useMemo, useState } from "react";
import { Building2, BedDouble, Utensils, Upload, WandSparkles, X, Check, Settings2 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import ManageListModal from "../../components/config/ManageListModal";
import { FieldInput } from "../../components/ui/FieldFloat";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const fmt = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

function daysInCurrentMonth() {
  const today = new Date();
  const count = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(today.getFullYear(), today.getMonth(), i + 1));
}
function variance(seed) {
  return Math.round(Math.sin(seed * 12.9898) * 120);
}

export default function CalendarPage() {
  const { properties, getRoomsByProperty, getRatePlansByRoom, masterData } = useData();
  const toast = useToast();
  const today = new Date();
  const dates = useMemo(() => daysInCurrentMonth(), []);

  const [propertyId, setPropertyId] = useState(properties[0]?.id);
  const rooms = useMemo(() => getRoomsByProperty(propertyId), [getRoomsByProperty, propertyId]);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [selectedMealCodes, setSelectedMealCodes] = useState(masterData.mealPlans.map((m) => m.code));

  useEffect(() => {
    setSelectedRoomIds(getRoomsByProperty(propertyId).map((r) => r.id));
  }, [propertyId, getRoomsByProperty]);

  const toggleRoom = (id) => setSelectedRoomIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleMeal = (code) => setSelectedMealCodes((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]));

  const rows = useMemo(() => {
    const out = [];
    rooms.filter((r) => selectedRoomIds.includes(r.id)).forEach((room) => {
      getRatePlansByRoom(room.id)
        .filter((rp) => selectedMealCodes.includes(rp.mealPlanCode))
        .forEach((rp) => out.push({ room, ratePlan: rp }));
    });
    return out;
  }, [rooms, selectedRoomIds, selectedMealCodes, getRatePlansByRoom]);

  const [editCell, setEditCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [manageMealsOpen, setManageMealsOpen] = useState(false);
  const [overrides, setOverrides] = useState({});

  function cellKey(rowIdx, colIdx) { return `${rowIdx}-${colIdx}`; }
  function activePeriodFor(ratePlan, date) {
    return (
      ratePlan.pricingPeriods.find((p) => new Date(p.effectiveFrom) <= date && date <= new Date(p.effectiveTo)) ||
      ratePlan.pricingPeriods[0]
    );
  }
  function rateFor(row, rowIdx, colIdx, date) {
    const key = cellKey(rowIdx, colIdx);
    if (overrides[key] != null) return overrides[key];
    const period = activePeriodFor(row.ratePlan, date);
    const base = period?.rates?.Single || 0;
    return Math.max(500, base + variance(rowIdx * 31 + colIdx));
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Calendar" }]}
        title="Rate Calendar"
        subtitle="Room + meal plan rates across dates. Click any cell to edit the rate for that day."
        actions={
          <>
            <button className="btn btn-secondary"><Upload /> Bulk Import</button>
            <button className="btn btn-primary"><WandSparkles /> Bulk Update</button>
          </>
        }
      />

      <div className="module-layout">
        <aside className="filter-panel">
          <div className="card filter-panel__section">
            <div className="filter-panel__label"><Building2 /> Property</div>
            <div className="filter-option-list">
              {properties.map((p) => (
                <div key={p.id} className={`filter-option ${p.id === propertyId ? "is-active" : ""}`} onClick={() => setPropertyId(p.id)}>
                  <span className="filter-option__avatar">{p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                  <span><div>{p.name}</div><div className="filter-option__meta">{p.id}</div></span>
                </div>
              ))}
            </div>
          </div>
          <div className="card filter-panel__section">
            <div className="filter-panel__label"><BedDouble /> Rooms</div>
            <div className="filter-option-list">
              {rooms.map((r) => (
                <label className="filter-option" key={r.id}>
                  <input type="checkbox" checked={selectedRoomIds.includes(r.id)} onChange={() => toggleRoom(r.id)} />
                  <span>{r.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="card filter-panel__section">
            <div className="filter-panel__label" style={{ justifyContent: "space-between", display: "flex", width: "100%" }}>
              <span><Utensils /> Meal Plans</span>
              <button type="button" className="manage-inline-btn" onClick={() => setManageMealsOpen(true)}><Settings2 /> Manage</button>
            </div>
            <div className="filter-chip-grid">
              {masterData.mealPlans.map((m) => (
                <span
                  key={m.code}
                  className={`chip is-selectable ${selectedMealCodes.includes(m.code) ? "is-active" : ""}`}
                  onClick={() => toggleMeal(m.code)}
                >
                  {m.code}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <div className="card">
          {rows.length === 0 ? (
            <EmptyState icon={BedDouble} title="No rate combinations selected" desc="Select at least one room and meal plan from the left panel." />
          ) : (
            <div className="rate-calendar-wrap">
              <table className="rate-calendar">
                <thead>
                  <tr>
                    <th className="corner">Room + Meal Plan</th>
                    {dates.map((d) => {
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      const isToday = d.toDateString() === today.toDateString();
                      return (
                        <th key={d.toISOString()} className={`${isWeekend ? "is-weekend" : ""} ${isToday ? "is-today" : ""}`}>
                          <span className="dow">{DOW[d.getDay()]}</span>{d.getDate()}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIdx) => (
                    <tr key={row.ratePlan.id}>
                      <th className="row-head">
                        <div className="row-head__room">{row.room.name}</div>
                        <div className="row-head__meal">
                          <span className={`rp-mealplan-badge ${row.ratePlan.mealPlanCode}`} style={{ marginRight: 6 }}>{row.ratePlan.mealPlanCode}</span>
                          {masterData.mealPlans.find((m) => m.code === row.ratePlan.mealPlanCode)?.name}
                        </div>
                      </th>
                      {dates.map((d, colIdx) => {
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        const isToday = d.toDateString() === today.toDateString();
                        const rate = rateFor(row, rowIdx, colIdx, d);
                        return (
                          <td
                            key={colIdx}
                            className={`rate-cell ${isWeekend ? "is-weekend" : ""} ${isToday ? "is-today-col" : ""}`}
                            data-tooltip={`${row.room.name} · ${row.ratePlan.mealPlanCode} · ${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}
                            onClick={() => {
                              setEditCell({ rowIdx, colIdx, row, date: d });
                              setEditValue(String(rate));
                            }}
                          >
                            {fmt(rate)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!editCell}
        onClose={() => setEditCell(null)}
        title="Edit Rate"
        subtitle={editCell ? `${editCell.row.room.name} · ${editCell.row.ratePlan.mealPlanCode} · ${editCell.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditCell(null)}><X /> Cancel</button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setOverrides((prev) => ({ ...prev, [cellKey(editCell.rowIdx, editCell.colIdx)]: Number(editValue) }));
                setEditCell(null);
                toast({ title: "Rate updated", message: "This change is local only — no backend is connected yet.", type: "success" });
              }}
            >
              <Check /> Save Rate
            </button>
          </>
        }
      >
        <FieldInput label="Rate (₹)" type="number" value={editValue} onChange={setEditValue} />
        <p className="field-hint">This is a UI placeholder — saving requires the future ASP.NET rate management API.</p>
      </Modal>

      <ManageListModal open={manageMealsOpen} onClose={() => setManageMealsOpen(false)} listKey="mealPlans" title="Manage Meal Plans" icon={Utensils} />
    </>
  );
}
