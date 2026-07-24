import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Utensils, ShieldCheck, CalendarRange, Pencil, Trash2,
  BedDouble, StickyNote, Send, Plus, IndianRupee,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import RatePlanWizardModal from "../../components/rateplans/RatePlanWizardModal";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";

const fmt = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function findActivePeriod(periods) {
  const today = new Date();
  return periods.find((p) => new Date(p.effectiveFrom) <= today && today <= new Date(p.effectiveTo)) || periods[0];
}

function computeFinalDisplay(period, occKey) {
  const base = period.rates[occKey] || 0;
  const v = Number(period.taxValue) || 0;
  const taxAmount = period.taxMethod === "Percentage" ? (base * v) / 100 : v;
  return period.taxType === "Exclusive" ? base + taxAmount : base;
}

export default function RatePlanDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { getRatePlanById, getPropertyById, getRoomById, masterData, updateRatePlan, addRatePlanNote } = useData();

  const ratePlan = getRatePlanById(id);
  const [editOpen, setEditOpen] = useState(false);
  const [editStep, setEditStep] = useState("overview");
  const [noteDraft, setNoteDraft] = useState("");

  if (!ratePlan) {
    return (
      <>
        <PageHeader crumbs={[{ label: "Rate Plans", to: "/rate-plans" }]} title="Rate plan not found" />
        <div className="card"><EmptyState icon={IndianRupee} title="This rate plan doesn't exist" desc="It may have been deleted." /></div>
      </>
    );
  }

  const property = getPropertyById(ratePlan.propertyId);
  const cxlPolicy = masterData.cancellationPolicies.find((c) => c.id === ratePlan.cancellationPolicyId);
  const linkedRooms = (ratePlan.roomIds || []).map((rid) => getRoomById(rid)).filter(Boolean);
  const mealPlans = ratePlan.mealPlans || [];
  const statusBadgeClass = ratePlan.status === "Active" ? "badge-success" : ratePlan.status === "Draft" ? "badge-warning" : "badge-neutral";

  function openEditAt(stepKey) {
    setEditStep(stepKey);
    setEditOpen(true);
  }

  function removePeriod(mealPlanCode, periodId) {
    const mp = mealPlans.find((m) => m.mealPlanCode === mealPlanCode);
    const remaining = mp.pricingPeriods.filter((p) => p.id !== periodId);
    if (remaining.length === 0) {
      toast({ title: "Each meal plan needs at least one pricing period", type: "error" });
      return;
    }
    updateRatePlan(ratePlan.id, {
      mealPlans: mealPlans.map((m) => (m.mealPlanCode === mealPlanCode ? { ...m, pricingPeriods: remaining } : m)),
    });
    toast({ title: "Pricing period removed", type: "info" });
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Rate Plans", to: "/rate-plans" }, { label: ratePlan.name }]}
        title={<>{ratePlan.name} <span className={`badge ${statusBadgeClass}`} style={{ verticalAlign: "middle", marginLeft: 8 }}>{ratePlan.status}</span></>}
        subtitle={`${property?.name || ""} · ${ratePlan.id}`}
        actions={<button className="btn btn-primary" onClick={() => openEditAt("overview")}><Pencil /> Edit Rate Plan</button>}
      />

      <div className="form-stack">
        <section className="card">
          <div className="card__header">
            <div className="card__title"><BedDouble style={{ width: 15, height: 15, display: "inline", marginRight: 6 }} />Linked Rooms</div>
            <button className="manage-inline-btn" onClick={() => openEditAt("rooms")}><Pencil /> Manage Rooms</button>
          </div>
          <div className="card__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {ratePlan.description && (
              <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)", lineHeight: "var(--lh-normal)", margin: 0 }}>
                {ratePlan.description}
              </p>
            )}
            {linkedRooms.length === 0 ? <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>No rooms linked yet.</p> : (
              <div className="chip-group">{linkedRooms.map((r) => <span className="chip" key={r.id}>{r.name}</span>)}</div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <div className="card__title"><Utensils style={{ width: 15, height: 15, display: "inline", marginRight: 6 }} />Meal Plans &amp; Occupancy Pricing</div>
            <button className="manage-inline-btn" onClick={() => openEditAt("mealplans")}><Pencil /> Manage Meal Plans</button>
          </div>
          <div className="card__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {mealPlans.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>No meal plans configured yet.</p>
            ) : (
              mealPlans.map((mp) => {
                const meal = masterData.mealPlans.find((m) => m.code === mp.mealPlanCode);
                const activePeriod = findActivePeriod(mp.pricingPeriods);
                return (
                  <div className="rp-mealplan-block" key={mp.mealPlanCode}>
                    <div className="rp-mealplan-block__head">
                      <span className={`rp-mealplan-badge ${mp.mealPlanCode}`}>{mp.mealPlanCode}</span>
                      <div>
                        <div className="rp-mealplan-block__title">{meal?.name || mp.mealPlanCode}</div>
                        <div className="rp-mealplan-block__desc">{meal?.description}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      {mp.pricingPeriods.map((p) => (
                        <div className="pricing-period-summary" key={p.id}>
                          <div className="pricing-period-summary__dates">
                            <CalendarRange style={{ width: 14, height: 14 }} /> {fmtDate(p.effectiveFrom)} → {fmtDate(p.effectiveTo)}
                          </div>
                          <span className="badge badge-info">{p.taxType} · {p.taxMethod === "Percentage" ? `${p.taxValue}%` : fmt(p.taxValue)}</span>
                          <span className={p === activePeriod ? "badge badge-success" : "badge badge-neutral"}>{p === activePeriod ? "Current" : "Scheduled"}</span>
                          <span className="pricing-period-summary__rate">{fmt(computeFinalDisplay(p, "Double"))} <span className="text-muted" style={{ fontSize: "var(--fs-xs)", fontWeight: 500 }}>/ Double</span></span>
                          <button className="icon-btn btn-sm" data-tooltip="Edit" onClick={() => openEditAt("pricing")}><Pencil /></button>
                          <button className="icon-btn btn-sm" data-tooltip="Delete" onClick={() => removePeriod(mp.mealPlanCode, p.id)}><Trash2 /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
            <button className="btn btn-secondary" style={{ width: "fit-content" }} onClick={() => openEditAt("mealplans")}><Plus /> Add Meal Plan</button>
          </div>
        </section>

        <section className="card">
          <div className="card__header"><div className="card__title"><ShieldCheck style={{ width: 15, height: 15, display: "inline", marginRight: 6 }} />Cancellation Policy</div></div>
          <div className="card__body">
            <div className="summary-card__row"><span className="summary-card__label">Policy</span><span className="summary-card__value">{cxlPolicy?.name || "—"}</span></div>
            <div className="summary-card__row"><span className="summary-card__label">Partial Refund</span><span className="summary-card__value">{ratePlan.partialRefundEnabled ? "Yes" : "No"}</span></div>
            {ratePlan.partialRefundEnabled && (
              <div className="summary-card__row">
                <span className="summary-card__label">Refund {ratePlan.refundType === "Percentage" ? "%" : "Amount"}</span>
                <span className="summary-card__value">{ratePlan.refundType === "Percentage" ? `${ratePlan.refundValue}%` : fmt(ratePlan.refundValue)}</span>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card__header"><div className="card__title"><StickyNote style={{ width: 15, height: 15, display: "inline", marginRight: 6 }} />Notes</div></div>
          <div className="card__body">
            <div className="notes-list">
              {(ratePlan.notes || []).length === 0 && <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>No internal notes yet.</p>}
              {(ratePlan.notes || []).map((n) => (
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
          </div>
        </section>
      </div>

      <RatePlanWizardModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        propertyId={ratePlan.propertyId}
        propertyName={property?.name}
        ratePlan={ratePlan}
        initialStep={editStep}
      />
    </>
  );
}
