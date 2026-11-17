"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { signInWithGoogle } from "@/lib/auth-client";

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      // On success AppGate sees the user and leaves /login.
      await signInWithGoogle();
    } catch {
      setError("Đăng nhập không thành công. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col justify-center gap-6 px-6 pt-[env(safe-area-inset-top)] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div>
        <h1 className="text-3xl font-bold">MealMeal</h1>
        <p className="mt-2 text-[15px] text-muted">Đăng nhập để dùng MealMeal trên mọi thiết bị.</p>
      </div>
      <ErrorNote message={error} />
      <Button className="w-full" loading={busy} disabled={busy} onClick={handleSignIn}>
        Đăng nhập bằng Google
      </Button>
    </main>
  );
}
