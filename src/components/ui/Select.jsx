import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, AlertCircle, Check } from "lucide-react";

/**
 * Shared premium dropdown primitive used by every select-style control in
 * the app (FieldSelect, ManagedSelectField, toolbar filters, etc). Renders
 * its own floating glass panel instead of a native <select>, so every
 * dropdown in the product shares one design language, one keyboard-nav
 * implementation, and one set of hover/focus/disabled/error states.
 *
 * options: [{ value, label, disabled? }]
 */
export default function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  required,
  error,
  hint,
  searchable = false,
  disabled = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [panelRect, setPanelRect] = useState(null);
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const selected = options.find((o) => o.value === value);

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
      setHighlighted(Math.max(0, options.findIndex((o) => o.value === value)));
      if (searchable) setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function commit(optValue) {
    onChange(optValue);
    setOpen(false);
  }

  function handleTriggerKeyDown(e) {
    if (disabled) return;
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
    }
  }

  function handlePanelKeyDown(e) {
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(filtered.length - 1, h + 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(0, h - 1)); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlighted];
      if (opt && !opt.disabled) commit(opt.value);
    }
  }

  const hasValue = value != null && value !== "";
  const isPlain = !label;

  return (
    <div className={`field select-field ${isPlain ? "select-field--plain" : ""} ${error ? "is-invalid" : ""} ${className}`} ref={rootRef}>
      {label && <label className="select-field__label">{label}{required ? " *" : ""}</label>}
      <button
        type="button"
        className={`select-field__trigger ${hasValue ? "has-value" : ""} ${open ? "is-open" : ""}`}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="select-field__value" title={selected?.label || ""}>{selected?.label || placeholder}</span>
        <ChevronDown className={`select-field__chevron ${open ? "is-rotated" : ""}`} />
      </button>
      {error && (
        <span className="field-error" style={{ display: "flex" }}>
          <AlertCircle /> {error}
        </span>
      )}
      {hint && !error && <span className="field-hint">{hint}</span>}

      {open && panelRect && createPortal(
        <div
          className="select-panel"
          style={{ position: "fixed", top: panelRect.bottom + 6, left: panelRect.left, width: panelRect.width }}
          onKeyDown={handlePanelKeyDown}
        >
          {searchable && (
            <div className="select-panel__search">
              <Search />
              <input ref={searchRef} type="text" placeholder="Search..." value={query} onChange={(e) => { setQuery(e.target.value); setHighlighted(0); }} />
              {query && (
                <button type="button" className="select-panel__clear" onClick={() => setQuery("")}><X /></button>
              )}
            </div>
          )}
          <div className="select-panel__list" role="listbox">
            {filtered.length === 0 ? (
              <div className="select-panel__empty">No matching options.</div>
            ) : (
              filtered.map((opt, i) => (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  className={`select-panel__item ${opt.value === value ? "is-selected" : ""} ${i === highlighted ? "is-highlighted" : ""} ${opt.disabled ? "is-disabled" : ""}`}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => !opt.disabled && commit(opt.value)}
                >
                  <span className="select-panel__item-label">{opt.label}</span>
                  {opt.value === value && <Check className="select-panel__item-check" />}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
