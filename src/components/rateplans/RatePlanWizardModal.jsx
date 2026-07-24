import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutGrid, BedDouble, ShieldCheck, StickyNote, Search,
  Check, X, AlertCircle, CheckCircle2, Wand2, Settings2, Send, Plus, Trash2, IndianRupee, Utensils,
} from "lucide-react";
import Modal from "../ui/Modal";
import { FieldInput, FieldTextarea, FieldSelect } from "../ui/FieldFloat";
import ManagedSelectField from "../config/ManagedSelectField";
import ManageListModal from "../config/ManageListModal";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";

const STEPS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "rooms", label: "Room Assignment", icon: BedDouble },
  { key: "mealplans", label: "Meal Plans", icon: Utensils },
  { key: "pricing", label: "Occupancy Pricing", icon: IndianRupee },
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
    name: "", description: "", status: "Draft",
    roomIds: [],
    // Rate Plan → Meal Plan(s) → Occupancy pricing. Each selected meal plan
    // owns its own independent pricing periods — a Rate Plan is not a Meal Plan.
    mealPlanCodes: [],
    mealPlanPricing: {},
    cancellationPolicyId: "", partialRefundEnabled: false, refundType: "Percentage", refundValue: 0,
    notes: [],
  };
}

export default function RatePlanWizardModal({ open, onClose, mode = "create", propertyId, propertyName, ratePlan, onSaved, initialStep = "overview", initialRoomIds = [] }) {
  const { masterData, getRoomsByProperty, createRatePlan, updateRatePlan, addRatePlanNote, isRatePlanNameTaken } = useData();
  const toast = useToast();
  const isEdit = mode === "edit";

  const [step, setStep] = useState("overview");
  const [form, setForm] = useState(emptyForm());
  const [roomSearch, setRoomSearch] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [activeMealTab, setActiveMealTab] = useState(null);

  const propertyRooms = useMemo(() => getRoomsByProperty(propertyId), [getRoomsByProperty, propertyId]);

  // initialRoomIds is a fresh array on every parent render; read it through a
  // ref so the reset effect below only fires on open/close/ratePlan changes,
  // not on every unrelated re-render of the page behind the modal.
  const initialRoomIdsRef = useRef(initialRoomIds);
  initialRoomIdsRef.current = initialRoomIds;

  useEffect(() => {
    if (!open) return;
    setStep(initialStep);
    setNameTouched(false);
    setNoteDraft("");
    setRoomSearch("");
    if (isEdit && ratePlan) {
      const mealPlanCodes = (ratePlan.mealPlans || []).map((mp) => mp.mealPlanCode);
      const mealPlanPricing = Object.fromEntries((ratePlan.mealPlans || []).map((mp) => [mp.mealPlanCode, mp.pricingPeriods]));
      setForm({ ...emptyForm(), ...ratePlan, mealPlanCodes, mealPlanPricing });
      setActiveMealTab(mealPlanCodes[0] || null);
    } else {
      // Pre-populate (but don't hard-lock) the Room selection when the user
      // already had a Property + Room chosen on the Rate Plans page before
      // clicking Add — they can still change it here if they want.
      setForm({ ...emptyForm(), roomIds: initialRoomIdsRef.current });
      setActiveMealTab(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, ratePlan, initialStep]);

  // If the room selection narrows which meal plans are allowed, drop any
  // already-picked meal plan (and its pricing) that's no longer permitted.
  useEffect(() => {
    if (!open || form.roomIds.length === 0) return;
    const rooms = propertyRooms.filter((r) => form.roomIds.includes(r.id));
    const allowed = rooms.reduce((acc, r) => {
      const roomAllowed = r.allowedMealPlanCodes || masterData.mealPlans.map((m) => m.code);
      return acc === null ? roomAllowed : acc.filter((c) => roomAllowed.includes(c));
    }, null) || [];
    const disallowed = form.mealPlanCodes.filter((c) => !allowed.includes(c));
    if (disallowed.length === 0) return;
    setForm((f) => {
      const mealPlanCodes = f.mealPlanCodes.filter((c) => !disallowed.includes(c));
      const mealPlanPricing = { ...f.mealPlanPricing };
      disallowed.forEach((c) => delete mealPlanPricing[c]);
      return { ...f, mealPlanCodes, mealPlanPricing };
    });
    setActiveMealTab((prev) => (disallowed.includes(prev) ? null : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.roomIds, propertyRooms]);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const nameConflict = form.name.trim() && isRatePlanNameTaken(propertyId, form.name, isEdit ? ratePlan?.id : null);
  const canSave = form.name.trim().length > 1 && !nameConflict && form.mealPlanCodes.length > 0 && form.roomIds.length > 0;

  function applyTemplate(t) {
    setForm((f) => {
      const code = t.preset.mealPlanCode;
      const next = { ...f, cancellationPolicyId: t.preset.cancellationPolicyId };
      if (code && !next.mealPlanCodes.includes(code)) {
        next.mealPlanCodes = [...next.mealPlanCodes, code];
      }
      if (code) {
        next.mealPlanPricing = {
          ...next.mealPlanPricing,
          [code]: (next.mealPlanPricing[code] || [emptyPeriod(0)]).map((p) => ({
            ...p,
            taxType: t.preset.taxType,
            taxMethod: t.preset.taxMethod,
            taxValue: t.preset.taxValue,
          })),
        };
        setActiveMealTab(code);
      }
      return next;
    });
    toast({ title: `Applied "${t.name}"`, message: "Meal plan, tax and cancellation policy were pre-filled.", type: "success" });
  }

  function toggleRoom(id) {
    setForm((f) => ({ ...f, roomIds: f.roomIds.includes(id) ? f.roomIds.filter((x) => x !== id) : [...f.roomIds, id] }));
  }
  function selectAllRooms() { setForm((f) => ({ ...f, roomIds: propertyRooms.map((r) => r.id) })); }
  function clearRooms() { setForm((f) => ({ ...f, roomIds: [] })); }

  function toggleMealPlan(code) {
    const isSelected = form.mealPlanCodes.includes(code);
    setForm((f) => {
      const mealPlanCodes = isSelected ? f.mealPlanCodes.filter((c) => c !== code) : [...f.mealPlanCodes, code];
      const mealPlanPricing = { ...f.mealPlanPricing };
      if (isSelected) {
        delete mealPlanPricing[code];
      } else if (!mealPlanPricing[code]) {
        mealPlanPricing[code] = [emptyPeriod(0)];
      }
      return { ...f, mealPlanCodes, mealPlanPricing };
    });
    setActiveMealTab((prev) => {
      if (isSelected) {
        const remaining = form.mealPlanCodes.filter((c) => c !== code);
        return prev === code ? remaining[0] || null : prev;
      }
      return code;
    });
  }

  function updatePeriod(code, idx, patch) {
    setForm((f) => ({
      ...f,
      mealPlanPricing: {
        ...f.mealPlanPricing,
        [code]: f.mealPlanPricing[code].map((p, i) => (i === idx ? { ...p, ...patch } : p)),
      },
    }));
  }
  function updatePeriodRate(code, idx, occKey, value) {
    setForm((f) => ({
      ...f,
      mealPlanPricing: {
        ...f.mealPlanPricing,
        [code]: f.mealPlanPricing[code].map((p, i) => (i === idx ? { ...p, rates: { ...p.rates, [occKey]: Number(value) || 0 } } : p)),
      },
    }));
  }
  function addPeriod(code) {
    setForm((f) => ({
      ...f,
      mealPlanPricing: { ...f.mealPlanPricing, [code]: [...f.mealPlanPricing[code], emptyPeriod(f.mealPlanPricing[code].length)] },
    }));
  }
  function removePeriod(code, idx) {
    setForm((f) => ({
      ...f,
      mealPlanPricing: { ...f.mealPlanPricing, [code]: f.mealPlanPricing[code].filter((_, i) => i !== idx) },
    }));
  }

  function handleSave() {
    if (!form.name.trim()) { toast({ title: "Rate plan name is required", type: "error" }); setStep("overview"); return; }
    if (nameConflict) { toast({ title: "Rate plan name already exists for this property", type: "error" }); setStep("overview"); return; }
    if (form.roomIds.length === 0) { toast({ title: "Select at least one room", type: "error" }); setStep("rooms"); return; }
    if (form.mealPlanCodes.length === 0) { toast({ title: "Select at least one meal plan", type: "error" }); setStep("mealplans"); return; }

    const payload = {
      propertyId,
      name: form.name.trim(),
      description: form.description,
      status: form.status,
      roomIds: form.roomIds,
      mealPlans: form.mealPlanCodes.map((code) => ({ mealPlanCode: code, pricingPeriods: form.mealPlanPricing[code] })),
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
      const record = createRatePlan({ ...payload, notes: noteDraft.trim() ? [{ id: `NOTE-${Date.now()}`, author: "Admin", date: new Date().toISOString().slice(0, 10), text: noteDraft.trim() }] : [] });
      toast({ title: "Rate plan created", message: `${form.name} added successfully.`, type: "success" });
      onSaved?.(record.id);
    }
    onClose();
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const filteredRooms = propertyRooms.filter((r) => r.name.toLowerCase().includes(roomSearch.trim().toLowerCase()));

  // A meal plan can only be configured on a rate plan if every currently
  // selected room allows it (Rooms module owns which meal plans exist per room).
  const selectedRooms = propertyRooms.filter((r) => form.roomIds.includes(r.id));
  const allowedMealCodes = selectedRooms.length === 0
    ? []
    : selectedRooms.reduce((acc, r) => {
        const allowed = r.allowedMealPlanCodes || masterData.mealPlans.map((m) => m.code);
        return acc === null ? allowed : acc.filter((c) => allowed.includes(c));
      }, null) || [];
  const activeMealPlans = masterData.mealPlans.filter((m) => m.status === "Active" && allowedMealCodes.includes(m.code));
  const activePeriodsForTab = activeMealTab ? form.mealPlanPricing[activeMealTab] || [] : [];

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

              <FieldInput
                label="Rate Plan Name"
                value={form.name}
                onChange={(v) => { set("name")(v); setNameTouched(true); }}
                required
                hint="Independent of any meal plan — e.g. Best Flexible Rate, Corporate Rate, Non-Refundable."
              />
              {nameTouched && form.name.trim() && (
                <div className={`uniqueness-hint ${nameConflict ? "conflict" : "ok"}`}>
                  {nameConflict ? <AlertCircle /> : <CheckCircle2 />}
                  {nameConflict ? "A rate plan with this name already exists for this property." : "Rate plan name is unique for this property."}
                </div>
              )}

              <FieldTextarea label="Description" value={form.description} onChange={set("description")} />

              <FieldSelect label="Status" value={form.status} onChange={set("status")} options={STATUS_OPTIONS} />
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

          {step === "mealplans" && (
            <div className="form-stack">
              <p className="field-hint" style={{ marginTop: 0 }}>
                A Rate Plan can bundle one or more Meal Plans. Each Meal Plan below gets its own occupancy pricing and validity periods on the next step. Only meal plans allowed on every selected room are shown here — configure that on each Room.
              </p>
              <div className="filter-panel__label"><Utensils /> Meal Plans</div>
              {selectedRooms.length === 0 ? (
                <div className="filter-empty">Select rooms on the previous step to see their allowed meal plans.</div>
              ) : activeMealPlans.length === 0 ? (
                <div className="filter-empty">The selected rooms have no meal plans in common. Adjust each room's Allowed Meal Plans first.</div>
              ) : (
                <div className="chip-multiselect__grid">
                  {activeMealPlans.map((m) => (
                    <div
                      key={m.code}
                      className={`chip-tile ${form.mealPlanCodes.includes(m.code) ? "is-active" : ""}`}
                      onClick={() => toggleMealPlan(m.code)}
                    >
                      <span className={`rp-mealplan-badge ${m.code}`} style={{ marginRight: 8 }}>{m.code}</span>
                      {m.name}
                    </div>
                  ))}
                </div>
              )}
              {selectedRooms.length > 0 && activeMealPlans.length > 0 && form.mealPlanCodes.length === 0 && (
                <div className="filter-empty">Select at least one meal plan to configure pricing.</div>
              )}
            </div>
          )}

          {step === "pricing" && (
            <div className="form-stack">
              {form.mealPlanCodes.length === 0 ? (
                <div className="filter-empty">Select meal plans on the previous step before configuring pricing.</div>
              ) : (
                <>
                  <div className="tabs" role="tablist" aria-label="Meal plan pricing tabs">
                    {form.mealPlanCodes.map((code) => (
                      <div key={code} className={`tab ${activeMealTab === code ? "is-active" : ""}`} onClick={() => setActiveMealTab(code)}>
                        <span className={`rp-mealplan-badge ${code}`} style={{ marginRight: 6 }}>{code}</span>
                        {masterData.mealPlans.find((m) => m.code === code)?.name}
                      </div>
                    ))}
                  </div>

                  {activeMealTab && activePeriodsForTab.map((period, idx) => (
                    <div className="pricing-period-card" key={period.id}>
                      <div className="pricing-period-card__head">
                        <div className="form-grid cols-2">
                          <FieldInput label="Effective From" type="date" value={period.effectiveFrom} onChange={(v) => updatePeriod(activeMealTab, idx, { effectiveFrom: v })} />
                          <FieldInput label="Effective To" type="date" value={period.effectiveTo} onChange={(v) => updatePeriod(activeMealTab, idx, { effectiveTo: v })} />
                        </div>
                        {activePeriodsForTab.length > 1 && (
                          <button type="button" className="icon-btn btn-sm" data-tooltip="Remove period" onClick={() => removePeriod(activeMealTab, idx)}><Trash2 /></button>
                        )}
                      </div>

                      <div className="form-grid cols-3" style={{ marginTop: "var(--space-4)" }}>
                        <FieldSelect
                          label="Tax Type"
                          value={period.taxType}
                          onChange={(v) => updatePeriod(activeMealTab, idx, { taxType: v })}
                          options={["Inclusive", "Exclusive"]}
                        />
                        <FieldSelect
                          label="Tax Method"
                          value={period.taxMethod}
                          onChange={(v) => updatePeriod(activeMealTab, idx, { taxMethod: v })}
                          options={["Percentage", "Fixed Amount"]}
                        />
                        <FieldInput label={period.taxMethod === "Percentage" ? "Tax Value (%)" : "Tax Value (₹)"} type="number" value={period.taxValue} onChange={(v) => updatePeriod(activeMealTab, idx, { taxValue: v })} />
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
                                onChange={(e) => updatePeriodRate(activeMealTab, idx, occ.key, e.target.value)}
                              />
                              <span className="cell-muted">{period.taxType === "Exclusive" ? `+ ${fmt(final - base)}` : "Included"}</span>
                              <span className="pricing-grid__final">{fmt(final)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {activeMealTab && (
                    <button type="button" className="btn btn-secondary" onClick={() => addPeriod(activeMealTab)}><Plus /> Add Another Pricing Period</button>
                  )}
                </>
              )}
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
                  <FieldSelect label="Refund Type" value={form.refundType} onChange={set("refundType")} options={["Percentage", "Amount"]} />
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
