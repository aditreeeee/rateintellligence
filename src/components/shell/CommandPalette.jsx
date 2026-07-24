import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, Building2, BedDouble, Layers, CornerDownLeft, X } from "lucide-react";
import { useData } from "../../context/DataContext";

function highlight(text, query) {
  if (!query.trim()) return text;
  const i = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="cmdk-highlight">{text.slice(i, i + query.trim().length)}</mark>
      {text.slice(i + query.trim().length)}
    </>
  );
}

/**
 * ⌘K / Ctrl+K global command palette. Searches Properties, Rooms and Rate
 * Plans by name/id in one faceted, keyboard-navigable list. Selecting a
 * Property opens its detail page; selecting a Room or Rate Plan jumps into
 * the Calendar pre-scoped to that Property + Room, matching how the rest of
 * the app (Rooms/Rate Plans "Manage Rate Plans" actions) already navigates.
 */
export default function CommandPalette({ open, onClose, query = "", onQueryChange }) {
  const { properties, rooms, ratePlans, getPropertyById } = useData();
  const navigate = useNavigate();
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef(null);

  // The header search input is the same piece of state as this modal's own
  // input — typing in the topbar opens the palette and keeps flowing
  // straight into these results without losing a keystroke.
  useEffect(() => {
    if (open) {
      setHighlighted(0);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(query.length, query.length);
      }, 0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    onQueryChange?.("");
    onClose();
  }

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchesQ = (...vals) => !q || vals.some((v) => (v || "").toLowerCase().includes(q));

    const propertyResults = properties
      .filter((p) => matchesQ(p.name, p.id))
      .slice(0, 6)
      .map((p) => ({ kind: "property", id: p.id, title: p.name, meta: `${p.id} · ${p.city}`, data: p }));

    const roomResults = rooms
      .filter((r) => matchesQ(r.name, r.id))
      .slice(0, 6)
      .map((r) => ({ kind: "room", id: r.id, title: r.name, meta: `${getPropertyById(r.propertyId)?.name || "—"} · ${r.id}`, data: r }));

    const ratePlanResults = ratePlans
      .filter((rp) => matchesQ(rp.name, rp.id))
      .slice(0, 6)
      .map((rp) => ({
        kind: "rateplan",
        id: rp.id,
        title: rp.name,
        meta: `${getPropertyById(rp.propertyId)?.name || "—"} · ${rp.id}`,
        data: rp,
      }));

    return [
      { key: "properties", label: "Properties", icon: Building2, items: propertyResults },
      { key: "rooms", label: "Rooms", icon: BedDouble, items: roomResults },
      { key: "rateplans", label: "Rate Plans", icon: Layers, items: ratePlanResults },
    ].filter((g) => g.items.length > 0);
  }, [query, properties, rooms, ratePlans, getPropertyById]);

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => { setHighlighted(0); }, [query]);

  function go(item) {
    if (!item) return;
    if (item.kind === "property") {
      navigate(`/properties/${item.id}`);
    } else if (item.kind === "room") {
      navigate(`/calendar?propertyId=${item.data.propertyId}&roomId=${item.id}`);
    } else if (item.kind === "rateplan") {
      const roomId = (item.data.roomIds || [])[0];
      navigate(`/calendar?propertyId=${item.data.propertyId}${roomId ? `&roomId=${roomId}` : ""}`);
    }
    handleClose();
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") { e.preventDefault(); handleClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(flatItems.length - 1, h + 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(0, h - 1)); return; }
    if (e.key === "Enter") { e.preventDefault(); go(flatItems[highlighted]); }
  }

  if (!open) return null;

  let runningIndex = -1;

  return createPortal(
    <div className="cmdk-overlay" onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="cmdk-panel" role="dialog" aria-modal="true" aria-label="Global search">
        <div className="cmdk-panel__search">
          <Search />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search properties, rooms, rate plans..."
            aria-label="Global search"
          />
          {query && (
            <button type="button" className="cmdk-panel__clear" onClick={() => onQueryChange?.("")} aria-label="Clear search">
              <X />
            </button>
          )}
          <kbd>Esc</kbd>
        </div>

        <div className="cmdk-panel__results">
          {query.trim() && flatItems.length === 0 ? (
            <div className="select-panel__empty">No results for "{query}".</div>
          ) : (
            groups.map((group) => (
              <div className="cmdk-group" key={group.key}>
                <div className="cmdk-group__label"><group.icon /> {group.label}</div>
                {group.items.map((item) => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  return (
                    <div
                      key={item.id}
                      className={`cmdk-item ${idx === highlighted ? "is-highlighted" : ""}`}
                      onMouseEnter={() => setHighlighted(idx)}
                      onClick={() => go(item)}
                    >
                      <span className="cmdk-item__title">{highlight(item.title, query)}</span>
                      <span className="cmdk-item__meta">{item.meta}</span>
                      {idx === highlighted && <CornerDownLeft className="cmdk-item__enter" />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
          {!query.trim() && (
            <div className="cmdk-hint">Type to search, or use ↑ ↓ and Enter to jump straight to a result.</div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
