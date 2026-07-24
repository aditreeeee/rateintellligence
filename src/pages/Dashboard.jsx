import { Link } from "react-router-dom";
import {
  Download, Sparkles, Building2, BedDouble, Layers, Scale, TrendingUp, TrendingDown, Minus,
  GitCompareArrows, Globe, ShoppingCart, LineChart, ArrowUpRight,
} from "lucide-react";
import { useData } from "../context/DataContext";

export default function Dashboard() {
  const { company, properties, rooms, ratePlans, competitors } = useData();

  const activeProperties = properties.filter((p) => p.status === "Active").length;
  const roomCategories = rooms.length;
  const liveRatePlans = ratePlans.filter((rp) => rp.status === "Active").length;
  const posDiff = (((competitors.summary.competitorAverage - competitors.summary.ourAverage) / competitors.summary.competitorAverage) * 100).toFixed(1);
  const isCheaper = posDiff > 0;

  return (
    <>
      <section className="dash-hero">
        <div className="dash-hero__glow"></div>
        <div className="dash-hero__row">
          <div>
            <div className="breadcrumbs" style={{ marginBottom: "var(--space-3)" }}><span className="current">Dashboard</span></div>
            <h1 className="dash-hero__title">Welcome back, {company.owner.name.split(" ")[0]} <span className="dash-hero__wave">👋</span></h1>
            <p className="dash-hero__subtitle">Here's a snapshot of {company.name}'s rate intelligence workspace across all properties.</p>
          </div>
          <div className="dash-hero__actions">
            <button className="btn btn-secondary"><Download /> Export</button>
            <button className="btn btn-primary"><Sparkles /> Ask Rate Assistant</button>
          </div>
        </div>

        {/* Featured metric — the single most decision-relevant number gets
            visual priority instead of competing equally with three others. */}
        <div className="dash-hero__featured">
          <div className="dash-hero__featured-icon"><Scale /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="dash-hero__featured-label">Average Rate vs. Comp Set</div>
            <div className="dash-hero__featured-value">
              {isCheaper ? "−" : "+"}{Math.abs(posDiff)}%
              <span className={`stat-card__trend ${isCheaper ? "up" : "down"}`} style={{ marginLeft: "var(--space-3)" }}>
                {isCheaper ? <TrendingDown /> : <TrendingUp />} {isCheaper ? "Cheaper" : "Pricier"} than market
              </span>
            </div>
          </div>
          <Link to="/comparison" className="dash-hero__featured-link">
            View Rate Comparison <ArrowUpRight style={{ width: 15, height: 15 }} />
          </Link>
        </div>
      </section>

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
      </section>

      <section className="card" style={{ marginTop: "var(--space-7)" }}>
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
              <article className="card card-hover module-tile" key={m.title}>
                <div className="accordion__icon module-tile__icon"><m.icon /></div>
                <h3 style={{ fontSize: "var(--fs-base)", marginBottom: 4, fontWeight: 650 }}>{m.title}</h3>
                <p className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>{m.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
