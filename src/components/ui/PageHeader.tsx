import Link from "next/link";
import type { ReactNode } from "react";

type Props = { title: string; backHref?: string; onBack?(): void; right?: ReactNode };

const BACK_CLASS = "-ml-2 inline-flex size-11 items-center justify-center rounded-full active:bg-line/60";

function BackIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

/** `onBack` wins over `backHref`, so a page can intercept leaving (e.g. to confirm discarding). */
export function PageHeader({ title, backHref, onBack, right }: Props) {
  return (
    <header className="flex min-h-14 items-center gap-1 px-4 pt-[env(safe-area-inset-top)]">
      {onBack ? (
        <button type="button" aria-label="Quay lại" onClick={onBack} className={BACK_CLASS}>
          <BackIcon />
        </button>
      ) : backHref ? (
        <Link href={backHref} aria-label="Quay lại" className={BACK_CLASS}>
          <BackIcon />
        </Link>
      ) : null}
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
      {right}
    </header>
  );
}
