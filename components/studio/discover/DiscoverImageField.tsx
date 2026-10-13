"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import { uploadToImgbbWithProgress } from "@/services/imgbb";
import { isDiscoverImageUrl } from "@/lib/discover/validation";
import { cn } from "@/lib/utils";
import { inputClass, secondaryButton } from "./discover-studio-ui";

function validateDimensions(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (image.width > 4096 || image.height > 4096) reject(new Error("Use an image no larger than 4096 × 4096 pixels."));
      else resolve();
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("This file could not be read as an image.")); };
    image.src = objectUrl;
  });
}

export function DiscoverImageField({ id, label, imageUrl, imageAlt, onImageChange, onAltChange, onBusyChange }: {
  id: string;
  label: string;
  imageUrl: string;
  imageAlt: string;
  onImageChange: (value: string) => void;
  onAltChange: (value: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [failedUrl, setFailedUrl] = useState("");
  const hasPreview = !!imageUrl && isDiscoverImageUrl(imageUrl) && failedUrl !== imageUrl;

  async function upload(file: File) {
    setError("");
    if (!["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(file.type)) {
      setError("Choose a JPEG, PNG, WebP, GIF or AVIF image."); return;
    }
    if (file.size > 2 * 1024 * 1024) { setError("Your image must be 2 MB or smaller."); return; }
    setUploading(true); onBusyChange(true); setProgress(0);
    try {
      await validateDimensions(file);
      const url = await uploadToImgbbWithProgress(file, setProgress);
      onImageChange(url); setFailedUrl("");
    } catch (err) {
      setError(err instanceof Error && !err.message.includes("API_KEY") ? err.message : "Image upload is not configured. You can still paste a hosted image URL below.");
    } finally { setUploading(false); onBusyChange(false); }
  }

  return <div className="space-y-3">
    <span className="text-sm font-semibold">{label}</span>
    <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40">
      {hasPreview ? <>
        {/* Studio previews support arbitrary HTTPS hosts entered by the author. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={imageAlt || "Image preview"} className="h-full w-full object-contain" onError={() => setFailedUrl(imageUrl)} />
      </> : <div className="p-5 text-center"><ImagePlus className="mx-auto mb-3 size-7 text-primary/60" /><p className="text-sm font-medium">Give the idea a picture</p><p className="mt-1 text-xs text-muted-foreground">Diagrams, illustrations, or a beautiful close-up.</p>{imageUrl && <p className="mt-2 text-xs text-destructive">This image could not be previewed. Check the URL.</p>}</div>}
      {uploading && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/90 backdrop-blur-sm" role="status"><Loader2 className="size-6 animate-spin text-primary" /><span className="text-sm font-medium">Uploading image · {progress}%</span></div>}
    </div>
    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" aria-label={`Upload ${label.toLowerCase()}`} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} />
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2"><button type="button" disabled={uploading} className={secondaryButton} onClick={() => fileRef.current?.click()}><Upload className="size-4" /> Upload image</button><span className="text-xs text-muted-foreground">Max 2 MB · 4096 × 4096 px</span></div>
    <label className="block space-y-1.5" htmlFor={`${id}-url`}><span className="text-xs font-medium text-muted-foreground">Or paste an image URL</span><input id={`${id}-url`} value={imageUrl} disabled={uploading} placeholder="https://…" maxLength={2048} onChange={(e) => onImageChange(e.target.value)} className={inputClass} /></label>
    <label className="block space-y-1.5" htmlFor={`${id}-alt`}><span className="text-xs font-medium text-muted-foreground">Image description <span className="font-normal">· for screen readers</span></span><input id={`${id}-alt`} value={imageAlt} placeholder="Describe what the image shows" maxLength={300} onChange={(e) => onAltChange(e.target.value)} className={cn(inputClass, "text-sm")} /></label>
    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
  </div>;
}
