import { useEffect, useMemo, useState } from "react";
import {
  LayoutGrid, Tags, Users, BedDouble, Sparkles, Heart, StickyNote,
  Check, X, AlertCircle, CheckCircle2, Wand2, Settings2, Send,
} from "lucide-react";
import Modal from "../ui/Modal";
import { FieldInput, FieldTextarea } from "../ui/FieldFloat";
import ManagedSelectField from "../config/ManagedSelectField";
import ChipMultiSelect from "../config/ChipMultiSelect";
import ManageListModal from "../config/ManageListModal";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";

const STEPS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "classification", label: "Classification", icon: Tags },
  { key: "occupancy", label: "Occupancy", icon: Users },
  { key: "bed", label: "Bed Configuration", icon: BedDouble },
  { key: "features", label: "Features", icon: Sparkles },
  { key: "amenities", label: "Amenities", icon: Sparkles },
  { key: "bestFor", label: "Best Suited For", icon: Heart },
  { key: "notes", label: "Notes", icon: StickyNote },
];

const OCCUPANCY_TYPES = ["Single", "Double", "Twin", "Triple", "Quad", "Family"];

function emptyForm() {
  return {
    name: "", description: "", status: "Active", areaValue: "", areaUnit: "Sq. Ft.",
    roomTypeId: "", layoutId: "",
    maxAdults: 2, maxChildren: 0, maxOccupancy: 2, baseOccupancy: 2,
    occupancyBasedType: "Double", bedConfigurationId: "", numberOfBeds: 1,
    roomOptionIds: [], amenityIds: [], tagIds: [],
    notes: [],
  };
}

export default function RoomWizardModal({ open, onClose, mode = "create", propertyId, propertyName, room, onSaved }) {
  const { masterData, createRoom, updateRoom, addRoomNote, isRoomNameTaken, getRatePlansByRoom } = useData();
  const toast = useToast();
  const isEdit = mode === "edit";

  const [step, setStep] = useState("overview");
  const [form, setForm] = useState(emptyForm());
  const [noteDraft, setNoteDraft] = useState("");
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("overview");
    setNameTouched(false);
    setNoteDraft("");
    if (isEdit && room) {
      setForm({ ...emptyForm(), ...room });
    } else {
      setForm(emptyForm());
    }
  }, [open, isEdit, room]);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const nameConflict = form.name.trim() && isRoomNameTaken(propertyId, form.name, isEdit ? room?.id : null);
  const canSave = form.name.trim().length > 1 && !nameConflict;

  function applyTemplate(template) {
    setForm((f) => ({ ...f, ...template.preset }));
    toast({ title: `Applied "${template.name}"`, message: "Overview, classification, occupancy and bed fields were pre-filled.", type: "success" });
  }

  function handleSave() {
    if (!form.name.trim()) { toast({ title: "Room name is required", type: "error" }); setStep("overview"); return; }
    if (nameConflict) { toast({ title: "Room name already exists for this property", type: "error" }); setStep("overview"); return; }

    const payload = {
      propertyId,
      name: form.name.trim(),
      description: form.description,
      status: form.status,
      areaValue: Number(form.areaValue) || 0,
      areaUnit: form.areaUnit,
      roomTypeId: form.roomTypeId,
      layoutId: form.layoutId,
      maxAdults: Number(form.maxAdults) || 0,
      maxChildren: Number(form.maxChildren) || 0,
      maxOccupancy: Number(form.maxOccupancy) || 0,
      baseOccupancy: Number(form.baseOccupancy) || 0,
      occupancyBasedType: form.occupancyBasedType,
      bedConfigurationId: form.bedConfigurationId,
      numberOfBeds: Number(form.numberOfBeds) || 0,
      roomOptionIds: form.roomOptionIds,
      amenityIds: form.amenityIds,
      tagIds: form.tagIds,
    };

    if (isEdit) {
      updateRoom(room.id, payload);
      toast({ title: "Room updated", message: `${form.name} saved successfully.`, type: "success" });
      onSaved?.(room.id);
    } else {
      const record = createRoom({ ...payload, notes: noteDraft.trim() ? [{ id: `NOTE-${Date.now()}`, author: "Aditree Admin", date: new Date().toISOString().slice(0, 10), text: noteDraft.trim() }] : [], displayOrder: 999 });
      toast({ title: "Room created", message: `${form.name} added successfully.`, type: "success" });
      onSaved?.(record.id);
    }
    onClose();
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const ratePlanCount = isEdit && room ? getRatePlansByRoom(room.id).length : 0;

  return (
    <Modal open={open} onClose={onClose} size="lg" title={isEdit ? `Edit Room · ${room?.name}` : "Add Room"} subtitle={propertyName}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}><X /> Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}><Check /> {isEdit ? "Save Changes" : "Create Room"}</button>
        </>
      }
    >
      <div className="room-wizard">
        <nav className="step-nav" aria-label="Room form steps">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`step-nav__item ${step === s.key ? "is-active" : ""} ${i < stepIndex ? "is-done" : ""}`}
              onClick={() => setStep(s.key)}
            >
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
                    {masterData.roomTemplates.filter((t) => t.status === "Active").map((t) => (
                      <span key={t.id} className="chip is-selectable" onClick={() => applyTemplate(t)}>{t.name}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="property-id-chip locked" style={{ width: "fit-content" }}>{propertyName}</div>

              <FieldInput label="Room Name" value={form.name} onChange={(v) => { set("name")(v); setNameTouched(true); }} required />
              {nameTouched && form.name.trim() && (
                <div className={`uniqueness-hint ${nameConflict ? "conflict" : "ok"}`}>
                  {nameConflict ? <AlertCircle /> : <CheckCircle2 />}
                  {nameConflict ? "A room with this name already exists for this property." : "Room name is unique for this property."}
                </div>
              )}
              <FieldTextarea label="Description" value={form.description} onChange={set("description")} />

              <div className="checkbox-row">
                <label className="switch">
                  <input type="checkbox" checked={form.status === "Active"} onChange={(e) => set("status")(e.target.checked ? "Active" : "Inactive")} />
                  <span className="switch__track"></span>
                </label>
                <div style={{ fontWeight: 620 }}>Status: {form.status}</div>
              </div>

              <div className="form-grid cols-2">
                <FieldInput label="Room Area" type="number" value={form.areaValue} onChange={set("areaValue")} />
                <div className="field field-float">
                  <select className={form.areaUnit ? "has-value" : ""} value={form.areaUnit} onChange={(e) => set("areaUnit")(e.target.value)}>
                    <option>Sq. Ft.</option>
                    <option>Sq. M.</option>
                  </select>
                  <label>Area Unit</label>
                </div>
              </div>
            </div>
          )}

          {step === "classification" && (
            <div className="form-stack">
              <ManagedSelectField listKey="roomTypes" label="Room Type" value={form.roomTypeId} onChange={set("roomTypeId")} icon={Tags} />
              <ManagedSelectField listKey="layouts" label="Layout" value={form.layoutId} onChange={set("layoutId")} icon={LayoutGrid} />
            </div>
          )}

          {step === "occupancy" && (
            <div className="form-grid cols-2">
              <FieldInput label="Maximum Adults" type="number" value={form.maxAdults} onChange={set("maxAdults")} />
              <FieldInput label="Maximum Children" type="number" value={form.maxChildren} onChange={set("maxChildren")} />
              <FieldInput label="Maximum Occupancy" type="number" value={form.maxOccupancy} onChange={set("maxOccupancy")} />
              <FieldInput label="Base Occupancy" type="number" value={form.baseOccupancy} onChange={set("baseOccupancy")} />
            </div>
          )}

          {step === "bed" && (
            <div className="form-stack">
              <div className="field field-float">
                <select className={form.occupancyBasedType ? "has-value" : ""} value={form.occupancyBasedType} onChange={(e) => set("occupancyBasedType")(e.target.value)}>
                  {OCCUPANCY_TYPES.map((o) => <option key={o}>{o}</option>)}
                </select>
                <label>Occupancy Based</label>
              </div>
              <ManagedSelectField listKey="bedConfigurations" label="Bed Configuration" value={form.bedConfigurationId} onChange={set("bedConfigurationId")} icon={BedDouble} />
              <FieldInput label="Number of Beds" type="number" value={form.numberOfBeds} onChange={set("numberOfBeds")} />
            </div>
          )}

          {step === "features" && (
            <ChipMultiSelect listKey="roomOptions" label="Room Options" manageLabel="Manage Room Options" icon={Sparkles} selected={form.roomOptionIds} onChange={set("roomOptionIds")} />
          )}

          {step === "amenities" && (
            <ChipMultiSelect listKey="amenities" label="Room Amenities" manageLabel="Manage Amenities" icon={Sparkles} selected={form.amenityIds} onChange={set("amenityIds")} />
          )}

          {step === "bestFor" && (
            <ChipMultiSelect listKey="tags" label="Best Suited For" manageLabel="Manage Tags" icon={Heart} selected={form.tagIds} onChange={set("tagIds")} />
          )}

          {step === "notes" && (
            <div>
              {isEdit ? (
                <>
                  <div className="notes-list">
                    {(room?.notes || []).length === 0 && <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>No notes yet for this room.</p>}
                    {(room?.notes || []).map((n) => (
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
                  {ratePlanCount > 0 && (
                    <p className="field-hint" style={{ marginTop: "var(--space-4)" }}>
                      This room has {ratePlanCount} linked rate plan{ratePlanCount === 1 ? "" : "s"}.
                    </p>
                  )}
                </>
              ) : (
                <FieldTextarea label="Initial Note (optional)" value={noteDraft} onChange={setNoteDraft} />
              )}
            </div>
          )}
        </div>
      </div>

      <ManageListModal open={manageTemplatesOpen} onClose={() => setManageTemplatesOpen(false)} listKey="roomTemplates" title="Manage Templates" icon={Wand2} />
    </Modal>
  );
}
