"use client";

import { useRef, type ChangeEvent } from "react";

type Props = {
  photoUrl: string | null;
  onPick(file: File): void;
  onClear(): void;
  busy?: boolean;
};

const PICK_CLASS =
  "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-card px-3 text-[15px] font-semibold text-ink active:bg-bg disabled:opacity-45";

function CameraIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 17" />
      <circle cx="15" cy="9.5" r="1.2" />
    </svg>
  );
}

export function PhotoPicker({ photoUrl, onPick, onClear, busy = false }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file again still fires a change event.
    e.target.value = "";
    if (file) onPick(file);
  };

  return (
    <div className="flex flex-col gap-3">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleChange} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={handleChange} />
      <div className="flex gap-3">
        <button type="button" className={PICK_CLASS} disabled={busy} onClick={() => cameraRef.current?.click()}>
          <CameraIcon />
          Chụp ảnh
        </button>
        <button type="button" className={PICK_CLASS} disabled={busy} onClick={() => galleryRef.current?.click()}>
          <GalleryIcon />
          Chọn ảnh
        </button>
      </div>
      {busy && <p className="text-sm text-muted">Đang xử lý ảnh…</p>}
      {photoUrl && !busy && (
        <div className="relative overflow-hidden rounded-2xl border border-line bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL, nothing to optimise */}
          <img src={photoUrl} alt="Ảnh bữa ăn đã chọn" className="max-h-72 w-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 inline-flex min-h-11 items-center rounded-full bg-ink/75 px-4 text-sm font-semibold text-white active:bg-ink"
          >
            Bỏ ảnh
          </button>
        </div>
      )}
    </div>
  );
}
