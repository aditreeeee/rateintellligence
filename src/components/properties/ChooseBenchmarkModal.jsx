import { useMemo, useState } from "react";
import { Search, Fingerprint, MapPin, Star, Check, ArrowRight } from "lucide-react";
import Modal from "../ui/Modal";
import EmptyState from "../ui/EmptyState";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";

/**
 * Searchable picker for the Benchmark Property ("Our Property").
 * Only ever lists Properties that belong to the current Company — competitor
 * properties are a separate data set and can never appear or be selected here.
 */
export default function ChooseBenchmarkModal({ open, onClose }) {
  const { properties, benchmarkProperty, setBenchmarkProperty } = useData();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState(null);

  const filtered = useMemo(
    () =>
      properties.filter((p) =>
        [p.name, p.id, p.city].some((v) => v.toLowerCase().includes(query.trim().toLowerCase()))
      ),
    [properties, query]
  );

  const pending = properties.find((p) => p.id === pendingId);

  function handleClose() {
    setPendingId(null);
    setQuery("");
    onClose();
  }

  function confirmChange() {
    setBenchmarkProperty(pending.id);
    toast({ title: "Our Property updated", message: `${pending.name} is now used across Dashboard, Calendar and Rate Comparison.`, type: "success" });
    handleClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={pending ? "Confirm Our Property" : "Choose Benchmark Property"}
      subtitle={pending ? "This becomes the reference used across analytics and comparisons." : "Only properties belonging to this Company can be selected."}
      footer={
        pending ? (
          <>
            <button className="btn btn-ghost" onClick={() => setPendingId(null)}>Back</button>
            <button className="btn btn-primary" onClick={confirmChange}><Check /> Confirm</button>
          </>
        ) : null
      }
    >
      {pending ? (
        <div className="benchmark-confirm">
          <div className="benchmark-confirm__row">
            <span className="filter-option__avatar">{benchmarkProperty?.name.split(" ").map((w) => w[0]).slice(0, 2).join("") || "—"}</span>
            <div>
              <div style={{ fontWeight: 620 }}>{benchmarkProperty?.name || "None set"}</div>
              <div className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>Current Our Property</div>
            </div>
          </div>
          <ArrowRight style={{ width: 18, height: 18, color: "var(--text-muted)", flexShrink: 0 }} />
          <div className="benchmark-confirm__row">
            <span className="filter-option__avatar">{pending.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
            <div>
              <div style={{ fontWeight: 620 }}>{pending.name}</div>
              <div className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>{pending.id} · {pending.city}</div>
            </div>
          </div>
          <p className="field-hint" style={{ marginTop: "var(--space-4)" }}>
            Rate Comparison, the Rate Calendar and Dashboard analytics will immediately switch to use {pending.name} as "Our Property".
          </p>
        </div>
      ) : (
        <>
          <div className="manage-list__search" style={{ marginBottom: "var(--space-4)" }}>
            <Search />
            <input type="text" placeholder="Search by name, Property ID or city..." value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          </div>

          <div className="manage-list__scroll" style={{ maxHeight: 360 }}>
            {filtered.length === 0 ? (
              <EmptyState icon={Search} title="No matching properties" desc="Try a different search term." />
            ) : (
              filtered.map((p) => (
                <div
                  key={p.id}
                  className={`filter-option benchmark-pick-row ${p.id === benchmarkProperty?.id ? "is-active" : ""}`}
                  onClick={() => setPendingId(p.id)}
                >
                  <span className="filter-option__avatar">{p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                  <span style={{ flex: 1 }}>
                    <div className="flex items-center gap-2">
                      <strong>{p.name}</strong>
                      {p.id === benchmarkProperty?.id && <span className="benchmark-badge"><Star /> Our Property</span>}
                    </div>
                    <div className="filter-option__meta flex items-center gap-2">
                      <span><Fingerprint style={{ width: 11, height: 11, display: "inline", marginRight: 3 }} />{p.id}</span>
                      <span><MapPin style={{ width: 11, height: 11, display: "inline", marginRight: 3 }} />{p.city}</span>
                      {p.status === "Active" ? <span className="badge badge-success">Active</span> : <span className="badge badge-neutral">Inactive</span>}
                    </div>
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
