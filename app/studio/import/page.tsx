"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { parseWorkshopBundle, type WorkshopDraft } from "@/lib/forge/workshop-import";
import { createPuzzleWithReceipt } from "@/services/puzzle-service";
import { WorkshopProvenance } from "@/components/studio/workshop-provenance";

export default function ImportWorkshopPage() {
  const [drafts, setDrafts] = useState<WorkshopDraft[]>([]);
  const [saved, setSaved] = useState<Record<string, { id: string; cloud: boolean; local: boolean }>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  async function load(file: File | undefined) {
    if (!file || lock.current) return;
    lock.current = true;
    setBusy(true); setError(""); setDrafts([]); setSaved({});
    try {
      if (file.size > 4_000_000) throw new Error("Choose a workshop export smaller than 4 MB.");
      setDrafts(await parseWorkshopBundle(JSON.parse(await file.text())));
    } catch (e) { setError(e instanceof Error ? e.message : "The draft file could not be read."); }
    finally { lock.current = false; setBusy(false); }
  }

  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true); setError("");
    try {
      for (const draft of drafts) {
        if (saved[draft.hash]) continue;
        const result = await createPuzzleWithReceipt(draft.item, { forceDraft: true });
        setSaved(previous => ({ ...previous, [draft.hash]: { id: result.puzzle.id, ...result.persistence } }));
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Import stopped. Successfully saved drafts are listed below."); }
    finally { lock.current = false; setBusy(false); }
  }

  const remaining = drafts.filter(draft => !saved[draft.hash]).length;
  const localOnly = Object.values(saved).filter(result => !result.cloud).length;
  return <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
    <div><h1 className="text-2xl font-semibold">Import workshop drafts</h1>
      <p className="mt-2 text-muted-foreground">Review a BrainBloom workshop export, then save it to Studio for editing. Imported puzzles remain unpublished drafts, including for administrators.</p></div>
    <label className="block rounded-2xl border border-border bg-card p-5">
      <span className="block font-medium">Choose draft JSON</span>
      <input type="file" accept=".json,application/json" disabled={busy} className="mt-3 block w-full text-sm" onChange={event => void load(event.target.files?.[0])} />
    </label>
    {error && <p role="alert" className="whitespace-pre-wrap rounded-xl bg-destructive/10 p-4 text-destructive">{error}</p>}
    {drafts.length > 0 && <div className="space-y-3">
      <p role="status">{drafts.length} drafts checked; {Object.keys(saved).length - localOnly} saved to the cloud; {localOnly} saved only in this browser.</p>
      {localOnly > 0 && <p className="rounded-xl border border-border p-3 text-sm">Browser-only drafts are available on this browser and device. They do not sync automatically and can be lost if browser data is cleared. Keep your original export.</p>}
      <p className="text-sm text-muted-foreground">The file matches its supplied content hashes. This does not authenticate its author or re-run the engine proofs. Review wording, answers and suitability before publishing.</p>
      <button disabled={busy || !remaining} onClick={() => void save()} className="rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground disabled:opacity-50">{busy ? "Saving…" : remaining ? `Save ${remaining} unpublished drafts` : "All drafts saved"}</button>
    </div>}
    {drafts.map(draft => <article key={draft.hash} className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-medium">{draft.item.title}</h2>
      <p className="text-sm text-muted-foreground">{draft.item.type} · {draft.item.difficulty} · {draft.item.category}</p>
      <p className="whitespace-pre-wrap">{draft.item.question}</p>
      {!!draft.item.choices.length && <ul className="list-inside list-disc">{draft.item.choices.map(choice => <li key={choice}>{choice}</li>)}</ul>}
      <details><summary className="cursor-pointer">Answer and explanation</summary><p className="mt-2 whitespace-pre-wrap">{draft.item.correctAnswer}: {draft.item.correctExplanation}</p></details>
      {draft.item.crosswordData && <p>{draft.item.crosswordData.size}×{draft.item.crosswordData.size} crossword · {draft.item.crosswordData.clues.length} entries</p>}
      <WorkshopProvenance metadata={draft.metadata} />
      {saved[draft.hash] && <div className="space-y-2"><p className="text-sm">{saved[draft.hash].cloud ? saved[draft.hash].local ? "Saved to the cloud and cached in this browser." : "Saved to the cloud. A browser copy could not be stored." : "Saved only in this browser."}</p><Link className="text-primary underline" href={`/studio/edit/${saved[draft.hash].id}`}>Open saved draft</Link></div>}
    </article>)}
  </main>;
}
