import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2, BedDouble, Plus, Pencil, Trash2, Copy, Archive, ArchiveRestore, Eye,
  AlertTriangle, ChevronLeft, ChevronRight, LayoutGrid, List, CalendarRange,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import SearchBox from "../../components/ui/SearchBox";
import RatePlanWizardModal from "../../components/rateplans/RatePlanWizardModal";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";

const PAGE_SIZE = 6;
const fmt = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);

function activePeriodOf(pricingPeriods) {
  const today = new Date();
  return pricingPeriods.find((p) => new Date(p.effectiveFrom) <= today && today <= new Date(p.effectiveTo)) || pricingPeriods[0];
}

// Lowest current Double rate across all meal plans bundled in this rate plan —
// used for sorting/at-a-glance display; the detail page shows each meal plan's
// own rate individually.
function activeRate(rp) {
  const rates = (rp.mealPlans || [])
    .map((mp) => activePeriodOf(mp.pricingPeriods)?.rates?.Double || 0)
    .filter((v) => v > 0);
  return rates.length ? Math.min(...rates) : 0;
}

// The pricing period currently in effect, taken from the plan's first meal
// plan — used for the Grid view's "Current Pricing Period" summary.
function activePricingWindow(rp) {
  const period = (rp.mealPlans || []).map((mp) => activePeriodOf(mp.pricingPeriods)).find(Boolean);
  return period ? `${period.effectiveFrom} → ${period.effectiveTo}` : "—";
}

const VIEW_STORAGE_KEY = "rateiq_rateplans_view";

export default function RatePlansPage() {
  const { properties, getRatePlansByProperty, getRoomsByProperty, getRoomById, updateRatePlan, deleteRatePlan, duplicateRatePlan } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [propertyId, setPropertyId] = useState(searchParams.get("propertyId") || properties[0]?.id);
  const [roomId, setRoomId] = useState(searchParams.get("roomId") || null);
  const [view, setView] = useState(() => localStorage.getItem(VIEW_STORAGE_KEY) || "list");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState("create");
  const [activePlan, setActivePlan] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  function changeView(v) {
    setView(v);
    localStorage.setItem(VIEW_STORAGE_KEY, v);
  }

  const propertyRooms = useMemo(() => getRoomsByProperty(propertyId), [getRoomsByProperty, propertyId]);

  // Room is required before rate plans are shown, per the Property → Room →
  // Rate Plan hierarchy. Default to the first room whenever the property
  // (or its room list) changes and the current selection no longer applies.
  useEffect(() => {
    if (!propertyRooms.some((r) => r.id === roomId)) {
      setRoomId(propertyRooms[0]?.id || null);
    }
  }, [propertyRooms, roomId]);

  const allPlans = useMemo(() => getRatePlansByProperty(propertyId), [getRatePlansByProperty, propertyId]);

  const filtered = useMemo(() => {
    let list = allPlans.filter((rp) => rp.name.toLowerCase().includes(query.trim().toLowerCase()));
    if (roomId) list = list.filter((rp) => (rp.roomIds || []).includes(roomId));
    if (statusFilter !== "All") list = list.filter((rp) => rp.status === statusFilter);
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "rate") return activeRate(b) - activeRate(a);
      return 0;
    });
    return list;
  }, [allPlans, query, statusFilter, sortBy, roomId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagePlans = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function selectProperty(id) {
    setPropertyId(id);
    setRoomId(null);
    setSelectedIds([]);
    setPage(1);
  }

  function selectRoom(id) {
    setRoomId(id);
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
  const activeRoom = roomId ? getRoomById(roomId) : null;
  // A single checked row reads as "the" selected Rate Plan for breadcrumb
  // purposes, completing the Property > Room > Rate Plan chain.
  const activeRatePlan = selectedIds.length === 1 ? allPlans.find((rp) => rp.id === selectedIds[0]) : null;

  // Breadcrumb mirrors the live selection chain, the same chain that drives
  // the filter panel and the table below it.
  const selectionCrumbs = [
    { label: "Dashboard", to: "/" },
    { label: "Rate Plans", to: activeProperty ? "/rate-plans" : undefined },
  ];
  if (activeProperty) selectionCrumbs.push({ label: activeProperty.name, to: activeRoom ? "/rate-plans" : undefined });
  if (activeRoom) selectionCrumbs.push({ label: activeRoom.name, to: activeRatePlan ? "/rate-plans" : undefined });
  if (activeRatePlan) selectionCrumbs.push({ label: activeRatePlan.name });

  return (
    <>
      <PageHeader
        crumbs={selectionCrumbs}
        title="Rate Plan Management"
        subtitle="Select a Property and Room on the left to manage its rate plans."
        actions={<button className="btn btn-primary" onClick={openCreate} disabled={!roomId}><Plus /> Add Rate Plan</button>}
      />

      <div className="module-layout">
        <aside className="filter-panel">
          <div className="card filter-panel__section">
            <div className="filter-panel__label"><Building2 /> Property</div>
            <Select
              searchable
              placeholder="Select a property..."
              value={propertyId || ""}
              onChange={selectProperty}
              options={properties.map((p) => ({ value: p.id, label: `${p.name} (${getRatePlansByProperty(p.id).length} plans)` }))}
            />
            {activeProperty && <div className="filter-panel__hint">{activeProperty.id}</div>}
          </div>
          <div className="card filter-panel__section">
            <div className="filter-panel__label"><BedDouble /> Room</div>
            {propertyRooms.length === 0 ? (
              <div className="filter-empty">No rooms configured for this property yet.</div>
            ) : (
              <>
                <Select
                  searchable
                  placeholder="Select a room..."
                  value={roomId || ""}
                  onChange={selectRoom}
                  options={propertyRooms.map((r) => ({ value: r.id, label: `${r.name} (${allPlans.filter((rp) => (rp.roomIds || []).includes(r.id)).length} plans)` }))}
                />
                {roomId && <div className="filter-panel__hint">{roomId}</div>}
              </>
            )}
          </div>
        </aside>

        <div>
          <div className="toolbar">
            <div className="filter-bar">
              <SearchBox
                value={query}
                onChange={(v) => { setQuery(v); setPage(1); }}
                placeholder="Search rate plans..."
                suggestions={allPlans.filter((rp) => !roomId || (rp.roomIds || []).includes(roomId)).map((rp) => ({ id: rp.id, label: rp.name, meta: rp.id }))}
                onSelectSuggestion={(m) => navigate(`/rate-plans/${m.id}`)}
              />
              <Select
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v); setPage(1); }}
                options={[
                  { value: "All", label: "All statuses" },
                  { value: "Draft", label: "Draft" },
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                  { value: "Archived", label: "Archived" },
                ]}
              />
              <Select
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: "name", label: "Name (A–Z)" },
                  { value: "rate", label: "Double rate (high–low)" },
                ]}
              />
            </div>
            <div className="view-toggle" role="tablist" aria-label="View mode">
              <button type="button" className={view === "grid" ? "is-active" : ""} onClick={() => changeView("grid")} data-tooltip="Grid view">
                <LayoutGrid />
              </button>
              <button type="button" className={view === "list" ? "is-active" : ""} onClick={() => changeView("list")} data-tooltip="List view">
                <List />
              </button>
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
            <div className="card"><EmptyState icon={Building2} title="Select a property" desc="Choose a property from the left panel to view its rooms and rate plans." /></div>
          ) : propertyRooms.length === 0 ? (
            <div className="card"><EmptyState icon={BedDouble} title="No rooms configured" desc="Add rooms to this property before managing rate plans." /></div>
          ) : !roomId ? (
            <div className="card"><EmptyState icon={BedDouble} title="Select a room" desc="Choose a room from the left panel to view its rate plans." /></div>
          ) : filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={Building2}
                title={allPlans.length === 0 ? `No rate plans yet for ${activeProperty?.name}` : "No rate plans match your filters"}
                desc={allPlans.length === 0 ? "Attach a meal plan, room assignment and pricing to get started." : "Try adjusting your search, room or status filter."}
                action={<button className="btn btn-primary" onClick={openCreate}><Plus /> Add Rate Plan</button>}
              />
            </div>
          ) : view === "grid" ? (
            <section className="card-grid" aria-label="Rate plan list">
              {pagePlans.map((rp) => {
                const linkedRooms = (rp.roomIds || []).map((rid) => getRoomById(rid)).filter(Boolean);
                const roomLabel = getRoomById(roomId)?.name || linkedRooms[0]?.name || "—";
                return (
                  <article
                    className="card card-hover entity-card entity-card--clickable"
                    key={rp.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/rate-plans/${rp.id}`)}
                  >
                    <div className="entity-card__top">
                      <div className="entity-card__avatar">{rp.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="entity-card__title">{rp.name}</div>
                        <div className="entity-card__meta">{activeProperty?.name} · {roomLabel}</div>
                      </div>
                      <span className={`badge ${rp.status === "Active" ? "badge-success pulse" : rp.status === "Draft" ? "badge-warning" : "badge-neutral"}`}>{rp.status}</span>
                    </div>

                    <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                      {(rp.mealPlans || []).map((mp) => (
                        <span key={mp.mealPlanCode} className={`rp-mealplan-badge ${mp.mealPlanCode}`}>{mp.mealPlanCode}</span>
                      ))}
                    </div>

                    <div className="text-muted" style={{ fontSize: "var(--fs-xs)", display: "flex", alignItems: "center", gap: 6 }}>
                      <CalendarRange style={{ width: 12, height: 12 }} /> {activePricingWindow(rp)}
                    </div>

                    <div className="entity-card__stats">
                      <div><strong>{fmt(activeRate(rp))}</strong>Starting Rate</div>
                      <div><strong>{(rp.mealPlans || []).length}</strong>Meal Plans</div>
                      <div><strong>{linkedRooms.length}</strong>Rooms</div>
                    </div>

                    <div className="entity-card__footer">
                      <span className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>Updated {rp.modifiedDate}</span>
                      <div className="entity-card__actions">
                        <button className="icon-btn btn-sm" data-tooltip="View" onClick={(e) => { e.stopPropagation(); navigate(`/rate-plans/${rp.id}`); }}><Eye /></button>
                        <button className="icon-btn btn-sm" data-tooltip="Edit" onClick={(e) => { e.stopPropagation(); openEdit(rp); }}><Pencil /></button>
                        <button className="icon-btn btn-sm" data-tooltip="Duplicate" onClick={(e) => { e.stopPropagation(); handleDuplicate(rp); }}><Copy /></button>
                        <button className="icon-btn btn-sm" data-tooltip="Delete" onClick={(e) => { e.stopPropagation(); setConfirmDelete(rp); }}><Trash2 /></button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <>
              <div className="table-wrap card">
                <table className="data-table is-compact">
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}>
                        <input type="checkbox" checked={pagePlans.every((r) => selectedIds.includes(r.id))} onChange={toggleSelectAllOnPage} />
                      </th>
                      <th>Rate Plan</th><th>Room</th><th>Meal Plans</th><th>Starting Rate</th><th>Status</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagePlans.map((rp) => {
                      const linkedRooms = (rp.roomIds || []).map((id) => getRoomById(id)).filter(Boolean);
                      return (
                      <tr key={rp.id} className={selectedIds.includes(rp.id) ? "is-selected" : ""}>
                        <td><input type="checkbox" checked={selectedIds.includes(rp.id)} onChange={() => toggleSelect(rp.id)} /></td>
                        <td style={{ cursor: "pointer" }} onClick={() => navigate(`/rate-plans/${rp.id}`)}>
                          <div className="cell-strong">{rp.name}</div>
                          <div className="cell-muted" style={{ fontSize: "var(--fs-xs)" }}>{rp.id}</div>
                        </td>
                        <td>
                          <div className="cell-strong">{getRoomById(roomId)?.name || linkedRooms[0]?.name || "—"}</div>
                          {linkedRooms.length > 1 && (
                            <div className="cell-muted" style={{ fontSize: "var(--fs-xs)" }}>+{linkedRooms.length - 1} more room{linkedRooms.length - 1 > 1 ? "s" : ""}</div>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                            {(rp.mealPlans || []).map((mp) => (
                              <span key={mp.mealPlanCode} className={`rp-mealplan-badge ${mp.mealPlanCode}`}>{mp.mealPlanCode}</span>
                            ))}
                          </div>
                        </td>
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
                      );
                    })}
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
        initialRoomIds={wizardMode === "create" && roomId ? [roomId] : []}
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
