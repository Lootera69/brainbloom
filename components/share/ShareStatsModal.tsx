"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2 } from "lucide-react";
import { generateShareCard, type ShareCardData } from "@/lib/share-card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ShareStatsModalProps {
  open: boolean;
  onClose: () => void;
  data: ShareCardData;
}

export function ShareStatsModal({ open, onClose, data }: ShareStatsModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGenerating(true);
    generateShareCard(data)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setImageUrl(url);
      })
      .catch(() => {
        toast.error("Failed to generate share card", { position: "top-center" });
      })
      .finally(() => setGenerating(false));

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setImageUrl(null);
    };
  }, [open, data]);

  const handleShare = async () => {
    if (!imageUrl) return;
    setSharing(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], "brainbloom-stats.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "My BrainBloom Stats" });
        toast.success("Shared!", { position: "top-center" });
      } else if (navigator.share) {
        await navigator.share({
          title: "My BrainBloom Stats",
          text: `I'm Level ${data.level} with ${data.xp.toLocaleString()} XP on BrainBloom! 🧠`,
          url: "https://brainblooms.vercel.app",
        });
        toast.success("Shared!", { position: "top-center" });
      } else {
        await handleDownload();
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        await handleDownload();
      }
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = "brainbloom-stats.png";
      a.click();
      toast.success("Downloaded", { position: "top-center" });
    } catch {
      toast.error("Download failed", { position: "top-center" });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/50 bg-card shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            {generating ? (
              <div className="flex h-[400px] items-center justify-center">
                <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt="BrainBloom stats"
                  className="w-full aspect-square object-cover"
                />
                <div className="p-5 space-y-3">
                  <p className="text-center text-sm font-medium text-muted-foreground">Your share card is ready</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleShare}
                      disabled={sharing}
                      className={cn(
                        "flex h-12 items-center justify-center gap-2 rounded-xl border border-border/50 bg-muted/30 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50",
                        sharing && "bg-primary/10 border-primary/30",
                      )}
                    >
                      {sharing ? (
                        <>
                          <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Sharing...
                        </>
                      ) : (
                        <>
                          <Share2 className="size-4" />
                          Share
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border/50 bg-muted/30 text-sm font-semibold transition-all active:scale-[0.98]"
                    >
                      <Download className="size-4" />
                      Download
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}