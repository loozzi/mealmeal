"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { Sheet } from "@/components/ui/Sheet";
import { blobToDataUrl } from "@/lib/image";
import { CARD_HEIGHT, CARD_WIDTH, canShareFile, downloadBlob, renderCardToBlob, shareFileName } from "@/lib/share";
import { usePhoto } from "@/lib/local-db";
import type { Meal } from "@/lib/types";
import { ShareCard, fitCardTitle } from "./ShareCard";

type Props = { open: boolean; onClose(): void; meal: Meal; note?: string };

const EXPORT_ERROR = "Không tạo được ảnh. Hãy thử lại.";

/** The data URL of `photo`, or null while converting / when there is none. Tied to the blob it came from. */
function usePhotoDataUrl(photo: Blob | undefined) {
  const [converted, setConverted] = useState<{ blob: Blob; url: string } | null>(null);
  useEffect(() => {
    if (!photo) return;
    let cancelled = false;
    blobToDataUrl(photo).then(
      (url) => !cancelled && setConverted({ blob: photo, url }),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [photo]);
  const url = photo && converted?.blob === photo ? converted.url : null;
  return { url, pending: !!photo && url === null };
}

function SheetBody({ meal, note }: { meal: Meal; note?: string }) {
  const photo = usePhotoDataUrl(usePhoto(meal.id) ?? undefined);
  const frameRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canShare] = useState(() => canShareFile(new File([new Uint8Array(8)], "probe.png", { type: "image/png" })));

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The title is cut to fit by measuring with the loaded font (see fitText), then both cards render.
  const hasPhoto = photo.url !== null;
  const titleKey = `${hasPhoto}|${meal.title}`;
  const [fitted, setFitted] = useState<{ key: string; title: string } | null>(null);
  useEffect(() => {
    if (photo.pending) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setFitted({ key: titleKey, title: fitCardTitle(meal.title, hasPhoto) });
    });
    return () => {
      cancelled = true;
    };
  }, [photo.pending, titleKey, meal.title, hasPhoto]);
  const fittedTitle = fitted?.key === titleKey ? fitted.title : null;
  const cardMeal = useMemo(() => (fittedTitle === null ? null : { ...meal, title: fittedTitle }), [meal, fittedTitle]);

  const scale = frameWidth / CARD_WIDTH;
  const fileName = shareFileName(meal.date);

  // Rendered once when the sheet opens, so "Chia sẻ" can call navigator.share straight from the tap:
  // Safari refuses share() once a slow export has used up the tap's user activation.
  const [rendered, setRendered] = useState<{ blob: Blob } | "failed" | null>(null);
  useEffect(() => {
    if (!cardMeal || !exportRef.current) return;
    let cancelled = false;
    renderCardToBlob(exportRef.current).then(
      (blob) => !cancelled && setRendered({ blob }),
      () => !cancelled && setRendered("failed"),
    );
    return () => {
      cancelled = true;
    };
  }, [cardMeal, photo.url]);

  /** The PNG, rendering again if the first attempt failed. Null (with an error shown) on failure. */
  const getBlob = async (): Promise<Blob | null> => {
    if (rendered && rendered !== "failed") return rendered.blob;
    if (!exportRef.current) return null;
    setBusy(true);
    try {
      const blob = await renderCardToBlob(exportRef.current);
      setRendered({ blob });
      return blob;
    } catch {
      setError(EXPORT_ERROR);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    setError(null);
    const blob = await getBlob();
    if (blob) downloadBlob(blob, fileName);
  };

  const handleShare = async () => {
    setError(null);
    const blob = await getBlob();
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });
    try {
      await navigator.share({ files: [file], title: meal.title });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError("Không mở được bảng chia sẻ. Hãy dùng “Tải ảnh”.");
      }
    }
  };

  const loading = busy || rendered === null;
  const shownError = error ?? (rendered === "failed" ? EXPORT_ERROR : null);

  return (
    <div className="flex flex-col gap-3">
      <div ref={frameRef} className="w-full overflow-hidden rounded-2xl border border-line" style={{ height: CARD_HEIGHT * scale }}>
        {scale > 0 && (
          <div style={{ width: CARD_WIDTH, height: CARD_HEIGHT, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            {cardMeal && <ShareCard meal={cardMeal} photoDataUrl={photo.url} />}
          </div>
        )}
      </div>
      {note && <p className="text-sm text-muted">{note}</p>}
      <ErrorNote message={shownError} />
      <div className={`grid gap-3 ${canShare ? "grid-cols-2" : "grid-cols-1"}`}>
        {canShare && (
          <Button loading={loading} onClick={handleShare}>
            Chia sẻ
          </Button>
        )}
        <Button variant={canShare ? "secondary" : "primary"} loading={loading} onClick={handleDownload}>
          Tải ảnh
        </Button>
      </div>
      {/* Full-size copy for export. Off screen, never display:none, or it would render blank. */}
      <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
        {cardMeal && <ShareCard ref={exportRef} meal={cardMeal} photoDataUrl={photo.url} />}
      </div>
    </div>
  );
}

export function ShareSheet({ open, onClose, meal, note }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Chia sẻ bữa ăn">
      {open && <SheetBody meal={meal} note={note} />}
    </Sheet>
  );
}
