import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Plus, Pencil, Trash2, Copy, Archive, ArchiveRestore, Eye,
  Search, AlertTriangle, ChevronLeft, ChevronRight,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import RoomWizardModal from "../../components/rooms/RoomWizardModal";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";

const PAGE_SIZE = 6;

export default function RoomsPage() {
  const { properties, getRoomsByProperty, getRatePlansByRoom, updateRoom, deleteRoom, duplicateRoom } = useData();
  const toast = useToast();
  const navigate = useNavigate();

  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("displayOrder");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState("create");
  const [activeRoom, setActiveRoom] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // room or "bulk"

  const allRooms = useMemo(() => getRoomsByProperty(selectedPropertyId), [getRoomsByProperty, selectedPropertyId]);

  const filtered = useMemo(() => {
    let list = allRooms.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()));
    if (statusFilter !== "All") list = list.filter((r) => r.status === statusFilter);
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "maxOccupancy") return b.maxOccupancy - a.maxOccupancy;
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
    return list;
  }, [allRooms, query, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRooms = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function selectProperty(id) {
    setSelectedPropertyId(id);
    setSelectedIds([]);
    setPage(1);
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleSelectAllOnPage() {
    const pageIds = pageRooms.map((r) => r.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) => (allSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]));
  }

  function openCreate() {
    setWizardMode("create");
    setActiveRoom(null);
    setWizardOpen(true);
  }
  function openEdit(room) {
    setWizardMode("edit");
    setActiveRoom(room);
    setWizardOpen(true);
  }

  function handleDuplicate(room) {
    const copy = duplicateRoom(room.id);
    toast({ title: "Room duplicated", message: `${copy.name} created as Inactive — review before activating.`, type: "success" });
  }
  function handleArchiveToggle(room) {
    const next = room.status === "Active" ? "Inactive" : "Active";
    updateRoom(room.id, { status: next });
    toast({ title: next === "Inactive" ? "Room archived" : "Room restored", type: "info" });
  }
  function handleDelete(room) {
    deleteRoom(room.id);
    toast({ title: "Room deleted", message: `${room.name} and its linked rate plans were removed.`, type: "info" });
    setConfirmDelete(null);
    setSelectedIds((prev) => prev.filter((id) => id !== room.id));
  }
  function handleBulkDelete() {
    selectedIds.forEach((id) => deleteRoom(id));
    toast({ title: `${selectedIds.length} rooms deleted`, type: "info" });
    setSelectedIds([]);
    setConfirmDelete(null);
  }
  function handleBulkStatus(status) {
    selectedIds.forEach((id) => updateRoom(id, { status }));
    toast({ title: `${selectedIds.length} rooms marked ${status}`, type: "success" });
    setSelectedIds([]);
  }

  const activeProperty = properties.find((p) => p.id === selectedPropertyId);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Rooms" }]}
        title="Room Management"
        subtitle="Select a property on the left to manage its room categories."
        actions={
          <button className="btn btn-primary" onClick={openCreate} disabled={!selectedPropertyId}>
            <Plus /> Add Room
          </button>
        }
      />

      <div className="module-layout">
        <aside className="filter-panel">
          <div className="card filter-panel__section">
            <div className="filter-panel__label"><Building2 /> Property</div>
            <div className="filter-option-list">
              {properties.map((p) => (
                <div key={p.id} className={`filter-option ${p.id === selectedPropertyId ? "is-active" : ""}`} onClick={() => selectProperty(p.id)}>
                  <span className="filter-option__avatar">{p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                  <span><div>{p.name}</div><div className="filter-option__meta">{p.id}</div></span>
                  <span className="badge badge-neutral">{getRoomsByProperty(p.id).length}</span>
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
                  placeholder="Search rooms..."
                  style={{ border: "none", background: "transparent", outline: "none", fontSize: "var(--fs-sm)", width: 140 }}
                />
              </div>
              <select className="select-pill" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ cursor: "pointer" }}>
                <option value="All">All statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <select className="select-pill" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ cursor: "pointer" }}>
                <option value="displayOrder">Display order</option>
                <option value="name">Name (A–Z)</option>
                <option value="maxOccupancy">Max occupancy</option>
              </select>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="card" style={{ padding: "var(--space-3) var(--space-5)", marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <span className="badge badge-info">{selectedIds.length} selected</span>
              <button className="btn btn-ghost btn-sm" onClick={() => handleBulkStatus("Active")}>Mark Active</button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleBulkStatus("Inactive")}>Archive</button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--c-danger)" }} onClick={() => setConfirmDelete("bulk")}>Delete Selected</button>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setSelectedIds([])}>Clear</button>
            </div>
          )}

          {!selectedPropertyId ? (
            <div className="card"><EmptyState icon={Building2} title="Select a property" desc="Choose a property from the left panel to view its rooms." /></div>
          ) : filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={Building2}
                title={allRooms.length === 0 ? `No rooms yet for ${activeProperty?.name}` : "No rooms match your filters"}
                desc={allRooms.length === 0 ? "Add the first room category for this property, e.g. Deluxe Room, Suite." : "Try adjusting your search or status filter."}
                action={allRooms.length === 0 && <button className="btn btn-primary" onClick={openCreate}><Plus /> Add Room</button>}
              />
            </div>
          ) : (
            <>
              <div className="table-wrap card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}>
                        <input type="checkbox" checked={pageRooms.every((r) => selectedIds.includes(r.id))} onChange={toggleSelectAllOnPage} />
                      </th>
                      <th>Room</th><th>Occupancy</th><th>Area</th><th>Rate Plans</th><th>Status</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRooms.map((r) => (
                      <tr key={r.id}>
                        <td><input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                        <td style={{ cursor: "pointer" }} onClick={() => navigate(`/rooms/${r.id}`)}>
                          <div className="flex items-center gap-3">
                            <div className="entity-card__avatar" style={{ width: 36, height: 36, fontSize: 11 }}>{r.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
                            <div>
                              <div className="cell-strong">{r.name}</div>
                              <div className="cell-muted" style={{ fontSize: "var(--fs-xs)" }}>{r.id}</div>
                            </div>
                          </div>
                        </td>
                        <td>{r.maxAdults} Adults · {r.maxChildren} Children</td>
                        <td className="cell-muted">{r.areaValue} {r.areaUnit}</td>
                        <td><span className="badge badge-neutral">{getRatePlansByRoom(r.id).length}</span></td>
                        <td>{r.status === "Active" ? <span className="badge badge-success">Active</span> : <span className="badge badge-neutral">Inactive</span>}</td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-btn btn-sm" data-tooltip="View" onClick={() => navigate(`/rooms/${r.id}`)}><Eye /></button>
                            <button className="icon-btn btn-sm" data-tooltip="Edit" onClick={() => openEdit(r)}><Pencil /></button>
                            <button className="icon-btn btn-sm" data-tooltip="Duplicate" onClick={() => handleDuplicate(r)}><Copy /></button>
                            <button className="icon-btn btn-sm" data-tooltip={r.status === "Active" ? "Archive" : "Restore"} onClick={() => handleArchiveToggle(r)}>
                              {r.status === "Active" ? <Archive /> : <ArchiveRestore />}
                            </button>
                            <button className="icon-btn btn-sm" data-tooltip="Delete" onClick={() => setConfirmDelete(r)}><Trash2 /></button>
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

      <RoomWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        mode={wizardMode}
        propertyId={selectedPropertyId}
        propertyName={activeProperty?.name}
        room={activeRoom}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Room"
        subtitle={confirmDelete === "bulk" ? `Delete ${selectedIds.length} selected rooms?` : `Delete "${confirmDelete?.name}"?`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => (confirmDelete === "bulk" ? handleBulkDelete() : handleDelete(confirmDelete))}>
              <Trash2 /> Delete
            </button>
          </>
        }
      >
        <p className="flex items-center gap-2" style={{ color: "var(--c-danger)" }}>
          <AlertTriangle style={{ width: 16, height: 16 }} /> This will also remove any rate plans linked to {confirmDelete === "bulk" ? "these rooms" : "this room"}. This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
