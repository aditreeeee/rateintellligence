import { Fragment, memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2, BedDouble, Utensils, Upload, WandSparkles, X, Check, Settings2,
  ChevronDown, ChevronRight, ChevronLeft, CalendarRange, Layers, ArrowDownNarrowWide, ArrowUpNarrowWide, Pencil,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import ManageListModal from "../../components/config/ManageListModal";
import { FieldInput } from "../../components/ui/FieldFloat";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const fmt = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

const DATE_PRESETS = [
  { key: "currentMonth", label: "Current Month" },
  { key: "last7", label: "Last 7 Days" },
  { key: "last30", label: "Last 30 Days" },
  { key: "last3months", label: "Last 3 Months" },
  { key: "lastYear", label: "Last Year" },
  { key: "custom", label: "Custom Date Range" },
];

// A window this wide keeps the DOM light no matter how large the underlying
// preset range is (e.g. Last Year = 365 days) — the range is paginated in
// fixed-size windows instead of rendering every column at once.
const WINDOW_SIZE = 31;

function toISO(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const c = new Date(d); c.setDate(c.getDate() + n); return c; }

function rangeForPreset(preset, custom, monthOffset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  switch (preset) {
    case "last7": return { from: addDays(today, -6), to: today };
    case "last30": return { from: addDays(today, -29), to: today };
    case "last3months": return { from: addDays(today, -89), to: today };
    case "lastYear": return { from: addDays(today, -364), to: today };
    case "custom": return { from: new Date(custom.from), to: new Date(custom.to) };
    case "currentMonth":
    default: {
      const from = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      const to = new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0);
      return { from, to };
    }
  }
}

function datesBetween(from, to) {
  const out = [];
  let cur = new Date(from);
  while (cur <= to) { out.push(new Date(cur)); cur = addDays(cur, 1); }
  return out;
}

function variance(seed) {
  return Math.round(Math.sin(seed * 12.9898) * 120);
}

function activePeriodFor(pricingPeriods, date) {
  return (
    pricingPeriods.find((p) => new Date(p.effectiveFrom) <= date && date <= new Date(p.effectiveTo)) ||
    pricingPeriods[0]
  );
}

// Memoized so an edit, hover, or a sibling group's collapse toggle never
// re-renders every occupancy row in the grid — only rows whose own props
// (rate, highlight flags, window) actually changed re-render.
const RateRow = memo(function RateRow({
  group, occ, occIdx, dates, windowStart, today, getRate, rateStatsRow,
  highlightLowest, highlightHighest, onCellClick,
}) {
  // Row-level event delegation: one listener per row instead of one per
  // cell — a click anywhere in the row is routed to the cell it landed on
  // via the clicked <td>'s data-col-idx, rather than each cell owning its
  // own bound handler.
  function handleRowClick(e) {
    const td = e.target.closest("td[data-col-idx]");
    if (!td) return;
    onCellClick(group, occ, Number(td.dataset.colIdx), Number(td.dataset.rate));
  }

  return (
    <tr onClick={handleRowClick}>
      <th className="row-head row-head--occupancy">
        <span className="row-head__occ-label">{occ.code}</span>
        <span className="row-head__occ-meta">{occ.name}</span>
      </th>
      {dates.map((d, colIdx) => {
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isToday = d.toDateString() === today.toDateString();
        const rate = getRate(group, occ.code, d, occIdx * 97 + colIdx * 31 + windowStart);
        const stat = rateStatsRow?.[colIdx];
        const isLowest = highlightLowest && stat && rate === stat.min;
        const isHighest = highlightHighest && stat && rate === stat.max;
        return (
          <td
            key={colIdx}
            data-col-idx={colIdx}
            data-rate={rate}
            className={`rate-cell ${isWeekend ? "is-weekend" : ""} ${isToday ? "is-today-col" : ""} ${isLowest ? "rate-cell--lowest" : ""} ${isHighest ? "rate-cell--highest" : ""}`}
            data-tooltip={`${group.room.name} · ${group.ratePlan.name} · ${group.mealPlanCode} · ${occ.code} · ${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}
          >
            <span className="rate-cell__value">{fmt(rate)}</span>
            <Pencil className="rate-cell__edit-icon" />
          </td>
        );
      })}
    </tr>
  );
});

// Group (Room · Rate Plan · Meal Plan) header row — also memoized; toggling
// one group's collapse state, or editing a rate in a different group, does
// not force this row to re-render.
const GroupHeaderRow = memo(function GroupHeaderRow({ group, dates, isCollapsed, variancePair, mealPlanName, onToggle }) {
  return (
    <tr className="rate-calendar__group-row">
      <th className="row-head row-head--group" onClick={onToggle}>
        {isCollapsed ? <ChevronRight className="row-head__chevron" /> : <ChevronDown className="row-head__chevron" />}
        <div>
          <div className="row-head__room">{group.room.name} · {group.ratePlan.name}</div>
          <div className="row-head__meal">
            <span className={`rp-mealplan-badge ${group.mealPlanCode}`} style={{ marginRight: 6 }}>{group.mealPlanCode}</span>
            {mealPlanName}
          </div>
        </div>
        {variancePair && (
          <span className="variance-badge">
            Rates vary {fmt(variancePair.min)} – {fmt(variancePair.max)}
          </span>
        )}
      </th>
      {dates.map((d, colIdx) => (
        <td key={colIdx} className={`rate-cell rate-cell--group ${d.getDay() === 0 || d.getDay() === 6 ? "is-weekend" : ""}`}></td>
      ))}
    </tr>
  );
});

export default function CalendarPage() {
  const { properties, getRoomsByProperty, getRatePlansByRoom, masterData } = useData();
  const toast = useToast();
  // Stable reference for the lifetime of the page — recreating this on every
  // render would defeat the RateRow/GroupHeaderRow memoization below.
  const today = useMemo(() => new Date(), []);

  const [preset, setPreset] = useState("currentMonth");
  const [monthOffset, setMonthOffset] = useState(0);
  const [customRange, setCustomRange] = useState({ from: toISO(addDays(today, -6)), to: toISO(today) });
  const [customOpen, setCustomOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [jumpDate, setJumpDate] = useState("");
  const presetRef = useRef(null);
  const scrollWrapRef = useRef(null);

  const fullRange = useMemo(() => rangeForPreset(preset, customRange, monthOffset), [preset, customRange, monthOffset]);
  const allDates = useMemo(() => datesBetween(fullRange.from, fullRange.to), [fullRange]);

  const [windowStart, setWindowStart] = useState(0);
  useEffect(() => { setWindowStart(0); }, [preset, customRange, monthOffset]);
  const totalWindows = Math.max(1, Math.ceil(allDates.length / WINDOW_SIZE));
  const currentWindowIdx = Math.floor(windowStart / WINDOW_SIZE);
  const dates = useMemo(
    () => allDates.slice(windowStart, windowStart + WINDOW_SIZE),
    [allDates, windowStart]
  );

  // Full month rendered in one window (≤31 days) — split into week segments
  // for the quick-scroll switcher so users can jump across the month without
  // continuous manual dragging.
  const weekSegments = useMemo(() => {
    const out = [];
    for (let i = 0; i < dates.length; i += 7) out.push(dates.slice(i, i + 7));
    return out;
  }, [dates]);

  function scrollToDate(iso) {
    const el = scrollWrapRef.current?.querySelector(`[data-date="${iso}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function handleJumpToDate(iso) {
    if (!iso) return;
    const idx = allDates.findIndex((d) => toISO(d) === iso);
    if (idx === -1) {
      toast({ title: "That date is outside the current range", type: "error" });
      return;
    }
    const targetWindow = Math.floor(idx / WINDOW_SIZE) * WINDOW_SIZE;
    if (targetWindow !== windowStart) {
      setWindowStart(targetWindow);
      setTimeout(() => scrollToDate(iso), 60);
    } else {
      scrollToDate(iso);
    }
  }

  const occupancies = masterData.occupancies.filter((o) => o.status === "Active");

  const [propertyId, setPropertyId] = useState(properties[0]?.id);
  const rooms = useMemo(() => getRoomsByProperty(propertyId), [getRoomsByProperty, propertyId]);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [selectedRoomTypeIds, setSelectedRoomTypeIds] = useState([]);
  const [selectedMealCodes, setSelectedMealCodes] = useState(masterData.mealPlans.map((m) => m.code));
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [highlightLowest, setHighlightLowest] = useState(false);
  const [highlightHighest, setHighlightHighest] = useState(false);

  useEffect(() => {
    const propRooms = getRoomsByProperty(propertyId);
    setSelectedRoomIds(propRooms.map((r) => r.id));
    setSelectedRoomTypeIds([...new Set(propRooms.map((r) => r.roomTypeId))]);
  }, [propertyId, getRoomsByProperty]);

  // Room Type facet: distinct room types present among this property's rooms,
  // each with a live count so the panel reflects the current data instantly.
  const roomTypeFacets = useMemo(() => {
    const counts = new Map();
    rooms.forEach((r) => counts.set(r.roomTypeId, (counts.get(r.roomTypeId) || 0) + 1));
    return masterData.roomTypes
      .filter((rt) => counts.has(rt.id))
      .map((rt) => ({ ...rt, count: counts.get(rt.id) }));
  }, [rooms, masterData.roomTypes]);

  const toggleRoomType = (id) => setSelectedRoomTypeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  useEffect(() => {
    function onDocClick(e) {
      if (presetRef.current && !presetRef.current.contains(e.target)) setPresetOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const toggleRoom = (id) => setSelectedRoomIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleMeal = (code) => setSelectedMealCodes((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]));
  const toggleGroup = (key) => setCollapsedGroups((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  // A Rate Plan is a distinct entity from a Meal Plan: one rate plan can
  // bundle several meal plans, each with its own occupancy pricing. The
  // calendar therefore groups by Room + Rate Plan + Meal Plan.
  const groups = useMemo(() => {
    const out = [];
    rooms.filter((r) => selectedRoomIds.includes(r.id) && selectedRoomTypeIds.includes(r.roomTypeId)).forEach((room) => {
      getRatePlansByRoom(room.id).forEach((rp) => {
        (rp.mealPlans || [])
          .filter((mp) => selectedMealCodes.includes(mp.mealPlanCode))
          .forEach((mp) => {
            out.push({
              key: `${room.id}::${rp.id}::${mp.mealPlanCode}`,
              room,
              ratePlan: rp,
              mealPlanCode: mp.mealPlanCode,
              pricingPeriods: mp.pricingPeriods,
            });
          });
      });
    });
    return out;
  }, [rooms, selectedRoomIds, selectedRoomTypeIds, selectedMealCodes, getRatePlansByRoom]);

  const [editCell, setEditCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [manageMealsOpen, setManageMealsOpen] = useState(false);
  const [overrides, setOverrides] = useState({});

  const cellKey = useCallback((groupKey, occCode, date) => `${groupKey}::${occCode}::${toISO(date)}`, []);
  // Stable reference (only changes when overrides actually change) so the
  // memoized RateRow components below don't lose their memoization on every
  // unrelated parent re-render (e.g. a filter toggle in the sidebar).
  const rateFor = useCallback(
    (group, occCode, date, seed) => {
      const key = cellKey(group.key, occCode, date);
      if (overrides[key] != null) return overrides[key];
      const period = activePeriodFor(group.pricingPeriods, date);
      const base = period?.rates?.[occCode] || 0;
      return Math.max(300, base + variance(seed));
    },
    [overrides, cellKey]
  );

  const handleCellClick = useCallback((group, occ, colIdx, rate) => {
    setEditCell({ group, occ, date: dates[colIdx] });
    setEditValue(String(rate));
  }, [dates]);

  // Deferred so toggling the outlier highlights (which recomputes stats
  // across every visible cell) never blocks an in-flight cell click/tap —
  // the highlight repaint is allowed to lag a frame behind the interaction.
  const deferredHighlightLowest = useDeferredValue(highlightLowest);
  const deferredHighlightHighest = useDeferredValue(highlightHighest);

  // Per (occupancy, date-column) min/max across every visible group — drives
  // the "Highlight Lowest/Highest Rates" outlier toggles.
  const rateStats = useMemo(() => {
    const stats = {};
    occupancies.forEach((occ, occIdx) => {
      stats[occ.code] = dates.map((d, colIdx) => {
        let min = Infinity, max = -Infinity;
        groups.forEach((g) => {
          const r = rateFor(g, occ.code, d, occIdx * 97 + colIdx * 31 + windowStart);
          if (r < min) min = r;
          if (r > max) max = r;
        });
        return { min, max };
      });
    });
    return stats;
  }, [groups, dates, occupancies, rateFor, windowStart]);

  // Variance summary shown on a collapsed group's parent row so the price
  // spread is still visible without expanding every occupancy row.
  function groupVariance(group) {
    let min = Infinity, max = -Infinity;
    occupancies.forEach((occ, occIdx) => {
      dates.forEach((d, colIdx) => {
        const r = rateFor(group, occ.code, d, occIdx * 97 + colIdx * 31 + windowStart);
        if (r < min) min = r;
        if (r > max) max = r;
      });
    });
    return { min, max };
  }

  const activePresetLabel = DATE_PRESETS.find((p) => p.key === preset)?.label;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Calendar" }]}
        title="Rate Calendar"
        subtitle="Room + meal plan rates nested by occupancy, across dates. Click any rate cell to edit it."
        actions={
          <>
            <button className="btn btn-secondary"><Upload /> Bulk Import</button>
            <button className="btn btn-primary"><WandSparkles /> Bulk Update</button>
          </>
        }
      />

      <div className="calendar-toolbar">
        <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
          <div className="dropdown-select" ref={presetRef}>
            <button type="button" className={`select-pill ${presetOpen ? "is-open" : ""}`} onClick={() => setPresetOpen((v) => !v)}>
              <CalendarRange /> {activePresetLabel}
              <ChevronDown className={`select-field__chevron ${presetOpen ? "is-rotated" : ""}`} style={{ width: 13, height: 13, marginLeft: 2 }} />
            </button>
            {presetOpen && (
              <div className="dropdown-select__menu">
                {DATE_PRESETS.map((p) => (
                  <div
                    key={p.key}
                    className={`dropdown-select__item ${p.key === preset ? "is-active" : ""}`}
                    onClick={() => {
                      setPreset(p.key);
                      setPresetOpen(false);
                      if (p.key === "custom") setCustomOpen(true);
                    }}
                  >
                    {p.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {preset === "custom" && (
            <button type="button" className="select-pill" onClick={() => setCustomOpen(true)}>
              {customRange.from} → {customRange.to}
            </button>
          )}

          {preset === "currentMonth" && (
            <div className="calendar-month-nav">
              <button type="button" className="icon-btn btn-sm" onClick={() => setMonthOffset((m) => m - 1)} data-tooltip="Previous month">
                <ChevronLeft />
              </button>
              <span className="calendar-month-nav__label">
                {fullRange.from.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </span>
              <button type="button" className="icon-btn btn-sm" onClick={() => setMonthOffset((m) => m + 1)} data-tooltip="Next month">
                <ChevronRight />
              </button>
              {monthOffset !== 0 && (
                <button type="button" className="link-button" style={{ fontSize: 11, marginLeft: 4 }} onClick={() => setMonthOffset(0)}>Today</button>
              )}
            </div>
          )}

          <div className="jump-to-date">
            <input
              type="date"
              value={jumpDate}
              min={toISO(fullRange.from)}
              max={toISO(fullRange.to)}
              onChange={(e) => { setJumpDate(e.target.value); handleJumpToDate(e.target.value); }}
              aria-label="Jump to date"
            />
          </div>

          {totalWindows > 1 && (
            <div className="calendar-window-nav">
              <button
                type="button"
                className="icon-btn btn-sm"
                disabled={windowStart === 0}
                onClick={() => setWindowStart((w) => Math.max(0, w - WINDOW_SIZE))}
                data-tooltip="Previous window"
              >
                <ChevronLeft />
              </button>
              <span className="calendar-window-nav__label">
                {toISO(dates[0])} – {toISO(dates[dates.length - 1])}
                <span className="text-muted"> · window {currentWindowIdx + 1} of {totalWindows}</span>
              </span>
              <button
                type="button"
                className="icon-btn btn-sm"
                disabled={windowStart + WINDOW_SIZE >= allDates.length}
                onClick={() => setWindowStart((w) => Math.min((totalWindows - 1) * WINDOW_SIZE, w + WINDOW_SIZE))}
                data-tooltip="Next window"
              >
                <ChevronRight />
              </button>
            </div>
          )}
        </div>

        {weekSegments.length > 1 && (
          <div className="week-segment-switcher">
            {weekSegments.map((seg, i) => (
              <button
                key={i}
                type="button"
                className="week-segment-switcher__item"
                onClick={() => scrollToDate(toISO(seg[0]))}
              >
                Week {i + 1}
              </button>
            ))}
            <button type="button" className="week-segment-switcher__item" onClick={() => scrollWrapRef.current?.scrollTo({ left: 0, behavior: "smooth" })}>
              Entire Month
            </button>
          </div>
        )}

        <div className="calendar-legend">
          <span className="calendar-legend__swatch"><span className="calendar-legend__dot" style={{ background: "rgba(190,233,232,0.8)" }}></span> Weekend</span>
          <span className="calendar-legend__swatch"><span className="calendar-legend__dot" style={{ background: "rgba(95,168,211,0.5)" }}></span> Today</span>
        </div>
      </div>

      <div className="module-layout module-layout--fill">
        <aside className="filter-panel">
          <div className="card filter-panel__section">
            <div className="filter-panel__label"><ArrowDownNarrowWide /> Rate Highlights</div>
            <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
              <button
                type="button"
                className={`outlier-toggle outlier-toggle--low ${highlightLowest ? "is-active" : ""}`}
                onClick={() => setHighlightLowest((v) => !v)}
                data-tooltip="Highlight the lowest rate in every column"
              >
                <ArrowDownNarrowWide /> Lowest Rates
              </button>
              <button
                type="button"
                className={`outlier-toggle outlier-toggle--high ${highlightHighest ? "is-active" : ""}`}
                onClick={() => setHighlightHighest((v) => !v)}
                data-tooltip="Highlight the highest rate in every column"
              >
                <ArrowUpNarrowWide /> Highest Rates
              </button>
            </div>
          </div>
          <div className="card filter-panel__section">
            <div className="filter-panel__label"><Building2 /> Property</div>
            <div className="filter-option-list">
              {properties.map((p) => (
                <div key={p.id} className={`filter-option ${p.id === propertyId ? "is-active" : ""}`} onClick={() => setPropertyId(p.id)}>
                  <span className="filter-option__avatar">{p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                  <span><div>{p.name}</div><div className="filter-option__meta">{p.id}</div></span>
                </div>
              ))}
            </div>
          </div>
          <div className="card filter-panel__section">
            <div className="filter-panel__label"><Layers /> Room Type</div>
            <div className="filter-option-list">
              {roomTypeFacets.map((rt) => (
                <label className="filter-option" key={rt.id}>
                  <input type="checkbox" checked={selectedRoomTypeIds.includes(rt.id)} onChange={() => toggleRoomType(rt.id)} />
                  <span>{rt.name}</span>
                  <span className="badge badge-neutral">{rt.count}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="card filter-panel__section">
            <div className="filter-panel__label"><BedDouble /> Rooms</div>
            <div className="filter-option-list">
              {rooms.map((r) => (
                <label className="filter-option" key={r.id}>
                  <input type="checkbox" checked={selectedRoomIds.includes(r.id)} onChange={() => toggleRoom(r.id)} />
                  <span>{r.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="card filter-panel__section">
            <div className="filter-panel__label" style={{ justifyContent: "space-between", display: "flex", width: "100%" }}>
              <span><Utensils /> Meal Plans</span>
              <button type="button" className="manage-inline-btn" onClick={() => setManageMealsOpen(true)}><Settings2 /> Manage</button>
            </div>
            <div className="filter-chip-grid">
              {masterData.mealPlans.map((m) => (
                <span
                  key={m.code}
                  className={`chip is-selectable ${selectedMealCodes.includes(m.code) ? "is-active" : ""}`}
                  onClick={() => toggleMeal(m.code)}
                >
                  {m.code}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <div className="card calendar-card">
          {groups.length === 0 ? (
            <EmptyState icon={BedDouble} title="No rate combinations selected" desc="Select at least one room and meal plan from the left panel." />
          ) : (
            <div className="rate-calendar-wrap" ref={scrollWrapRef}>
              <table className="rate-calendar">
                <thead>
                  <tr>
                    <th className="corner">Room + Meal Plan / Occupancy</th>
                    {dates.map((d) => {
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      const isToday = d.toDateString() === today.toDateString();
                      return (
                        <th key={toISO(d)} data-date={toISO(d)} className={`${isWeekend ? "is-weekend" : ""} ${isToday ? "is-today" : ""}`}>
                          <span className="dow">{DOW[d.getDay()]}</span>{d.getDate()}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => {
                    const isCollapsed = collapsedGroups.has(group.key);
                    const groupVarianceStat = isCollapsed ? groupVariance(group) : null;
                    return (
                      <Fragment key={group.key}>
                        <GroupHeaderRow
                          group={group}
                          dates={dates}
                          isCollapsed={isCollapsed}
                          variancePair={groupVarianceStat}
                          mealPlanName={masterData.mealPlans.find((m) => m.code === group.mealPlanCode)?.name}
                          onToggle={() => toggleGroup(group.key)}
                        />
                        {!isCollapsed && occupancies.map((occ, occIdx) => (
                          <RateRow
                            key={`${group.key}-${occ.code}`}
                            group={group}
                            occ={occ}
                            occIdx={occIdx}
                            dates={dates}
                            windowStart={windowStart}
                            today={today}
                            getRate={rateFor}
                            rateStatsRow={rateStats[occ.code]}
                            highlightLowest={deferredHighlightLowest}
                            highlightHighest={deferredHighlightHighest}
                            onCellClick={handleCellClick}
                          />
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!editCell}
        onClose={() => setEditCell(null)}
        title="Edit Rate"
        subtitle={
          editCell
            ? `${editCell.group.room.name} · ${editCell.group.ratePlan.name} · ${editCell.group.mealPlanCode} · ${editCell.occ.code} · ${editCell.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
            : ""
        }
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditCell(null)}><X /> Cancel</button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setOverrides((prev) => ({ ...prev, [cellKey(editCell.group.key, editCell.occ.code, editCell.date)]: Number(editValue) }));
                setEditCell(null);
                toast({ title: "Rate updated", message: "This change is local only — no backend is connected yet.", type: "success" });
              }}
            >
              <Check /> Save Rate
            </button>
          </>
        }
      >
        <FieldInput label="Rate (₹)" type="number" value={editValue} onChange={setEditValue} />
        <p className="field-hint">This is a UI placeholder — saving requires the future ASP.NET rate management API.</p>
      </Modal>

      <Modal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Custom Date Range"
        subtitle="Choose the exact window to inspect in the calendar."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setCustomOpen(false)}><X /> Cancel</button>
            <button
              className="btn btn-primary"
              onClick={() => { setPreset("custom"); setCustomOpen(false); }}
            >
              <Check /> Apply Range
            </button>
          </>
        }
      >
        <div className="form-grid cols-2">
          <FieldInput label="From" type="date" value={customRange.from} onChange={(v) => setCustomRange((r) => ({ ...r, from: v }))} />
          <FieldInput label="To" type="date" value={customRange.to} onChange={(v) => setCustomRange((r) => ({ ...r, to: v }))} />
        </div>
      </Modal>

      <ManageListModal open={manageMealsOpen} onClose={() => setManageMealsOpen(false)} listKey="mealPlans" title="Manage Meal Plans" icon={Utensils} />
    </>
  );
}
