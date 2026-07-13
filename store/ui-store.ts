import { create } from "zustand";

interface UIState {
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  showShop: boolean;
  setShowShop: (v: boolean) => void;
  showPaywall: "limit" | "hearts" | null;
  setShowPaywall: (v: "limit" | "hearts" | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  focusMode: false,
  setFocusMode: (v) => set({ focusMode: v }),
  showShop: false,
  setShowShop: (v) => set({ showShop: v }),
  showPaywall: null,
  setShowPaywall: (v) => set({ showPaywall: v }),
}));
