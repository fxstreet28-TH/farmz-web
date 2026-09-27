"use client";

import { useEffect, type ReactNode } from "react";

/** Bottom sheet on mobile, centered dialog on larger screens. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-grass-900/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[85vh] w-full animate-pop overflow-y-auto rounded-t-3xl border-4 border-white bg-grass-50 p-4 pb-8 shadow-chunky sm:max-w-md sm:rounded-3xl sm:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl font-extrabold text-grass-800">{title}</h3>
          <button className="btn-ghost h-9 w-9 p-0" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
