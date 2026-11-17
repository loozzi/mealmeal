"use client";

import { useEffect, useState } from "react";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { onSyncError } from "@/lib/sync-errors";

const SHOW_MS = 5000;

/** Shows a failed background write at the top of the screen for a few seconds. */
export function SyncErrorBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = onSyncError((text) => {
      setMessage(text);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), SHOW_MS);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);

  if (!message) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 mx-auto max-w-[480px] bg-bg px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2">
      <ErrorNote message={message} />
    </div>
  );
}
