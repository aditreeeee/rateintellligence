import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Fingerprint, Info, MapPin, Sparkles, Star, RotateCcw, X, Check, Send, Lightbulb } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { FieldInput, FieldTextarea, FieldSelect } from "../../components/ui/FieldFloat";
import ChipMultiSelect from "../../components/config/ChipMultiSelect";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";

const COUNTRIES = ["India", "United Arab Emirates", "Singapore", "United Kingdom", "United States"];
const TIMEZONES = ["Asia/Kolkata (GMT+5:30)", "Asia/Dubai (GMT+4:00)", "Asia/Singapore (GMT+8:00)", "Europe/London (GMT+0:00)"];
const CURRENCIES = ["INR - Indian Rupee", "USD - US Dollar", "AED - UAE Dirham", "SGD - Singapore Dollar", "GBP - British Pound"];
const STARS = ["5 Star", "4 Star", "3 Star", "2 Star", "1 Star"];

function genPropertyId(existing) {
  const nums = existing.map((p) => parseInt(p.id.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 100233) + 1;
  return `PROP-${next}`;
}

export default function PropertyDetail({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    properties, masterData, getPropertyById, createProperty, updateProperty,
    setBenchmarkProperty, addPropertyNote,
  } = useData();

  const isCreate = mode === "create";
  const existing = !isCreate ? getPropertyById(id) : null;

  // Existing seed data stores amenities as name strings; map them onto the
  // shared amenities list's ids so the ChipMultiSelect can drive selection by id.
  const initialAmenityIds = (existing?.amenities || [])
    .map((name) => masterData.amenities.find((a) => a.name === name)?.id)
    .filter(Boolean);

  const [form, setForm] = useState(() => ({
    id: existing?.id || genPropertyId(properties),
    name: existing?.name || "",
    brand: existing?.brand || "",
    starCategory: existing?.starCategory ? `${existing.starCategory} Star` : "",
    city: existing?.city || "",
    country: existing?.country || "",
    timezone: existing?.timezone || "",
    currency: existing?.currency || "",
    address: existing?.address || "",
    description: existing?.description || "",
    amenityIds: initialAmenityIds,
    status: existing?.status || "Active",
  }));
  const [noteDraft, setNoteDraft] = useState("");
  const [confirmBenchmark, setConfirmBenchmark] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  function validate() {
    const e = {};
    if (!form.name || form.name.trim().length < 3) e.name = "Property name is required (min. 3 characters)";
    if (!form.starCategory) e.starCategory = "Please select a star category";
    if (!form.city) e.city = "City is required";
    if (!form.country) e.country = "Please select a country";
    if (!form.timezone) e.timezone = "Please select a time zone";
    if (!form.currency) e.currency = "Please select a currency";
    if (!form.address) e.address = "Address is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) {
      toast({ title: "Please fix the highlighted fields", type: "error" });
      return;
    }
    const payload = {
      name: form.name,
      brand: form.brand,
      starCategory: parseInt(form.starCategory, 10),
      city: form.city,
      country: form.country,
      timezone: form.timezone,
      currency: form.currency,
      address: form.address,
      description: form.description,
      amenities: form.amenityIds.map((aid) => masterData.amenities.find((a) => a.id === aid)?.name).filter(Boolean),
      status: form.status,
    };
    if (isCreate) {
      const record = createProperty({ id: form.id, ...payload, notes: [] });
      toast({ title: "Property created", message: `${record.name} (${record.id}) has been added.`, type: "success" });
      navigate(`/properties/${record.id}`);
    } else {
      updateProperty(existing.id, payload);
      toast({ title: "Property updated", type: "success" });
    }
  }

  const requiredCount = 7;
  const filledCount = useMemo(
    () => ["name", "starCategory", "city", "country", "timezone", "currency", "address"].filter((k) => form[k]).length,
    [form]
  );
  const progressPct = Math.round((filledCount / requiredCount) * 100);

  if (!isCreate && !existing) {
    return <PageHeader crumbs={[{ label: "Properties", to: "/properties" }]} title="Property not found" />;
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Properties", to: "/properties" }, { label: isCreate ? "Add Property" : form.name }]}
        title={
          <span className="property-detail-header">
            {isCreate ? "Add Property" : form.name}
          </span>
        }
        subtitle={isCreate ? "Register a new property to your portfolio. This creates an immutable Property ID for future HMS integration." : "Property details, benchmark status and internal notes."}
      />

      <div className="card" style={{ padding: "var(--space-4) var(--space-6)", marginBottom: "var(--space-6)", display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <span className={`property-id-chip ${!isCreate ? "locked" : ""}`}>
          <Fingerprint /> {form.id}
        </span>
        <span className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>
          {isCreate ? "Auto-generated and immutable once saved — this ID must match the HMS Property ID." : "Immutable — matches the HMS Property ID for this property."}
        </span>
        {!isCreate && existing.isBenchmark && <span className="benchmark-badge"><Star /> Our Property</span>}
      </div>

      <div className="form-page-grid">
        <div className="form-stack">
          <section className="card">
            <div className="card__header">
              <div>
                <div className="card__title">Basic Information</div>
                <div className="card__subtitle">Core identifiers used across the platform and future integrations.</div>
              </div>
              <span className="accordion__icon"><Info /></span>
            </div>
            <div className="card__body form-grid">
              <FieldInput label="Property Name" value={form.name} onChange={set("name")} required error={errors.name} />
              <FieldInput label="Brand" value={form.brand} onChange={set("brand")} />
              <FieldSelect label="Star Category" value={form.starCategory} onChange={set("starCategory")} options={STARS} required error={errors.starCategory} />
            </div>
          </section>

          <section className="card">
            <div className="card__header">
              <div>
                <div className="card__title">Location &amp; Regional Settings</div>
                <div className="card__subtitle">Determines rate currency, calendar time zone and regional formatting.</div>
              </div>
              <span className="accordion__icon"><MapPin /></span>
            </div>
            <div className="card__body form-grid">
              <FieldInput label="City" value={form.city} onChange={set("city")} required error={errors.city} />
              <FieldSelect label="Country" value={form.country} onChange={set("country")} options={COUNTRIES} required error={errors.country} />
              <FieldSelect label="Time Zone" value={form.timezone} onChange={set("timezone")} options={TIMEZONES} required error={errors.timezone} />
              <FieldSelect label="Currency" value={form.currency} onChange={set("currency")} options={CURRENCIES} required error={errors.currency} />
              <FieldTextarea label="Full Address" value={form.address} onChange={set("address")} required span2 />
            </div>
          </section>

          <section className="card">
            <div className="card__header">
              <div>
                <div className="card__title">Description &amp; Amenities</div>
                <div className="card__subtitle">Shown on booking-facing surfaces once connected to a channel manager.</div>
              </div>
              <span className="accordion__icon"><Sparkles /></span>
            </div>
            <div className="card__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <FieldTextarea label="Property Description" value={form.description} onChange={set("description")} style={{ minHeight: 110 }} />
              <ChipMultiSelect
                listKey="amenities"
                label="Property Amenities"
                manageLabel="Manage Amenities"
                icon={Sparkles}
                selected={form.amenityIds}
                onChange={set("amenityIds")}
              />
            </div>
          </section>

          {!isCreate && (
            <section className="card">
              <div className="card__header">
                <div>
                  <div className="card__title">Internal Notes</div>
                  <div className="card__subtitle">Revenue comments, market info and competitor observations. Will sync from the HMS in future releases.</div>
                </div>
              </div>
              <div className="card__body">
                <div className="notes-list">
                  {existing.notes.length === 0 && <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>No notes yet for this property.</p>}
                  {existing.notes.map((n) => (
                    <div className="note-card" key={n.id}>
                      <div className="note-card__top">
                        <span className="note-card__author">{n.author} <span className="badge badge-info" style={{ marginLeft: 6 }}>{n.tag}</span></span>
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
                      addPropertyNote(existing.id, noteDraft.trim());
                      setNoteDraft("");
                      toast({ title: "Note added", type: "success" });
                    }}
                  >
                    <Send /> Add
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="form-stack">
          <div className="card" style={{ position: "sticky", top: "calc(var(--topbar-h) + var(--space-5))" }}>
            <div className="card__header"><div className="card__title">Setup Progress</div></div>
            <div className="card__body">
              <div className="progress-track"><div className="progress-fill" style={{ width: `${progressPct}%` }}></div></div>
              <p className="text-muted" style={{ fontSize: "var(--fs-xs)", marginTop: "var(--space-3)" }}>
                Complete required fields to unlock Rooms and Rate Plans for this property.
              </p>
            </div>
          </div>

          {!isCreate && (
            <div className="card">
              <div className="card__header"><div className="card__title">Property Status</div></div>
              <div className="card__body">
                <div className="checkbox-row">
                  <label className="switch">
                    <input type="checkbox" checked={form.status === "Active"} onChange={(e) => set("status")(e.target.checked ? "Active" : "Inactive")} />
                    <span className="switch__track"></span>
                  </label>
                  <div>
                    <div style={{ fontWeight: 620 }}>Status: {form.status}</div>
                    <div className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>Inactive properties are hidden from the calendar and rate plans.</div>
                  </div>
                </div>
                <div className="mt-4">
                  {existing.isBenchmark ? (
                    <button className="btn btn-secondary btn-block" type="button" disabled>
                      <Star /> This is Our Property
                    </button>
                  ) : confirmBenchmark ? (
                    <div className="flex gap-2">
                      <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmBenchmark(false)}>Cancel</button>
                      <button
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        onClick={() => {
                          setBenchmarkProperty(existing.id);
                          toast({ title: "Our Property updated", message: `${existing.name} is now used across Dashboard, Calendar and Rate Comparison.`, type: "success" });
                          setConfirmBenchmark(false);
                        }}
                      >
                        <Check /> Confirm
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary btn-block" type="button" onClick={() => setConfirmBenchmark(true)}>
                      <Star /> Set as Benchmark Property (Our Property)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="card" style={{ background: "var(--grad-accent)", border: "none" }}>
            <div className="card__body">
              <Lightbulb style={{ width: 20, height: 20, color: "var(--c-yale-blue)", marginBottom: "var(--space-3)" }} />
              <div style={{ fontWeight: 640, fontSize: "var(--fs-sm)" }}>Tip</div>
              <p style={{ fontSize: "var(--fs-xs)", color: "var(--c-yale-blue)", marginTop: 4 }}>
                The Property ID is permanent and must match the HMS record exactly — it becomes the primary key across Rooms, Rate Plans, and the Calendar.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="card form-actions-bar" style={{ padding: "var(--space-4) var(--space-6)", marginTop: "var(--space-6)" }}>
        <button type="button" className="btn btn-ghost" onClick={() => setForm((f) => ({ ...f, name: existing?.name || "" }))}>
          <RotateCcw /> Reset
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/properties")}>
          <X /> Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          <Check /> {isCreate ? "Save Property" : "Save Changes"}
        </button>
      </div>
    </>
  );
}
