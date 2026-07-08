"use client";

import { useEffect, useCallback, useRef } from "react";

export function useUnsavedChanges(dirty: boolean) {
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

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

  const confirmLeave = useCallback(() => {
    if (dirtyRef.current) {
      return window.confirm("You have unsaved changes. Are you sure you want to leave?");
    }
    return true;
  }, []);

  return { confirmLeave };
}
