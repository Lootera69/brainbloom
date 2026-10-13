"use client";

import type { WorkshopImportMetadata } from "@/types/workshop";

function safeLink(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function WorkshopProvenance({ metadata }: { metadata: WorkshopImportMetadata }) {
  function download() {
    const url = URL.createObjectURL(new Blob([metadata.replayBundleJson], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `workshop-${metadata.bundleSha256.slice(0, 12)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <details className="rounded-xl border border-border p-4 text-sm">
    <summary className="cursor-pointer font-medium">Workshop sources and original bundle</summary>
    <div className="mt-3 space-y-3">
      <p className="text-muted-foreground">Source notices and the original imported bundle are retained with this draft. The supplied checks apply to the original item; later edits require review.</p>
      {metadata.sources.length ? metadata.sources.map((source, index) => <section key={`${source.sha256}-${index}`} className="space-y-2 border-t border-border pt-3">
        <h3 className="font-medium">{source.name}{source.version ? ` (${source.version})` : ""}</h3>
        {source.attribution && <p>{source.attribution}</p>}
        {safeLink(source.url) && <a className="mr-4 text-primary underline" href={safeLink(source.url)} target="_blank" rel="noreferrer">Source</a>}
        {safeLink(source.licenseUrl) && <a className="text-primary underline" href={safeLink(source.licenseUrl)} target="_blank" rel="noreferrer">License</a>}
        {source.transformations && <p className="whitespace-pre-wrap">{source.transformations}</p>}
        <details><summary className="cursor-pointer">License and attribution notice</summary><p className="mt-2 whitespace-pre-wrap break-words">{source.license}</p></details>
      </section>) : <p>No source notices were supplied in this file.</p>}
      <p className="whitespace-pre-wrap"><span className="font-medium">Supplied check scope: </span>{metadata.scope}</p>
      <p className="break-all text-muted-foreground">Generator: {metadata.generator} · item {metadata.itemIndex + 1}<br />Method: {metadata.method}<br />Original item SHA256: {metadata.itemSha256}<br />Bundle SHA256: {metadata.bundleSha256}</p>
      <p className="text-muted-foreground">{metadata.replayContextAvailable ? "Saved generation context is included. Replay the downloaded bundle with the matching engine to check it again." : "This file has incomplete replay context. The supplied file is preserved, but engine replay may require a complete export."}</p>
      <button type="button" onClick={download} className="rounded-lg border border-border px-3 py-2 font-medium">Download original bundle</button>
    </div>
  </details>;
}
