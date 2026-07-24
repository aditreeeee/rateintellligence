import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, Check } from "lucide-react";

/**
 * Multi-select counterpart to Select — same glass floating panel, search and
 * keyboard nav, but the trigger displays selected values as removable chips
 * instead of a single line of text.
 *
 * options: [{ value, label }]
 * values: string[]
 */
export default function MultiSelect({
  label,
  values,
  onChange,
  options,
  placeholder = "Select...",
  searchable = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [panelRect, setPanelRect] = useState(null);
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  useEffect(() => {
    if (!open) return;
    function updateRect() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) setPanelRect(rect);
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
      if (rootRef.current && !rootRef.current.contains(e.target) && !e.target.closest(".select-panel")) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlighted(0);
      if (searchable) setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(value) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  }
  function remove(value, e) {
    e.stopPropagation();
    onChange(values.filter((v) => v !== value));
  }

  function handlePanelKeyDown(e) {
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(filtered.length - 1, h + 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(0, h - 1)); return; }
    if (e.key === "Enter") { e.preventDefault(); const opt = filtered[highlighted]; if (opt) toggle(opt.value); }
  }

  const selectedOptions = values.map((v) => options.find((o) => o.value === v)).filter(Boolean);
  const MAX_CHIPS = 3;
  const visibleChips = selectedOptions.slice(0, MAX_CHIPS);
  const overflowCount = selectedOptions.length - visibleChips.length;

  return (
    <div className={`field select-field multiselect-field ${className}`} ref={rootRef}>
      {label && <label className="select-field__label">{label}</label>}
      <button
        type="button"
        className={`select-field__trigger multiselect-field__trigger ${values.length ? "has-value" : ""} ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {visibleChips.length === 0 ? (
          <span className="select-field__value">{placeholder}</span>
        ) : (
          <span className="multiselect-field__chips">
            {visibleChips.map((o) => (
              <span className="multiselect-chip" key={o.value} title={o.label}>
                {o.label}
                <X className="multiselect-chip__x" onClick={(e) => remove(o.value, e)} />
              </span>
            ))}
            {overflowCount > 0 && <span className="multiselect-chip multiselect-chip--overflow">+{overflowCount} more</span>}
          </span>
        )}
        <ChevronDown className={`select-field__chevron ${open ? "is-rotated" : ""}`} />
      </button>

      {open && panelRect && createPortal(
        <div
          className="select-panel"
          style={{ position: "fixed", top: panelRect.bottom + 6, left: panelRect.left, width: panelRect.width }}
          onKeyDown={handlePanelKeyDown}
        >
          <div className="select-panel__actions">
            <button type="button" className="select-panel__action" onClick={() => onChange(options.map((o) => o.value))}>Select All</button>
            <button type="button" className="select-panel__action" onClick={() => onChange([])}>Clear All</button>
          </div>
          {searchable && (
            <div className="select-panel__search">
              <Search />
              <input ref={searchRef} type="text" placeholder="Search..." value={query} onChange={(e) => { setQuery(e.target.value); setHighlighted(0); }} />
              {query && <button type="button" className="select-panel__clear" onClick={() => setQuery("")}><X /></button>}
            </div>
          )}
          <div className="select-panel__list" role="listbox" aria-multiselectable="true">
            {filtered.length === 0 ? (
              <div className="select-panel__empty">No matching options.</div>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = values.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    className={`select-panel__item ${isSelected ? "is-selected" : ""} ${i === highlighted ? "is-highlighted" : ""}`}
                    onMouseEnter={() => setHighlighted(i)}
                    onClick={() => toggle(opt.value)}
                  >
                    <span className={`multiselect-checkbox ${isSelected ? "is-checked" : ""}`}>{isSelected && <Check />}</span>
                    <span className="select-panel__item-label">{opt.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
