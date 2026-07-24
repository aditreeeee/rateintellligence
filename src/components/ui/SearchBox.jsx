import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";

/**
 * Premium live-search field shared by Properties/Rooms/Rate Plans list
 * toolbars. Typing narrows the page's own list immediately (via onChange,
 * same as the old plain <input> it replaces) while also surfacing a
 * jump-to-record dropdown — matched by name or id — with full keyboard nav,
 * so a specific record in a 1,000+ list is a few keystrokes + Enter away.
 *
 * suggestions: [{ id, label, meta }]
 */
export default function SearchBox({
  value,
  onChange,
  placeholder = "Search...",
  suggestions = [],
  onSelectSuggestion,
  width = 220,
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [rect, setRect] = useState(null);
  const rootRef = useRef(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return suggestions
      .filter((s) => s.label.toLowerCase().includes(q) || (s.meta || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [value, suggestions]);

  useEffect(() => {
    setHighlighted(0);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function updateRect() {
      const r = rootRef.current?.getBoundingClientRect();
      if (r) setRect(r);
    }
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target) && !e.target.closest(".search-box__panel")) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  function jumpTo(match) {
    setOpen(false);
    onSelectSuggestion?.(match);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(matches.length - 1, h + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(0, h - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); jumpTo(matches[highlighted]); }
  }

  return (
    <div className="search-box" ref={rootRef} style={{ width }}>
      <Search className="search-box__icon" />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {value && (
        <button type="button" className="search-box__clear" onClick={() => { onChange(""); setOpen(false); }} aria-label="Clear search">
          <X />
        </button>
      )}

      {open && value.trim() && rect && onSelectSuggestion && createPortal(
        <div className="search-box__panel" style={{ position: "fixed", top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 260) }}>
          {matches.length === 0 ? (
            <div className="select-panel__empty">No matches for "{value}".</div>
          ) : (
            <div className="select-panel__list">
              {matches.map((m, i) => (
                <div
                  key={m.id}
                  className={`select-panel__item ${i === highlighted ? "is-highlighted" : ""}`}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => jumpTo(m)}
                >
                  <span className="select-panel__item-label">{m.label}</span>
                  {m.meta && <span className="search-box__meta">{m.meta}</span>}
                </div>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
