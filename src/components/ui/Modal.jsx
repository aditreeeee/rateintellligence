import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Rendered via portal to document.body so it always escapes any ancestor
// stacking context (e.g. the sticky Topbar), regardless of where it's mounted.
export default function Modal({ open, onClose, title, subtitle, children, footer, size }) {
  return createPortal(
    <div className={`modal-overlay ${open ? "is-open" : ""}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size === "lg" ? "modal--lg" : ""}`}>
        <div className="modal__header">
          <div>
            <div className="card__title">{title}</div>
            {subtitle && <div className="card__subtitle">{subtitle}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} type="button" aria-label="Close">
            <X />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
