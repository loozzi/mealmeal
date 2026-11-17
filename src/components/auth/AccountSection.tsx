"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { hasPendingWrites, signOutAndClear } from "@/lib/auth-client";
import { useAuth } from "./AuthProvider";

/** The signed-in account and the sign-out flow of sync design §6.3. */
export function AccountSection() {
  const { user } = useAuth();
  const [dialog, setDialog] = useState<"confirm" | "pending" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const signOutNow = async () => {
    setDialog(null);
    setBusy(true);
    try {
      await signOutAndClear();
    } catch {
      setBusy(false);
      setError("Không đăng xuất được. Hãy thử lại.");
    }
  };

  const handleConfirm = async () => {
    setDialog(null);
    setBusy(true);
    setError(null);
    if (await hasPendingWrites()) {
      setBusy(false);
      setDialog("pending");
      return;
    }
    await signOutNow();
  };

  return (
    <section className="mt-8 border-t border-line pt-6" aria-labelledby="account-heading">
      <h2 id="account-heading" className="text-[13px] font-semibold text-muted">
        Tài khoản
      </h2>
      <div className="mt-3 flex items-center gap-3">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element -- small avatar from Google
          <img
            src={user.photoURL}
            alt=""
            width={40}
            height={40}
            referrerPolicy="no-referrer"
            className="size-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-line/70 font-semibold text-muted">
            {(user.email ?? "?").charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[15px]">{user.email ?? user.displayName}</span>
      </div>
      <ErrorNote message={error} />
      <Button variant="secondary" className="mt-4 w-full" loading={busy} onClick={() => setDialog("confirm")}>
        Đăng xuất
      </Button>
      <ConfirmDialog
        open={dialog === "confirm"}
        title="Đăng xuất"
        message="Đăng xuất khỏi tài khoản này? Dữ liệu vẫn được lưu trên tài khoản."
        confirmLabel="Đăng xuất"
        onConfirm={() => void handleConfirm()}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "pending"}
        title="Chưa đồng bộ xong"
        message="Còn thay đổi chưa đồng bộ. Đăng xuất bây giờ sẽ mất các thay đổi này."
        confirmLabel="Vẫn đăng xuất"
        danger
        onConfirm={() => void signOutNow()}
        onCancel={() => setDialog(null)}
      />
    </section>
  );
}
