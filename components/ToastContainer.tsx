"use client";

import { AnimatePresence } from "framer-motion";
import { Toast } from "./Toast";
import ToastComponent from "./Toast";

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export default function ToastContainer({
  toasts,
  onClose,
}: ToastContainerProps) {
  return (
    <div
      className="fixed top-20 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
      style={{ marginTop: "var(--header-height)" }}
      aria-live="polite"
      aria-label="Notificaciones"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastComponent toast={toast} onClose={onClose} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

