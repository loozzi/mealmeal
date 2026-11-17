import type { ReactNode } from "react";

type Props = {
  label: string;
  /** id of the input rendered in `children`; the input should set aria-describedby to `${htmlFor}-note`. */
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

/** Returns the aria attributes an input inside a Field should carry. */
export function fieldAria(id: string, opts: { hint?: string; error?: string }) {
  return {
    id,
    "aria-invalid": opts.error ? true : undefined,
    "aria-describedby": opts.error || opts.hint ? `${id}-note` : undefined,
  } as const;
}

export const INPUT_CLASS =
  "min-h-11 w-full rounded-xl border border-line bg-card px-3 text-[16px] text-ink tabular-nums outline-none placeholder:text-muted/70 focus:border-ink aria-[invalid=true]:border-brand";

export function Field({ label, htmlFor, hint, error, children }: Props) {
  const note = error ?? hint;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {note && (
        <p id={`${htmlFor}-note`} className={`text-[13px] ${error ? "text-brand" : "text-muted"}`}>
          {note}
        </p>
      )}
    </div>
  );
}
