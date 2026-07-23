import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Download, Sparkles, Building2, BedDouble, Layers, Scale, TrendingUp, TrendingDown, Minus,
  GitCompareArrows, Globe, ShoppingCart, LineChart, Star,
} from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import ChooseBenchmarkModal from "../components/properties/ChooseBenchmarkModal";
import { useData } from "../context/DataContext";

export default function Dashboard() {
  const { company, properties, rooms, ratePlans, benchmarkProperty, competitors } = useData();
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);

  const activeProperties = properties.filter((p) => p.status === "Active").length;
  const roomCategories = rooms.length;
  const liveRatePlans = ratePlans.filter((rp) => rp.status === "Active").length;
  const posDiff = (((competitors.summary.competitorAverage - competitors.summary.ourAverage) / competitors.summary.competitorAverage) * 100).toFixed(1);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Dashboard" }]}
        title={`Welcome back, ${company.owner.name.split(" ")[0]} 👋`}
        subtitle={`Here's a snapshot of ${company.name}'s rate intelligence workspace across all properties.`}
        actions={
          <>
            <button className="btn btn-secondary"><Download /> Export</button>
            <button className="btn btn-primary"><Sparkles /> Ask Rate Assistant</button>
          </>
        }
      />

      <section className="card-grid" aria-label="Key metrics">
        <div className="card stat-card card-hover">
          <div className="stat-card__top">
            <span className="stat-card__label">Active Properties</span>
            <span className="stat-card__icon"><Building2 /></span>
          </div>
          <div className="stat-card__value">{activeProperties}</div>
          <span className="stat-card__trend up"><TrendingUp /> of {properties.length} total</span>
        </div>
        <div className="card stat-card card-hover">
          <div className="stat-card__top">
            <span className="stat-card__label">Room Categories</span>
            <span className="stat-card__icon"><BedDouble /></span>
          </div>
          <div className="stat-card__value">{roomCategories}</div>
          <span className="stat-card__trend flat"><Minus /> Across all properties</span>
        </div>
        <div className="card stat-card card-hover">
          <div className="stat-card__top">
            <span className="stat-card__label">Live Rate Plans</span>
            <span className="stat-card__icon"><Layers /></span>
          </div>
          <div className="stat-card__value">{liveRatePlans}</div>
          <span className="stat-card__trend up"><TrendingUp /> {ratePlans.length} configured total</span>
        </div>
        <div className="card stat-card card-hover">
          <div className="stat-card__top">
            <span className="stat-card__label">Avg. Rate vs Comp Set</span>
            <span className="stat-card__icon"><Scale /></span>
          </div>
          <div className="stat-card__value">{posDiff > 0 ? "−" : "+"}{Math.abs(posDiff)}%</div>
          <span className={`stat-card__trend ${posDiff > 0 ? "down" : "up"}`}>
            {posDiff > 0 ? <TrendingDown /> : <TrendingUp />} {posDiff > 0 ? "Cheaper" : "Pricier"} than market
          </span>
        </div>
      </section>

      {benchmarkProperty && (
        <section className="card" style={{ marginTop: "var(--space-6)" }}>
          <div className="card__body" style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <div className="accordion__icon" style={{ width: 44, height: 44, background: "var(--grad-primary)", color: "#fff" }}>
              <Star />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 650 }}>{benchmarkProperty.name} is "Our Property"</div>
              <div className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>
                All rate comparisons, the calendar and analytics are measured against this property.
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setBenchmarkModalOpen(true)}>Change Benchmark</button>
          </div>
        </section>
      )}

      {benchmarkModalOpen && (
        <ChooseBenchmarkModal open={benchmarkModalOpen} onClose={() => setBenchmarkModalOpen(false)} />
      )}

      <section className="card" style={{ marginTop: "var(--space-6)" }}>
        <div className="card__header">
          <div>
            <div className="card__title">Rate Intelligence Modules</div>
            <div className="card__subtitle">More analytics modules are on the roadmap — designed and ready for backend integration.</div>
          </div>
          <span className="badge badge-info">Coming Soon</span>
        </div>
        <div className="card__body">
          <div className="card-grid">
            {[
              { icon: GitCompareArrows, title: "Room-to-Room Comparison", desc: "Compare rate positioning across your own room categories." },
              { icon: Globe, title: "Competitor Comparison", desc: "Benchmark rates against your compset in real time." },
              { icon: ShoppingCart, title: "Rate Shopping", desc: "Automated OTA rate shops delivered via the HMS." },
              { icon: LineChart, title: "Revenue Intelligence", desc: "Yield management and pricing recommendations." },
            ].map((m) => (
              <article className="card card-hover" style={{ padding: "var(--space-5)" }} key={m.title}>
                <div className="accordion__icon" style={{ marginBottom: "var(--space-3)" }}><m.icon /></div>
                <h3 style={{ fontSize: "var(--fs-base)", marginBottom: 4 }}>{m.title}</h3>
                <p className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>{m.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
