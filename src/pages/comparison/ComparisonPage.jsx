import { useMemo, useState } from "react";
import { RefreshCw, Star, Globe, TrendingDown, TrendingUp, Minus, Building2 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import ChooseBenchmarkModal from "../../components/properties/ChooseBenchmarkModal";
import { useData } from "../../context/DataContext";

const fmt = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

export default function ComparisonPage() {
  const { benchmarkProperty, competitors } = useData();
  const [selectedCompetitors, setSelectedCompetitors] = useState(competitors.competitorProperties.map((c) => c.id));
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);

  const toggleCompetitor = (id) =>
    setSelectedCompetitors((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const table = useMemo(
    () => competitors.table.filter((row) => selectedCompetitors.includes(row.competitorId)),
    [competitors, selectedCompetitors]
  );

  const maxVal = Math.max(...competitors.chart.flatMap((d) => [d.ours, d.competitor])) * 1.1;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Rate Comparison" }]}
        title={<>Rate Comparison <span className="badge badge-info" style={{ verticalAlign: "middle" }}>Preview</span></>}
        subtitle="Benchmark your rates against the competitor set. This module is UI-ready for future rate-shopping and scraping integrations delivered through the HMS."
        actions={<button className="btn btn-secondary"><RefreshCw /> Refresh Shop</button>}
      />

      <div className="module-layout">
        <aside className="filter-panel">
          <div className="card filter-panel__section">
            <div className="filter-panel__label" style={{ justifyContent: "space-between", display: "flex" }}>
              <span><Star /> Our Property</span>
              <button type="button" className="manage-inline-btn" onClick={() => setBenchmarkModalOpen(true)}>Change</button>
            </div>
            {benchmarkProperty ? (
              <div className="filter-option is-active" style={{ cursor: "default" }}>
                <span className="filter-option__avatar">{benchmarkProperty.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                <span><div>{benchmarkProperty.name}</div><div className="filter-option__meta">{benchmarkProperty.id}</div></span>
              </div>
            ) : (
              <div className="filter-empty">No benchmark property set. Choose one to continue.</div>
            )}
          </div>
          <div className="card filter-panel__section">
            <div className="filter-panel__label"><Globe /> Competitor Properties</div>
            <div className="filter-option-list">
              {competitors.competitorProperties.map((c) => (
                <label className="filter-option" key={c.id}>
                  <input type="checkbox" checked={selectedCompetitors.includes(c.id)} onChange={() => toggleCompetitor(c.id)} />
                  <span><div>{c.name}</div><div className="filter-option__meta">{c.city} · {c.starCategory}★</div></span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        <div>
          <section className="card-grid" aria-label="Comparison summary">
            <div className="card stat-card">
              <div className="stat-card__top"><span className="stat-card__label">Our Average Rate</span><span className="stat-card__icon"><Building2 /></span></div>
              <div className="stat-card__value">{fmt(competitors.summary.ourAverage)}</div>
              <span className="stat-card__trend flat"><Minus /> Across compset</span>
            </div>
            <div className="card stat-card">
              <div className="stat-card__top"><span className="stat-card__label">Competitor Average</span><span className="stat-card__icon"><Globe /></span></div>
              <div className="stat-card__value">{fmt(competitors.summary.competitorAverage)}</div>
              <span className="stat-card__trend flat"><Minus /> {selectedCompetitors.length} tracked competitors</span>
            </div>
            <div className="card stat-card">
              <div className="stat-card__top"><span className="stat-card__label">Cheaper Competitors</span><span className="stat-card__icon" style={{ background: "var(--c-success-bg)", color: "var(--c-success)" }}><TrendingDown /></span></div>
              <div className="stat-card__value">{competitors.summary.cheaperCount}</div>
              <span className="stat-card__trend up"><TrendingUp /> We're priced below</span>
            </div>
            <div className="card stat-card">
              <div className="stat-card__top"><span className="stat-card__label">Pricier Competitors</span><span className="stat-card__icon" style={{ background: "var(--c-danger-bg)", color: "var(--c-danger)" }}><TrendingUp /></span></div>
              <div className="stat-card__value">{competitors.summary.pricierCount}</div>
              <span className="stat-card__trend down"><TrendingDown /> We're priced above</span>
            </div>
          </section>

          <section className="card" style={{ marginTop: "var(--space-6)" }}>
            <div className="card__header">
              <div>
                <div className="card__title">Rate Positioning by Room &amp; Meal Plan</div>
                <div className="card__subtitle">Blue = our property · Green = we're cheaper · Coral = we're pricier</div>
              </div>
            </div>
            <div className="card__body">
              <div className="comparison-chart">
                {competitors.chart.map((d) => {
                  const cheaper = d.competitor >= d.ours;
                  return (
                    <div className="comparison-chart__group" key={d.label}>
                      <div className="comparison-chart__bars">
                        <div className="comparison-chart__bar ours" style={{ height: `${(d.ours / maxVal) * 100}%` }} data-tooltip={`Ours: ${fmt(d.ours)}`}></div>
                        <div className={`comparison-chart__bar ${cheaper ? "cheaper" : "pricier"}`} style={{ height: `${(d.competitor / maxVal) * 100}%` }} data-tooltip={`Competitor: ${fmt(d.competitor)}`}></div>
                      </div>
                      <div className="comparison-chart__label">{d.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="card" style={{ marginTop: "var(--space-6)" }}>
            <div className="card__header">
              <div className="card__title">Detailed Comparison</div>
              <span className="badge badge-neutral">Sample data</span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Meal Plan</th><th>Room</th><th>Competitor</th><th>Our Rate</th><th>Competitor Rate</th><th>Difference (₹)</th><th>Difference (%)</th><th>Position</th></tr>
                </thead>
                <tbody>
                  {table.map((row, i) => (
                    <tr key={i}>
                      <td><span className={`rp-mealplan-badge ${row.mealPlan}`}>{row.mealPlan}</span></td>
                      <td className="cell-strong">{row.room}</td>
                      <td className="cell-muted">{row.competitor}</td>
                      <td>{fmt(row.ourRate)}</td>
                      <td>{fmt(row.competitorRate)}</td>
                      <td style={{ color: row.diff >= 0 ? "var(--c-success)" : "var(--c-danger)", fontWeight: 620 }}>{row.diff >= 0 ? "+" : ""}{fmt(row.diff)}</td>
                      <td style={{ color: row.diff >= 0 ? "var(--c-success)" : "var(--c-danger)", fontWeight: 620 }}>{row.diffPct >= 0 ? "+" : ""}{row.diffPct}%</td>
                      <td>
                        <span className={`badge badge-${row.status} position-badge`}>
                          {row.status === "success" ? <TrendingDown style={{ width: 11, height: 11 }} /> : <TrendingUp style={{ width: 11, height: 11 }} />} {row.position}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <ChooseBenchmarkModal open={benchmarkModalOpen} onClose={() => setBenchmarkModalOpen(false)} />
    </>
  );
}
