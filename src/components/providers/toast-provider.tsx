"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration: number = 4500) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (title: string, message?: string, duration?: number) =>
      addToast("success", title, message, duration),
    error: (title: string, message?: string, duration?: number) =>
      addToast("error", title, message, duration),
    warning: (title: string, message?: string, duration?: number) =>
      addToast("warning", title, message, duration),
    info: (title: string, message?: string, duration?: number) =>
      addToast("info", title, message, duration),
  };

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}

      {/* Top Right Toast Container */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2 sm:px-0"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all duration-200 animate-in slide-in-from-top-2 sm:slide-in-from-right-4 fade-in flex items-start gap-3 relative overflow-hidden ${
              item.type === "error"
                ? "bg-white/95 border-rose-300 text-slate-800 shadow-rose-500/15"
                : item.type === "warning"
                ? "bg-white/95 border-amber-300 text-slate-800 shadow-amber-500/15"
                : item.type === "success"
                ? "bg-white/95 border-emerald-300 text-slate-800 shadow-emerald-500/15"
                : "bg-white/95 border-blue-300 text-slate-800 shadow-blue-500/15"
            }`}
          >
            {/* Color accent line on left */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                item.type === "error"
                  ? "bg-rose-500"
                  : item.type === "warning"
                  ? "bg-amber-500"
                  : item.type === "success"
                  ? "bg-emerald-500"
                  : "bg-blue-500"
              }`}
            />

            {/* Icon */}
            <div
              className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ml-1 ${
                item.type === "error"
                  ? "bg-rose-50 text-rose-600"
                  : item.type === "warning"
                  ? "bg-amber-50 text-amber-600"
                  : item.type === "success"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              {item.type === "error" && <AlertCircle className="h-5 w-5" />}
              {item.type === "warning" && <AlertTriangle className="h-5 w-5" />}
              {item.type === "success" && <CheckCircle2 className="h-5 w-5" />}
              {item.type === "info" && <Info className="h-5 w-5" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-2">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                {item.title}
              </h4>
              {item.message && (
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-relaxed mt-0.5">
                  {item.message}
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={() => removeToast(item.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition flex-shrink-0"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
