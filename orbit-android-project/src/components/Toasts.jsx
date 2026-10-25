import { Bell, X } from "lucide-react";

export default function Toasts({ toasts, onDismiss }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div className={`toast ${t.kind}`} key={t.id} role={t.kind === "error" ? "alert" : "status"}>
          {t.kind === "reminder" && <Bell size={14} />}
          <span>{t.text}</span>
          <button type="button" className="icon-button" aria-label="Dismiss" onClick={() => onDismiss(t.id)}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
