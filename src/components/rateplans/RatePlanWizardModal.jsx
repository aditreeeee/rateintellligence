import { useEffect, useMemo, useState } from "react";
import {
  LayoutGrid, BedDouble, ShieldCheck, StickyNote, Search,
  Check, X, AlertCircle, CheckCircle2, Wand2, Settings2, Send, Plus, Trash2, IndianRupee,
} from "lucide-react";
import Modal from "../ui/Modal";
import { FieldInput, FieldTextarea } from "../ui/FieldFloat";
import ManagedSelectField from "../config/ManagedSelectField";
import ManageListModal from "../config/ManageListModal";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";

const STEPS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "rooms", label: "Room Assignment", icon: BedDouble },
  { key: "pricing", label: "Pricing", icon: IndianRupee },
  { key: "cancellation", label: "Cancellation Policy", icon: ShieldCheck },
  { key: "notes", label: "Notes", icon: StickyNote },
];

const STATUS_OPTIONS = ["Draft", "Active", "Inactive", "Archived"];
const OCCUPANCY_ROWS = [
  { key: "Single", label: "Single" },
  { key: "Double", label: "Double" },
  { key: "Triple", label: "Triple" },
  { key: "Quad", label: "Quad" },
  { key: "AdditionalAdult", label: "Additional Adult" },
  { key: "AdditionalChild", label: "Additional Child" },
];

const fmt = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);

function computeFinal(base, taxType, taxMethod, taxValue) {
  const b = Number(base) || 0;
  const v = Number(taxValue) || 0;
  const taxAmount = taxMethod === "Percentage" ? (b * v) / 100 : v;
  return taxType === "Exclusive" ? b + taxAmount : b;
}

function todayPlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function emptyPeriod(idx) {
  return {
    id: `NEW-${Date.now()}-${idx}`,
    effectiveFrom: todayPlusDays(0),
    effectiveTo: todayPlusDays(90),
    status: "Active",
    taxType: "Exclusive",
    taxMethod: "Percentage",
    taxValue: 12,
    rates: { Single: 2500, Double: 2900, Triple: 3400, Quad: 3900, AdditionalAdult: 600, AdditionalChild: 300 },
  };
}

function emptyForm() {
  return {
    name: "", mealPlanCode: "", description: "", status: "Draft",
    roomIds: [],
    pricingPeriods: [emptyPeriod(0)],
    cancellationPolicyId: "", partialRefundEnabled: false, refundType: "Percentage", refundValue: 0,
    notes: [],
  };
}

export default function RatePlanWizardModal({ open, onClose, mode = "create", propertyId, propertyName, ratePlan, onSaved, initialStep = "overview" }) {
  const { masterData, getRoomsByProperty, createRatePlan, updateRatePlan, addRatePlanNote, isRatePlanNameTaken } = useData();
  const toast = useToast();
  const isEdit = mode === "edit";

  const [step, setStep] = useState("overview");
  const [form, setForm] = useState(emptyForm());
  const [roomSearch, setRoomSearch] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  const propertyRooms = useMemo(() => getRoomsByProperty(propertyId), [getRoomsByProperty, propertyId]);

  useEffect(() => {
    if (!open) return;
    setStep(initialStep);
    setNameTouched(false);
    setNoteDraft("");
    setRoomSearch("");
    if (isEdit && ratePlan) {
      setForm({ ...emptyForm(), ...ratePlan });
    } else {
      setForm(emptyForm());
    }
  }, [open, isEdit, ratePlan, initialStep]);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const nameConflict = form.name.trim() && isRatePlanNameTaken(propertyId, form.name, isEdit ? ratePlan?.id : null);
  const canSave = form.name.trim().length > 1 && !nameConflict && form.mealPlanCode && form.roomIds.length > 0;

  function applyTemplate(t) {
    setForm((f) => ({ ...f, ...t.preset }));
    toast({ title: `Applied "${t.name}"`, message: "Meal plan, tax and cancellation policy were pre-filled.", type: "success" });
  }

  function toggleRoom(id) {
    setForm((f) => ({ ...f, roomIds: f.roomIds.includes(id) ? f.roomIds.filter((x) => x !== id) : [...f.roomIds, id] }));
  }
  function selectAllRooms() { setForm((f) => ({ ...f, roomIds: propertyRooms.map((r) => r.id) })); }
  function clearRooms() { setForm((f) => ({ ...f, roomIds: [] })); }

  function updatePeriod(idx, patch) {
    setForm((f) => ({ ...f, pricingPeriods: f.pricingPeriods.map((p, i) => (i === idx ? { ...p, ...patch } : p)) }));
  }
  function updatePeriodRate(idx, occKey, value) {
    setForm((f) => ({
      ...f,
      pricingPeriods: f.pricingPeriods.map((p, i) => (i === idx ? { ...p, rates: { ...p.rates, [occKey]: Number(value) || 0 } } : p)),
    }));
  }
  function addPeriod() {
    setForm((f) => ({ ...f, pricingPeriods: [...f.pricingPeriods, emptyPeriod(f.pricingPeriods.length)] }));
  }
  function removePeriod(idx) {
    setForm((f) => ({ ...f, pricingPeriods: f.pricingPeriods.filter((_, i) => i !== idx) }));
  }

  function handleSave() {
    if (!form.name.trim()) { toast({ title: "Rate plan name is required", type: "error" }); setStep("overview"); return; }
    if (nameConflict) { toast({ title: "Rate plan name already exists for this property", type: "error" }); setStep("overview"); return; }
    if (!form.mealPlanCode) { toast({ title: "Meal plan is required", type: "error" }); setStep("overview"); return; }
    if (form.roomIds.length === 0) { toast({ title: "Select at least one room", type: "error" }); setStep("rooms"); return; }

    const payload = {
      propertyId,
      name: form.name.trim(),
      mealPlanCode: form.mealPlanCode,
      description: form.description,
      status: form.status,
      roomIds: form.roomIds,
      pricingPeriods: form.pricingPeriods,
      cancellationPolicyId: form.cancellationPolicyId,
      partialRefundEnabled: form.partialRefundEnabled,
      refundType: form.refundType,
      refundValue: Number(form.refundValue) || 0,
    };

    if (isEdit) {
      updateRatePlan(ratePlan.id, payload);
      toast({ title: "Rate plan updated", message: `${form.name} saved successfully.`, type: "success" });
      onSaved?.(ratePlan.id);
    } else {
      const record = createRatePlan({ ...payload, notes: noteDraft.trim() ? [{ id: `NOTE-${Date.now()}`, author: "Aditree Admin", date: new Date().toISOString().slice(0, 10), text: noteDraft.trim() }] : [] });
      toast({ title: "Rate plan created", message: `${form.name} added successfully.`, type: "success" });
      onSaved?.(record.id);
    }
    onClose();
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const filteredRooms = propertyRooms.filter((r) => r.name.toLowerCase().includes(roomSearch.trim().toLowerCase()));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `Edit Rate Plan · ${ratePlan?.name}` : "Add Rate Plan"}
      subtitle={propertyName}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}><X /> Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}><Check /> {isEdit ? "Save Changes" : "Create Rate Plan"}</button>
        </>
      }
    >
      <div className="room-wizard">
        <nav className="step-nav" aria-label="Rate plan form steps">
          {STEPS.map((s, i) => (
            <div key={s.key} className={`step-nav__item ${step === s.key ? "is-active" : ""} ${i < stepIndex ? "is-done" : ""}`} onClick={() => setStep(s.key)}>
              <s.icon /> {s.label}
            </div>
          ))}
        </nav>

        <div className="room-wizard__panel">
          {step === "overview" && (
            <div className="form-stack">
              {!isEdit && (
                <div>
                  <div className="filter-panel__label" style={{ justifyContent: "space-between", display: "flex" }}>
                    <span><Wand2 /> Quick Fill from Template</span>
                    <button type="button" className="manage-inline-btn" onClick={() => setManageTemplatesOpen(true)}><Settings2 /> Manage Templates</button>
                  </div>
                  <div className="chip-group">
                    {masterData.ratePlanTemplates.filter((t) => t.status === "Active").map((t) => (
                      <span key={t.id} className="chip is-selectable" onClick={() => applyTemplate(t)}>{t.name}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="property-id-chip locked" style={{ width: "fit-content" }}>{propertyName}</div>

              <FieldInput label="Rate Plan Name" value={form.name} onChange={(v) => { set("name")(v); setNameTouched(true); }} required />
              {nameTouched && form.name.trim() && (
                <div className={`uniqueness-hint ${nameConflict ? "conflict" : "ok"}`}>
                  {nameConflict ? <AlertCircle /> : <CheckCircle2 />}
                  {nameConflict ? "A rate plan with this name already exists for this property." : "Rate plan name is unique for this property."}
                </div>
              )}

              <ManagedSelectField
                listKey="mealPlans"
                label="Meal Plan"
                required
                icon={Settings2}
                manageLabel="Manage Meal Plans"
                value={masterData.mealPlans.find((m) => m.code === form.mealPlanCode)?.id || ""}
                onChange={(id) => set("mealPlanCode")(masterData.mealPlans.find((m) => m.id === id)?.code || "")}
              />

              <FieldTextarea label="Description" value={form.description} onChange={set("description")} />

              <div className="field field-float">
                <select className={form.status ? "has-value" : ""} value={form.status} onChange={(e) => set("status")(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <label>Status</label>
              </div>
            </div>
          )}

          {step === "rooms" && (
            <div className="form-stack">
              <div className="flex items-center gap-2" style={{ justifyContent: "space-between" }}>
                <span className="badge badge-info">{form.roomIds.length} of {propertyRooms.length} rooms linked</span>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={selectAllRooms}>Select All Rooms</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={clearRooms}>Clear Selection</button>
                </div>
              </div>
              <div className="chip-multiselect__search">
                <Search />
                <input type="text" placeholder="Search rooms..." value={roomSearch} onChange={(e) => setRoomSearch(e.target.value)} />
              </div>
              {filteredRooms.length === 0 ? (
                <div className="filter-empty">No rooms found for this property.</div>
              ) : (
                <div className="filter-option-list">
                  {filteredRooms.map((r) => (
                    <label className="filter-option" key={r.id}>
                      <input type="checkbox" checked={form.roomIds.includes(r.id)} onChange={() => toggleRoom(r.id)} />
                      <span><div>{r.name}</div><div className="filter-option__meta">{r.id}</div></span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "pricing" && (
            <div className="form-stack">
              {form.pricingPeriods.map((period, idx) => (
                <div className="pricing-period-card" key={period.id}>
                  <div className="pricing-period-card__head">
                    <div className="form-grid cols-2">
                      <FieldInput label="Effective From" type="date" value={period.effectiveFrom} onChange={(v) => updatePeriod(idx, { effectiveFrom: v })} />
                      <FieldInput label="Effective To" type="date" value={period.effectiveTo} onChange={(v) => updatePeriod(idx, { effectiveTo: v })} />
                    </div>
                    {form.pricingPeriods.length > 1 && (
                      <button type="button" className="icon-btn btn-sm" data-tooltip="Remove period" onClick={() => removePeriod(idx)}><Trash2 /></button>
                    )}
                  </div>

                  <div className="form-grid cols-3" style={{ marginTop: "var(--space-4)" }}>
                    <div className="field field-float">
                      <select className="has-value" value={period.taxType} onChange={(e) => updatePeriod(idx, { taxType: e.target.value })}>
                        <option>Inclusive</option>
                        <option>Exclusive</option>
                      </select>
                      <label>Tax Type</label>
                    </div>
                    <div className="field field-float">
                      <select className="has-value" value={period.taxMethod} onChange={(e) => updatePeriod(idx, { taxMethod: e.target.value })}>
                        <option>Percentage</option>
                        <option>Fixed Amount</option>
                      </select>
                      <label>Tax Method</label>
                    </div>
                    <FieldInput label={period.taxMethod === "Percentage" ? "Tax Value (%)" : "Tax Value (₹)"} type="number" value={period.taxValue} onChange={(v) => updatePeriod(idx, { taxValue: v })} />
                  </div>

                  <div className="pricing-grid" style={{ marginTop: "var(--space-5)" }}>
                    <div className="pricing-grid__row pricing-grid__row--head">
                      <span>Occupancy</span><span>Base Rate (₹)</span><span>Tax</span><span>Final Rate</span>
                    </div>
                    {OCCUPANCY_ROWS.map((occ) => {
                      const base = period.rates[occ.key] || 0;
                      const final = computeFinal(base, period.taxType, period.taxMethod, period.taxValue);
                      return (
                        <div className="pricing-grid__row" key={occ.key}>
                          <span className="pricing-grid__label">{occ.label}</span>
                          <input
                            type="number"
                            className="pricing-grid__input"
                            value={base}
                            onChange={(e) => updatePeriodRate(idx, occ.key, e.target.value)}
                          />
                          <span className="cell-muted">{period.taxType === "Exclusive" ? `+ ${fmt(final - base)}` : "Included"}</span>
                          <span className="pricing-grid__final">{fmt(final)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={addPeriod}><Plus /> Add Another Pricing Period</button>
            </div>
          )}

          {step === "cancellation" && (
            <div className="form-stack">
              <ManagedSelectField
                listKey="cancellationPolicies"
                label="Cancellation Policy"
                icon={ShieldCheck}
                value={form.cancellationPolicyId}
                onChange={set("cancellationPolicyId")}
              />
              <div className="checkbox-row">
                <label className="switch">
                  <input type="checkbox" checked={form.partialRefundEnabled} onChange={(e) => set("partialRefundEnabled")(e.target.checked)} />
                  <span className="switch__track"></span>
                </label>
                <div style={{ fontWeight: 620 }}>Partial Refund: {form.partialRefundEnabled ? "Yes" : "No"}</div>
              </div>
              {form.partialRefundEnabled && (
                <div className="form-grid cols-2">
                  <div className="field field-float">
                    <select className="has-value" value={form.refundType} onChange={(e) => set("refundType")(e.target.value)}>
                      <option>Percentage</option>
                      <option>Amount</option>
                    </select>
                    <label>Refund Type</label>
                  </div>
                  <FieldInput label={form.refundType === "Percentage" ? "Refund Percentage (%)" : "Refund Amount (₹)"} type="number" value={form.refundValue} onChange={set("refundValue")} />
                </div>
              )}
            </div>
          )}

          {step === "notes" && (
            <div>
              {isEdit ? (
                <>
                  <div className="notes-list">
                    {(ratePlan?.notes || []).length === 0 && <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>No notes yet for this rate plan.</p>}
                    {(ratePlan?.notes || []).map((n) => (
                      <div className="note-card" key={n.id}>
                        <div className="note-card__top"><span className="note-card__author">{n.author}</span><span className="note-card__date">{n.date}</span></div>
                        <div className="note-card__text">{n.text}</div>
                      </div>
                    ))}
                  </div>
                  <div className="note-composer">
                    <textarea placeholder="Add an internal note..." value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
                    <button className="btn btn-secondary" type="button" onClick={() => { if (!noteDraft.trim()) return; addRatePlanNote(ratePlan.id, noteDraft.trim()); setNoteDraft(""); toast({ title: "Note added", type: "success" }); }}>
                      <Send /> Add
                    </button>
                  </div>
                </>
              ) : (
                <FieldTextarea label="Initial Note (optional)" value={noteDraft} onChange={setNoteDraft} />
              )}
            </div>
          )}
        </div>
      </div>

      <ManageListModal open={manageTemplatesOpen} onClose={() => setManageTemplatesOpen(false)} listKey="ratePlanTemplates" title="Manage Templates" icon={Wand2} />
    </Modal>
  );
}
