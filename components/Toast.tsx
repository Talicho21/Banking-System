"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  type: ToastType;
  message: string;
  /** ms before auto-dismiss; default 4000 */
  duration?: number;
};

export type ToastOptions = Omit<Toast, "id">;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const entry: Toast = { id, duration: 4000, ...opts };
      setToasts((prev) => [...prev, entry]);
      setTimeout(() => dismiss(id), entry.duration);
      return id;
    },
    [dismiss],
  );

  const success = useCallback((message: string, duration?: number) => toast({ type: "success", message, duration }), [toast]);
  const error   = useCallback((message: string, duration?: number) => toast({ type: "error",   message, duration }), [toast]);
  const info    = useCallback((message: string, duration?: number) => toast({ type: "info",    message, duration }), [toast]);

  return { toasts, toast, success, error, info, dismiss };
}

// ─── Single Toast Card ────────────────────────────────────────────────────────

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide-in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    timerRef.current = setTimeout(() => onDismiss(toast.id), 320);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const config = {
    success: {
      icon: <CheckCircle size={18} strokeWidth={2.2} className="shrink-0 text-emerald-400" />,
      bar:  "bg-emerald-400",
      bg:   "border-emerald-500/30 bg-[#0a2a1e]/95",
      text: "text-emerald-100",
    },
    error: {
      icon: <XCircle size={18} strokeWidth={2.2} className="shrink-0 text-red-400" />,
      bar:  "bg-red-500",
      bg:   "border-red-500/30 bg-[#240b0b]/95",
      text: "text-red-100",
    },
    info: {
      icon: <Info size={18} strokeWidth={2.2} className="shrink-0 text-sky-400" />,
      bar:  "bg-sky-400",
      bg:   "border-sky-500/30 bg-[#071626]/95",
      text: "text-sky-100",
    },
  }[toast.type];

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        transition: "opacity 0.28s ease, transform 0.28s cubic-bezier(0.34,1.4,0.64,1)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(110%)",
      }}
      className={`relative flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-2xl border px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-xl ${config.bg}`}
    >
      {/* Coloured left accent bar */}
      <span className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${config.bar}`} />

      {config.icon}

      <p className={`flex-1 text-sm font-medium leading-snug ${config.text}`}>{toast.message}</p>

      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={handleDismiss}
        className="ml-1 shrink-0 rounded-full p-0.5 text-white/40 transition-colors hover:text-white/80"
      >
        <X size={14} />
      </button>

      {/* Progress bar */}
      <span
        className={`absolute bottom-0 left-0 h-[2px] rounded-full ${config.bar}`}
        style={{
          width: "100%",
          animation: `toast-shrink ${toast.duration ?? 4000}ms linear forwards`,
        }}
      />

      <style>{`
        @keyframes toast-shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

export function ToastContainer({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  if (!toasts.length) return null;

  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
