"use client";

import { useRef, useState, useCallback } from "react";
import { ImageUp, Trash2, Check, Upload, Sparkles, X, ArrowLeftRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadToImgbbWithProgress } from "@/services/imgbb";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  imageUrl?: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
  size?: "default" | "small";
  className?: string;
}

function validateImage(file: File): string | null {
  if (file.size > 2 * 1024 * 1024) return "Image must be smaller than 2MB.";
  return null;
}

function checkDimensions(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width > 4096 || img.height > 4096) {
        resolve("Image dimensions must be under 4096x4096px.");
      } else {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("Could not read image file.");
    };
    img.src = url;
  });
}

function CircularProgress({ progress, size = 40 }: { progress: number; size?: number }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="size-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-[10px] font-bold tabular-nums text-primary">{progress}</span>
      </div>
    </div>
  );
}

export function ImageUploader({
  imageUrl,
  onUpload,
  onRemove,
  size = "default",
  className,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const dragCounterRef = useRef(0);
  const cancelledRef = useRef(false);

  const processFile = useCallback(
    async (file: File) => {
      const validationError = validateImage(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      const dimensionError = await checkDimensions(file);
      if (dimensionError) {
        toast.error(dimensionError);
        return;
      }

      cancelledRef.current = false;
      setUploading(true);
      setProgress(0);
      try {
        const url = await uploadToImgbbWithProgress(file, setProgress);
        if (cancelledRef.current) return;

        if (imageUrl || previewUrl) {
          setPreviewUrl(url);
        } else {
          onUpload(url);
          setJustUploaded(true);
          setTimeout(() => setJustUploaded(false), 2000);
          toast.success("Image uploaded");
        }
      } catch {
        if (!cancelledRef.current) {
          toast.error("Failed to upload image");
        }
      } finally {
        if (!cancelledRef.current) {
          setUploading(false);
          setProgress(0);
        }
      }
    },
    [imageUrl, previewUrl, onUpload],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      if (e.target) e.target.value = "";
    },
    [processFile],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        processFile(file);
      }
    },
    [processFile],
  );

  const handleRemove = useCallback(() => {
    cancelledRef.current = true;
    setUploading(false);
    setProgress(0);
    setPreviewUrl(null);
    onRemove();
  }, [onRemove]);

  const confirmReplace = useCallback(() => {
    if (previewUrl) {
      onUpload(previewUrl);
      setJustUploaded(true);
      setTimeout(() => setJustUploaded(false), 2000);
      toast.success("Image updated");
      setPreviewUrl(null);
    }
  }, [previewUrl, onUpload]);

  const cancelReplace = useCallback(() => {
    setPreviewUrl(null);
  }, []);

  const isSmall = size === "small";

  // ─── Replace preview: current vs new side by side ───
  if (previewUrl && imageUrl) {
    return (
      <div
        className={cn("relative", className)}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ArrowLeftRight className="size-3.5" />
            Replace image?
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Current</span>
              <div className="relative overflow-hidden rounded-xl border border-border/50">
                <img src={imageUrl} alt="" className="h-28 w-full object-contain bg-muted" />
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">New</span>
              <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 ring-2 ring-primary/10">
                <img src={previewUrl} alt="" className="h-28 w-full object-contain bg-muted" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelReplace}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/50 px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
            >
              Keep current
            </button>
            <button
              type="button"
              onClick={confirmReplace}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Check className="size-3.5" />
              Use new image
            </button>
          </div>
        </div>
        <AnimatePresence>
          {isDragging && !uploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-[2px]"
            >
              <div className="flex flex-col items-center gap-1.5">
                <Sparkles className="size-5 text-primary" />
                <span className="text-xs font-medium text-primary">Drop to replace</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    );
  }

  // ─── Replace preview: new image only ───
  if (previewUrl && !imageUrl) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ArrowLeftRight className="size-3.5" />
          Ready to upload
        </div>
        <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 ring-2 ring-primary/10">
          <img src={previewUrl} alt="" className={cn("w-full object-contain bg-muted", isSmall ? "h-32" : "max-h-48")} />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={cancelReplace}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/50 px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmReplace}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Check className="size-3.5" />
            Confirm upload
          </button>
        </div>
      </div>
    );
  }

  // ─── Uploaded image state ───
  if (imageUrl) {
    return (
      <>
        <div
          className={cn("relative", className)}
          onDragEnter={!uploading ? handleDragEnter : undefined}
          onDragLeave={!uploading ? handleDragLeave : undefined}
          onDragOver={!uploading ? handleDragOver : undefined}
          onDrop={!uploading ? handleDrop : undefined}
        >
          <button
            type="button"
            onClick={() => !uploading && !isDragging && setLightboxOpen(true)}
            className={cn(
              "relative block w-full overflow-hidden rounded-xl transition-all duration-300",
              uploading ? "cursor-default" : isDragging ? "cursor-copy" : "cursor-zoom-in",
            )}
          >
            <motion.img
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              src={imageUrl}
              alt=""
              className={cn(
                "w-full rounded-xl object-contain bg-muted transition-opacity duration-300",
                isSmall ? "h-32" : "max-h-48",
                uploading ? "opacity-40" : isDragging ? "opacity-60 scale-[0.98]" : "",
              )}
            />
            <AnimatePresence>
              {uploading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/20 backdrop-blur-[2px]"
                >
                  <CircularProgress progress={progress} size={48} />
                  <span className="text-xs font-semibold text-white drop-shadow">Uploading...</span>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {isDragging && !uploading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-[2px]"
                >
                  <motion.div
                    animate={{ y: [-2, 2, -2] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    <Sparkles className="size-6 text-primary" />
                  </motion.div>
                  <span className="text-xs font-semibold text-primary drop-shadow">Drop to replace</span>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {justUploaded && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/90 shadow-lg shadow-emerald-500/30 backdrop-blur-sm">
                    <Check className="size-5 text-white" strokeWidth={3} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          <div className={cn("flex gap-2", isSmall ? "mt-1.5" : "mt-2")}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "group/btn relative flex items-center gap-1.5 overflow-hidden rounded-lg border border-muted-foreground/30 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/50 hover:text-primary hover:shadow-sm disabled:opacity-50",
                isSmall && "gap-1 px-2 py-1 text-[11px]",
              )}
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/5 to-transparent transition-transform duration-500 group-hover/btn:translate-x-full" />
              <ImageUp className={cn("relative", isSmall ? "size-3" : "size-3.5")} />
              <span className="relative">{isSmall ? "Replace" : "Replace image"}</span>
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive transition-all hover:bg-destructive/10 hover:shadow-sm hover:shadow-destructive/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none",
                isSmall && "gap-1 px-2 py-1 text-[11px]",
              )}
            >
              <Trash2 className={cn(isSmall ? "size-3" : "size-3.5")} />
              {isSmall ? "Remove" : "Remove image"}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
              onClick={() => setLightboxOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative max-h-[85vh] max-w-[90vw]"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={imageUrl}
                  alt=""
                  className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
                />
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="absolute -right-3 -top-3 flex size-8 items-center justify-center rounded-full bg-card text-muted-foreground shadow-lg transition-colors hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ─── Empty state: upload zone ───
  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "group/drop relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300",
          isSmall ? "h-10 gap-1.5 text-xs" : "h-24",
          isDragging
            ? "border-primary bg-primary/5 shadow-[0_0_30px_rgba(99,102,241,0.12)]"
            : "border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/[0.02] hover:shadow-[0_0_20px_rgba(99,102,241,0.06)]",
          uploading && "pointer-events-none border-primary/30 bg-primary/[0.03]",
        )}
      >
        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center gap-2"
            >
              <CircularProgress progress={progress} size={isSmall ? 32 : 40} />
              <span className="text-[11px] font-medium text-primary/80">Uploading...</span>
            </motion.div>
          ) : isDragging ? (
            <motion.div
              key="dragging"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-1.5"
            >
              <motion.div
                animate={{ y: [-2, 2, -2] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                <Sparkles className="size-6 text-primary" />
              </motion.div>
              <span className="text-xs font-medium text-primary">Drop to upload</span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="relative">
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                >
                  <Upload className={cn("text-muted-foreground/60 transition-colors group-hover/drop:text-primary/70", isSmall ? "size-4" : "size-6")} />
                </motion.div>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground/70 group-hover/drop:text-primary/70">
                <span className="font-medium">{isSmall ? "Add image" : "Click or drag to upload"}</span>
              </div>
              {!isSmall && (
                <span className="text-[10px] text-muted-foreground/40">PNG, JPG up to 2MB</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {isDragging && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-2xl" />
          </div>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
