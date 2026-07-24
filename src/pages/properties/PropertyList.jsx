import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, Star, Fingerprint, Pencil, ArrowUpRight, Trash2, AlertTriangle,
  MapPin, Filter, LayoutGrid, List,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import SearchBox from "../../components/ui/SearchBox";
import ChooseBenchmarkModal from "../../components/properties/ChooseBenchmarkModal";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";

function StarRow({ n }) {
  return (
    <div className="star-row">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} style={i < n ? {} : { fill: "none", color: "var(--border-strong)" }} />
      ))}
    </div>
  );
}

const SORT_OPTIONS = [
  { value: "updated", label: "Recently updated" },
  { value: "name", label: "Name (A–Z)" },
  { value: "stars", label: "Star category (high–low)" },
];

export default function PropertyList() {
  const { company, properties, getRoomsByProperty, getRatePlansByProperty, deleteProperty } = useData();
  const toast = useToast();
  const navigate = useNavigate();

  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);
  const [view, setView] = useState(() => localStorage.getItem("rateiq_properties_view") || "grid");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("updated");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const cities = useMemo(() => [...new Set(properties.map((p) => p.city))].sort(), [properties]);
  const countries = useMemo(() => [...new Set(properties.map((p) => p.country))].sort(), [properties]);

  const filtered = useMemo(() => {
    let list = properties;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    if (statusFilter !== "All") list = list.filter((p) => p.status === statusFilter);
    if (cityFilter !== "All") list = list.filter((p) => p.city === cityFilter);
    if (countryFilter !== "All") list = list.filter((p) => p.country === countryFilter);
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "stars") return b.starCategory - a.starCategory;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    return list;
  }, [properties, query, statusFilter, cityFilter, countryFilter, sortBy]);

  function handleDelete(p) {
    deleteProperty(p.id);
    toast({ title: "Property deleted", message: `${p.name} and its rooms/rate plans were removed.`, type: "info" });
    setConfirmDelete(null);
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Properties" }]}
        title="Property Management"
        subtitle={`All properties owned by ${company.name}. Each Property ID is immutable and used for future HMS integration.`}
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setBenchmarkModalOpen(true)}>
              <Star /> Choose Benchmark Property
            </button>
            <Link to="/properties/new" className="btn btn-primary"><Plus /> Add Property</Link>
          </>
        }
      />

      <div className="toolbar">
        <div className="filter-bar">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Search properties..."
            suggestions={properties.map((p) => ({ id: p.id, label: p.name, meta: p.id }))}
            onSelectSuggestion={(m) => navigate(`/properties/${m.id}`)}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "All", label: "All statuses" },
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
          />
          <Select
            searchable
            value={cityFilter}
            onChange={setCityFilter}
            options={[{ value: "All", label: "All cities" }, ...cities.map((c) => ({ value: c, label: c }))]}
          />
          <Select
            searchable
            value={countryFilter}
            onChange={setCountryFilter}
            options={[{ value: "All", label: "All countries" }, ...countries.map((c) => ({ value: c, label: c }))]}
          />
          <Select value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
        </div>

        <div className="view-toggle" role="tablist" aria-label="View mode">
          <button type="button" className={view === "grid" ? "is-active" : ""} onClick={() => { setView("grid"); localStorage.setItem("rateiq_properties_view", "grid"); }} data-tooltip="Grid view">
            <LayoutGrid />
          </button>
          <button type="button" className={view === "list" ? "is-active" : ""} onClick={() => { setView("list"); localStorage.setItem("rateiq_properties_view", "list"); }} data-tooltip="List view">
            <List />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Filter}
            title="No properties match your filters"
            desc="Try adjusting the status, city or country filter."
          />
        </div>
      ) : view === "grid" ? (
        <section className="card-grid" aria-label="Property list">
          {filtered.map((p) => (
            <Link to={`/properties/${p.id}`} className="card card-hover entity-card entity-card--clickable" key={p.id}>
              <div className="entity-card__top">
                <div className="entity-card__avatar">{p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="entity-card__title">{p.name}</div>
                  <div className="entity-card__meta"><MapPin style={{ width: 11, height: 11 }} /> {p.city}, {p.country}</div>
                </div>
                {p.status === "Active" ? (
                  <span className="badge badge-success pulse">Active</span>
                ) : (
                  <span className="badge badge-neutral">Inactive</span>
                )}
              </div>

              <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                <span className="property-id-chip locked"><Fingerprint /> {p.id}</span>
                {p.isBenchmark && <span className="benchmark-badge"><Star /> Our Property</span>}
              </div>

              <StarRow n={p.starCategory} />
              <p className="entity-card__desc">{p.description}</p>

              <div className="entity-card__stats">
                <div><strong>{getRoomsByProperty(p.id).length}</strong>Rooms</div>
                <div><strong>{getRatePlansByProperty(p.id).length}</strong>Rate Plans</div>
                <div><strong>{p.currency.split(" ")[0]}</strong>Currency</div>
              </div>

              <div className="entity-card__footer">
                <span className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>Updated {p.updatedAt}</span>
                <div className="entity-card__actions">
                  <Link to={`/properties/${p.id}`} className="icon-btn btn-sm" data-tooltip="View & Edit" onClick={(e) => e.stopPropagation()}>
                    <Pencil />
                  </Link>
                  <Link to={`/rooms?propertyId=${p.id}`} className="icon-btn btn-sm" data-tooltip="View rooms" onClick={(e) => e.stopPropagation()}>
                    <ArrowUpRight />
                  </Link>
                  <button
                    type="button"
                    className="icon-btn btn-sm"
                    data-tooltip="Delete"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(p); }}
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <div className="table-wrap card">
          <table className="data-table is-compact">
            <thead>
              <tr>
                <th>Property</th><th>Location</th><th>Star</th><th>Rooms</th><th>Rate Plans</th><th>Status</th><th>Updated</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/properties/${p.id}`)}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="entity-card__avatar" style={{ width: 36, height: 36, fontSize: 11 }}>{p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
                      <div>
                        <div className="cell-strong">{p.name}{p.isBenchmark && <Star style={{ width: 12, height: 12, display: "inline", marginLeft: 6, color: "var(--c-warning)", fill: "var(--c-warning)" }} />}</div>
                        <div className="cell-muted" style={{ fontSize: "var(--fs-xs)" }}>{p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="cell-muted">{p.city}, {p.country}</td>
                  <td>{p.starCategory}★</td>
                  <td>{getRoomsByProperty(p.id).length}</td>
                  <td>{getRatePlansByProperty(p.id).length}</td>
                  <td>{p.status === "Active" ? <span className="badge badge-success">Active</span> : <span className="badge badge-neutral">Inactive</span>}</td>
                  <td className="cell-muted">{p.updatedAt}</td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/properties/${p.id}`} className="icon-btn btn-sm" data-tooltip="View & Edit" onClick={(e) => e.stopPropagation()}><Pencil /></Link>
                      <Link to={`/rooms?propertyId=${p.id}`} className="icon-btn btn-sm" data-tooltip="View rooms" onClick={(e) => e.stopPropagation()}><ArrowUpRight /></Link>
                      <button type="button" className="icon-btn btn-sm" data-tooltip="Delete" onClick={(e) => { e.stopPropagation(); setConfirmDelete(p); }}><Trash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Property"
        subtitle={`Delete "${confirmDelete?.name}"?`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}><Trash2 /> Delete</button>
          </>
        }
      >
        <p className="flex items-center gap-2" style={{ color: "var(--c-danger)" }}>
          <AlertTriangle style={{ width: 16, height: 16 }} /> This will also remove every room and rate plan linked to this property. This action cannot be undone.
        </p>
      </Modal>

      <ChooseBenchmarkModal open={benchmarkModalOpen} onClose={() => setBenchmarkModalOpen(false)} />
    </>
  );
}
