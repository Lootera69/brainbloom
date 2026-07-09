"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

export function useUnsavedChanges(dirty: boolean) {
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const [showModal, setShowModal] = useState(false);
  const onLeaveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const confirmLeave = useCallback((onLeave: () => void) => {
    if (dirtyRef.current) {
      onLeaveRef.current = onLeave;
      setShowModal(true);
    } else {
      onLeave();
    }
  }, []);

  const handleConfirmLeave = useCallback(() => {
    setShowModal(false);
    onLeaveRef.current?.();
    onLeaveRef.current = null;
  }, []);

  const handleCancelLeave = useCallback(() => {
    setShowModal(false);
    onLeaveRef.current = null;
  }, []);

  const LeaveWarningModal = (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={handleCancelLeave}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-500" />
                Unsaved changes
              </h2>
              <button onClick={handleCancelLeave}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              You have unsaved changes. Are you sure you want to leave? Your progress will be lost.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={handleCancelLeave}
                className="flex h-10 flex-1 items-center justify-center rounded-xl border text-sm font-medium transition-colors hover:bg-muted">
                Keep editing
              </button>
              <button onClick={handleConfirmLeave}
                className="flex h-10 flex-1 items-center justify-center rounded-xl bg-destructive text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]">
                Leave anyway
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { confirmLeave, LeaveWarningModal };
}
