"use client";

import { useEffect, useState } from "react";

/** Object URL for a stored Blob, revoked when the blob changes or the component unmounts. */
export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!blob) return;
    const created = URL.createObjectURL(blob);
    // An object URL is a browser resource that must be created and released with the component's
    // lifetime, so it cannot be derived during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(created);
    return () => URL.revokeObjectURL(created);
  }, [blob]);

  return blob ? url : undefined;
}
