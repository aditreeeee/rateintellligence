import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 260);
  }, []);

  const toast = useCallback(
    ({ title, message, type = "info", duration = 4200 }) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, title, message, type }]);
      if (duration) setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div key={t.id} className={`toast ${t.type} ${t.leaving ? "is-leaving" : ""}`}>
              <div className="toast__icon">
                <Icon />
              </div>
              <div>
                <div className="toast__title">{t.title}</div>
                {t.message && <div className="toast__msg">{t.message}</div>}
              </div>
              <X className="toast__close" onClick={() => dismiss(t.id)} />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
