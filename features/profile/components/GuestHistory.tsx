"use client";

import { useSyncExternalStore } from 'react';
import { guestHistoryKey } from '@/services/guest-history';

const subscribe = (listener: () => void) => {
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
};

export function GuestHistory() {
  const archive = useSyncExternalStore(subscribe, () => localStorage.getItem(guestHistoryKey), () => null);
  if (!archive) return null;
  const download = () => {
    const url = URL.createObjectURL(new Blob([archive], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'previous-guest-history.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="my-4 rounded-2xl border p-4">
    <h2 className="font-semibold">Previous guest history</h2>
    <p className="mt-1 text-sm text-muted-foreground">Your earlier guest history is saved on this device, separately from your current reward balance.</p>
    <button onClick={download} className="mt-3 text-sm font-semibold text-primary">Download saved history</button>
  </section>;
}
