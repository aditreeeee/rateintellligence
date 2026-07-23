import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Fingerprint, Building2, BedDouble, Users, Ruler, Layers, Pencil, ArrowRight,
  Sparkles, Heart, StickyNote, Send, Ratio,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import RoomWizardModal from "../../components/rooms/RoomWizardModal";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";

function lookupName(list, id) {
  return (list || []).find((i) => i.id === id)?.name || "—";
}

export default function RoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { getRoomById, getPropertyById, getRatePlansByRoom, masterData, addRoomNote } = useData();

  const room = getRoomById(id);
  const [editOpen, setEditOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  if (!room) {
    return (
      <>
        <PageHeader crumbs={[{ label: "Rooms", to: "/rooms" }]} title="Room not found" />
        <div className="card"><EmptyState icon={BedDouble} title="This room doesn't exist" desc="It may have been deleted." /></div>
      </>
    );
  }

  const property = getPropertyById(room.propertyId);
  const ratePlans = getRatePlansByRoom(room.id);
  const amenities = (room.amenityIds || []).map((aid) => masterData.amenities.find((a) => a.id === aid)).filter(Boolean);
  const tags = (room.tagIds || []).map((tid) => masterData.tags.find((t) => t.id === tid)).filter(Boolean);

  const summary = [
    { label: "Room ID", value: room.id, icon: Fingerprint },
    { label: "Property", value: property?.name || "—", icon: Building2 },
    { label: "Room Name", value: room.name, icon: BedDouble },
    { label: "Status", value: room.status, icon: null, badge: room.status === "Active" ? "success" : "neutral" },
    { label: "Room Type", value: lookupName(masterData.roomTypes, room.roomTypeId), icon: Layers },
    { label: "Layout", value: lookupName(masterData.layouts, room.layoutId), icon: Ratio },
    { label: "Occupancy", value: `${room.maxAdults} Adults · ${room.maxChildren} Children`, icon: Users },
    { label: "Bed", value: lookupName(masterData.bedConfigurations, room.bedConfigurationId), icon: BedDouble },
    { label: "Area", value: `${room.areaValue} ${room.areaUnit}`, icon: Ruler },
    { label: "Rate Plans", value: ratePlans.length, icon: Layers },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Rooms", to: "/rooms" }, { label: room.name }]}
        title={room.name}
        subtitle={`${property?.name || ""} · ${room.id}`}
        actions={<button className="btn btn-primary" onClick={() => setEditOpen(true)}><Pencil /> Edit Room</button>}
      />

      <section className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card__header">
          <div className="card__title">Summary</div>
          {room.status === "Active" ? <span className="badge badge-success pulse">Active</span> : <span className="badge badge-neutral">Inactive</span>}
        </div>
        <div className="card__body">
          <div className="summary-grid">
            {summary.map((s) => (
              <div className="summary-grid__item" key={s.label}>
                <div className="summary-grid__label">{s.icon && <s.icon />} {s.label}</div>
                <div className="summary-grid__value">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="form-page-grid">
        <div className="form-stack">
          <section className="card">
            <div className="card__header"><div className="card__title">Description</div></div>
            <div className="card__body">
              <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)", lineHeight: "var(--lh-normal)" }}>
                {room.description || "No description provided."}
              </p>
            </div>
          </section>

          <section className="card">
            <div className="card__header"><div className="card__title">Configuration</div></div>
            <div className="card__body">
              <div className="summary-card__row"><span className="summary-card__label">Room Type</span><span className="summary-card__value">{lookupName(masterData.roomTypes, room.roomTypeId)}</span></div>
              <div className="summary-card__row"><span className="summary-card__label">Layout</span><span className="summary-card__value">{lookupName(masterData.layouts, room.layoutId)}</span></div>
              <div className="summary-card__row"><span className="summary-card__label">Occupancy Based</span><span className="summary-card__value">{room.occupancyBasedType}</span></div>
              <div className="summary-card__row"><span className="summary-card__label">Bed Configuration</span><span className="summary-card__value">{lookupName(masterData.bedConfigurations, room.bedConfigurationId)}</span></div>
              <div className="summary-card__row"><span className="summary-card__label">Number of Beds</span><span className="summary-card__value">{room.numberOfBeds}</span></div>
              <div className="summary-card__row"><span className="summary-card__label">Maximum Adults</span><span className="summary-card__value">{room.maxAdults}</span></div>
              <div className="summary-card__row"><span className="summary-card__label">Maximum Children</span><span className="summary-card__value">{room.maxChildren}</span></div>
              <div className="summary-card__row"><span className="summary-card__label">Maximum Occupancy</span><span className="summary-card__value">{room.maxOccupancy}</span></div>
              <div className="summary-card__row"><span className="summary-card__label">Base Occupancy</span><span className="summary-card__value">{room.baseOccupancy}</span></div>
            </div>
          </section>

          <section className="card">
            <div className="card__header"><div className="card__title"><Sparkles style={{ width: 15, height: 15, display: "inline", marginRight: 6 }} />Amenities</div></div>
            <div className="card__body">
              {amenities.length === 0 ? <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>No amenities selected.</p> : (
                <div className="chip-group">{amenities.map((a) => <span className="chip" key={a.id}>{a.name}</span>)}</div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__header"><div className="card__title"><Heart style={{ width: 15, height: 15, display: "inline", marginRight: 6 }} />Best Suited For</div></div>
            <div className="card__body">
              {tags.length === 0 ? <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>No tags selected.</p> : (
                <div className="chip-group">{tags.map((t) => <span className="chip" key={t.id}>{t.name}</span>)}</div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__header"><div className="card__title"><StickyNote style={{ width: 15, height: 15, display: "inline", marginRight: 6 }} />Notes</div></div>
            <div className="card__body">
              <div className="notes-list">
                {(room.notes || []).length === 0 && <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>No internal notes yet.</p>}
                {(room.notes || []).map((n) => (
                  <div className="note-card" key={n.id}>
                    <div className="note-card__top">
                      <span className="note-card__author">{n.author}</span>
                      <span className="note-card__date">{n.date}</span>
                    </div>
                    <div className="note-card__text">{n.text}</div>
                  </div>
                ))}
              </div>
              <div className="note-composer">
                <textarea placeholder="Add an internal note..." value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    if (!noteDraft.trim()) return;
                    addRoomNote(room.id, noteDraft.trim());
                    setNoteDraft("");
                    toast({ title: "Note added", type: "success" });
                  }}
                >
                  <Send /> Add
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="form-stack">
          <div className="card" style={{ position: "sticky", top: "calc(var(--topbar-h) + var(--space-5))" }}>
            <div className="card__header"><div className="card__title">Linked Rate Plans</div></div>
            <div className="card__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {ratePlans.length === 0 ? (
                <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>No rate plans linked to this room yet.</p>
              ) : (
                ratePlans.map((rp) => {
                  const meal = masterData.mealPlans.find((m) => m.code === rp.mealPlanCode);
                  const period = rp.pricingPeriods?.[0];
                  return (
                    <div className="note-card" key={rp.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/rate-plans/${rp.id}`)}>
                      <div className="note-card__top">
                        <span className="note-card__author">{rp.name || meal?.name || rp.mealPlanCode}</span>
                        <span className={`rp-mealplan-badge ${rp.mealPlanCode}`}>{rp.mealPlanCode}</span>
                      </div>
                      <div className="note-card__text">
                        {period ? `${period.effectiveFrom} → ${period.effectiveTo}` : "No pricing period"} · <span className={rp.status === "Active" ? "badge badge-success" : "badge badge-neutral"}>{rp.status}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <button className="btn btn-primary btn-block" onClick={() => navigate(`/rate-plans?propertyId=${room.propertyId}&roomId=${room.id}`)}>
                Manage Rate Plans <ArrowRight />
              </button>
            </div>
          </div>
        </aside>
      </div>

      <RoomWizardModal open={editOpen} onClose={() => setEditOpen(false)} mode="edit" propertyId={room.propertyId} propertyName={property?.name} room={room} />
    </>
  );
}
