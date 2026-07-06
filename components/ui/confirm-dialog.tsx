"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "danger" | "success";
  children?: React.ReactNode;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, confirmVariant = "danger", children, loading }: Props) {
  const [countdown, setCountdown] = useState(5);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      setCountdown(5);
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setCountdown(5);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open]);

  const handleConfirm = () => {
    if (countdown > 0) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    onConfirm();
  };

  const handleClose = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold flex items-center gap-2">
                {confirmVariant === "danger" && <AlertTriangle className="size-5 text-destructive" />}
                {title}
              </h2>
              <button onClick={handleClose}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            {children}
            <div className="mt-5 flex gap-3">
              <button onClick={handleClose}
                className="flex h-10 flex-1 items-center justify-center rounded-xl border text-sm font-medium transition-colors hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={countdown > 0 || loading}
                className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 ${
                  confirmVariant === "danger"
                    ? "bg-destructive hover:brightness-110"
                    : "bg-success hover:brightness-110"
                }`}
              >
                {loading ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : countdown > 0 ? (
                  confirmLabel + ` (${countdown}s)`
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
