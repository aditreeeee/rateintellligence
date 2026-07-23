import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2, Plus, Pencil, Trash2, Copy, Archive, ArchiveRestore, Eye,
  Search, AlertTriangle, ChevronLeft, ChevronRight,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import RatePlanWizardModal from "../../components/rateplans/RatePlanWizardModal";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";

const PAGE_SIZE = 6;
const fmt = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);

function activeRate(rp) {
  const today = new Date();
  const period = rp.pricingPeriods.find((p) => new Date(p.effectiveFrom) <= today && today <= new Date(p.effectiveTo)) || rp.pricingPeriods[0];
  return period?.rates?.Double || 0;
}

export default function RatePlansPage() {
  const { properties, getRatePlansByProperty, getRoomsByProperty, updateRatePlan, deleteRatePlan, duplicateRatePlan } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [propertyId, setPropertyId] = useState(searchParams.get("propertyId") || properties[0]?.id);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState("create");
  const [activePlan, setActivePlan] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const allPlans = useMemo(() => getRatePlansByProperty(propertyId), [getRatePlansByProperty, propertyId]);
  const roomFilter = searchParams.get("roomId");

  const filtered = useMemo(() => {
    let list = allPlans.filter((rp) => rp.name.toLowerCase().includes(query.trim().toLowerCase()));
    if (roomFilter) list = list.filter((rp) => (rp.roomIds || []).includes(roomFilter));
    if (statusFilter !== "All") list = list.filter((rp) => rp.status === statusFilter);
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "rate") return activeRate(b) - activeRate(a);
      return 0;
    });
    return list;
  }, [allPlans, query, statusFilter, sortBy, roomFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagePlans = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function selectProperty(id) {
    setPropertyId(id);
    setSelectedIds([]);
    setPage(1);
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleSelectAllOnPage() {
    const pageIds = pagePlans.map((r) => r.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) => (allSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]));
  }

  function openCreate() { setWizardMode("create"); setActivePlan(null); setWizardOpen(true); }
  function openEdit(rp) { setWizardMode("edit"); setActivePlan(rp); setWizardOpen(true); }

  function handleDuplicate(rp) {
    const copy = duplicateRatePlan(rp.id);
    toast({ title: "Rate plan duplicated", message: `${copy.name} created as Draft — review before activating.`, type: "success" });
  }
  function handleArchiveToggle(rp) {
    const next = rp.status === "Archived" ? "Active" : "Archived";
    updateRatePlan(rp.id, { status: next });
    toast({ title: next === "Archived" ? "Rate plan archived" : "Rate plan restored", type: "info" });
  }
  function handleDelete(rp) {
    deleteRatePlan(rp.id);
    toast({ title: "Rate plan deleted", type: "info" });
    setConfirmDelete(null);
    setSelectedIds((prev) => prev.filter((id) => id !== rp.id));
  }
  function handleBulkDelete() {
    selectedIds.forEach((id) => deleteRatePlan(id));
    toast({ title: `${selectedIds.length} rate plans deleted`, type: "info" });
    setSelectedIds([]);
    setConfirmDelete(null);
  }
  function handleBulkStatus(status) {
    selectedIds.forEach((id) => updateRatePlan(id, { status }));
    toast({ title: `${selectedIds.length} rate plans marked ${status}`, type: "success" });
    setSelectedIds([]);
  }

  const activeProperty = properties.find((p) => p.id === propertyId);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Rate Plans" }]}
        title="Rate Plan Management"
        subtitle="Select a property on the left, then manage its rate plans, occupancy pricing and cancellation policies."
        actions={<button className="btn btn-primary" onClick={openCreate} disabled={!propertyId}><Plus /> Add Rate Plan</button>}
      />

      <div className="module-layout">
        <aside className="filter-panel">
          <div className="card filter-panel__section">
            <div className="filter-panel__label"><Building2 /> Property</div>
            <div className="filter-option-list">
              {properties.map((p) => (
                <div key={p.id} className={`filter-option ${p.id === propertyId ? "is-active" : ""}`} onClick={() => selectProperty(p.id)}>
                  <span className="filter-option__avatar">{p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                  <span><div>{p.name}</div><div className="filter-option__meta">{p.id}</div></span>
                  <span className="badge badge-neutral">{getRatePlansByProperty(p.id).length}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div>
          <div className="toolbar">
            <div className="filter-bar">
              <div className="select-pill" style={{ paddingLeft: 10 }}>
                <Search style={{ width: 14, height: 14 }} />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  placeholder="Search rate plans..."
                  style={{ border: "none", background: "transparent", outline: "none", fontSize: "var(--fs-sm)", width: 140 }}
                />
              </div>
              <select className="select-pill" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ cursor: "pointer" }}>
                <option value="All">All statuses</option>
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Archived">Archived</option>
              </select>
              <select className="select-pill" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ cursor: "pointer" }}>
                <option value="name">Name (A–Z)</option>
                <option value="rate">Double rate (high–low)</option>
              </select>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="card" style={{ padding: "var(--space-3) var(--space-5)", marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <span className="badge badge-info">{selectedIds.length} selected</span>
              <button className="btn btn-ghost btn-sm" onClick={() => handleBulkStatus("Active")}>Mark Active</button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleBulkStatus("Archived")}>Archive</button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--c-danger)" }} onClick={() => setConfirmDelete("bulk")}>Delete Selected</button>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setSelectedIds([])}>Clear</button>
            </div>
          )}

          {!propertyId ? (
            <div className="card"><EmptyState icon={Building2} title="Select a property" desc="Choose a property from the left panel to view its rate plans." /></div>
          ) : filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={Building2}
                title={allPlans.length === 0 ? `No rate plans yet for ${activeProperty?.name}` : "No rate plans match your filters"}
                desc={allPlans.length === 0 ? "Attach a meal plan, room assignment and pricing to get started." : "Try adjusting your search or status filter."}
                action={allPlans.length === 0 && getRoomsByProperty(propertyId).length > 0 && <button className="btn btn-primary" onClick={openCreate}><Plus /> Add Rate Plan</button>}
              />
              {allPlans.length === 0 && getRoomsByProperty(propertyId).length === 0 && (
                <p className="text-muted" style={{ textAlign: "center", fontSize: "var(--fs-xs)", paddingBottom: "var(--space-6)" }}>Add rooms to this property first.</p>
              )}
            </div>
          ) : (
            <>
              <div className="table-wrap card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}>
                        <input type="checkbox" checked={pagePlans.every((r) => selectedIds.includes(r.id))} onChange={toggleSelectAllOnPage} />
                      </th>
                      <th>Rate Plan</th><th>Meal Plan</th><th>Rooms</th><th>Current Rate (Double)</th><th>Status</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagePlans.map((rp) => (
                      <tr key={rp.id}>
                        <td><input type="checkbox" checked={selectedIds.includes(rp.id)} onChange={() => toggleSelect(rp.id)} /></td>
                        <td style={{ cursor: "pointer" }} onClick={() => navigate(`/rate-plans/${rp.id}`)}>
                          <div className="cell-strong">{rp.name}</div>
                          <div className="cell-muted" style={{ fontSize: "var(--fs-xs)" }}>{rp.id}</div>
                        </td>
                        <td><span className={`rp-mealplan-badge ${rp.mealPlanCode}`}>{rp.mealPlanCode}</span></td>
                        <td>{(rp.roomIds || []).length}</td>
                        <td className="cell-strong">{fmt(activeRate(rp))}</td>
                        <td>
                          <span className={`badge ${rp.status === "Active" ? "badge-success" : rp.status === "Draft" ? "badge-warning" : "badge-neutral"}`}>{rp.status}</span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-btn btn-sm" data-tooltip="View" onClick={() => navigate(`/rate-plans/${rp.id}`)}><Eye /></button>
                            <button className="icon-btn btn-sm" data-tooltip="Edit" onClick={() => openEdit(rp)}><Pencil /></button>
                            <button className="icon-btn btn-sm" data-tooltip="Duplicate" onClick={() => handleDuplicate(rp)}><Copy /></button>
                            <button className="icon-btn btn-sm" data-tooltip={rp.status === "Archived" ? "Restore" : "Archive"} onClick={() => handleArchiveToggle(rp)}>
                              {rp.status === "Archived" ? <ArchiveRestore /> : <Archive />}
                            </button>
                            <button className="icon-btn btn-sm" data-tooltip="Delete" onClick={() => setConfirmDelete(rp)}><Trash2 /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2" style={{ justifyContent: "flex-end", marginTop: "var(--space-4)" }}>
                  <button className="icon-btn btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft /></button>
                  <span className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>Page {page} of {totalPages}</span>
                  <button className="icon-btn btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight /></button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <RatePlanWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        mode={wizardMode}
        propertyId={propertyId}
        propertyName={activeProperty?.name}
        ratePlan={activePlan}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Rate Plan"
        subtitle={confirmDelete === "bulk" ? `Delete ${selectedIds.length} selected rate plans?` : `Delete "${confirmDelete?.name}"?`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => (confirmDelete === "bulk" ? handleBulkDelete() : handleDelete(confirmDelete))}><Trash2 /> Delete</button>
          </>
        }
      >
        <p className="flex items-center gap-2" style={{ color: "var(--c-danger)" }}>
          <AlertTriangle style={{ width: 16, height: 16 }} /> This will remove {confirmDelete === "bulk" ? "these rate plans" : "this rate plan"} from the calendar and dashboard analytics. This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
