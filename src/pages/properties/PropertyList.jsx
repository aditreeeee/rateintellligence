import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Star, Fingerprint, Pencil, ArrowUpRight, Filter, MapPin, ArrowUpDown } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import ChooseBenchmarkModal from "../../components/properties/ChooseBenchmarkModal";
import { useData } from "../../context/DataContext";

function StarRow({ n }) {
  return (
    <div className="star-row">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} style={i < n ? {} : { fill: "none", color: "var(--border-strong)" }} />
      ))}
    </div>
  );
}

export default function PropertyList() {
  const { company, properties, benchmarkProperty, getRoomsByProperty, getRatePlansByProperty } = useData();
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);

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

      <div className="card company-strip">
        <div className="company-strip__logo">{company.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
        <div>
          <div className="company-strip__name">{company.name}</div>
          <div className="company-strip__meta">Company Owner: {company.owner.name} · {company.admins.length} Company Admins</div>
        </div>
        <div className="company-strip__people">
          {benchmarkProperty && (
            <span className="benchmark-badge" style={{ marginRight: "var(--space-4)" }} data-tooltip="Used across Dashboard, Calendar and Rate Comparison">
              <Star /> Our Property: {benchmarkProperty.name}
            </span>
          )}
          <div className="people-stack">
            {[company.owner, ...company.admins].map((p) => (
              <div className="people-stack__avatar" key={p.email} data-tooltip={`${p.name} · ${p.role}`}>
                {p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="filter-bar">
          <div className="select-pill"><Filter /> All statuses</div>
          <div className="select-pill"><MapPin /> All cities</div>
          <div className="select-pill"><ArrowUpDown /> Recently updated</div>
        </div>
      </div>

      <section className="card-grid" aria-label="Property list">
        {properties.map((p) => (
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
                <Link
                  to={`/properties/${p.id}`}
                  className="icon-btn btn-sm"
                  data-tooltip="View & Edit"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Pencil />
                </Link>
                <Link
                  to="/rooms"
                  className="icon-btn btn-sm"
                  data-tooltip="View rooms"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ArrowUpRight />
                </Link>
              </div>
            </div>
          </Link>
        ))}
      </section>

      <ChooseBenchmarkModal open={benchmarkModalOpen} onClose={() => setBenchmarkModalOpen(false)} />
    </>
  );
}
