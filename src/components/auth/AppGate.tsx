"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useHasGoal } from "@/lib/db-hooks";
import { hasLegacyData, runMigration } from "@/lib/migrate";
import { useAuth } from "./AuthProvider";

const LOGIN = "/login";
const ONBOARDING = "/onboarding";

const Blank = () => <div className="min-h-dvh" />;

function Message({ children }: { children: ReactNode }) {
  return <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">{children}</main>;
}

/**
 * The order of checks on every page (sync design §6.2): sign-in state known → signed in → v1 data
 * moved to the account → a goal exists → the page. /login is shown only to signed-out visitors.
 */
export function AppGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const onLogin = pathname === LOGIN;

  const redirectTo = user === null && !onLogin ? LOGIN : user && onLogin ? "/" : null;
  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (user === undefined || redirectTo) return <Blank />;
  if (user === null) return <>{children}</>;
  // Keyed by uid: a different account starts every check again.
  return (
    <Migration key={user.uid}>
      <GoalCheck>{children}</GoalCheck>
    </Migration>
  );
}

type MigrationState = "checking" | "migrating" | "failed" | "blocked" | "done";

function Migration({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MigrationState>("checking");

  const migrate = useCallback(async () => {
    setState("migrating");
    try {
      await runMigration();
      setState("done");
    } catch {
      setState("failed");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    hasLegacyData().then(
      (has) => {
        if (cancelled) return;
        if (has) void migrate();
        else setState("done");
      },
      // IndexedDB unavailable (e.g. some private modes): the app cannot keep photos or v1 data.
      () => !cancelled && setState("blocked"),
    );
    return () => {
      cancelled = true;
    };
  }, [migrate]);

  if (state === "blocked") {
    return (
      <Message>
        <p role="alert" className="text-[15px] text-muted">
          Trình duyệt đang chặn lưu dữ liệu trên máy. Hãy tắt chế độ riêng tư hoặc dùng trình duyệt khác.
        </p>
      </Message>
    );
  }
  if (state === "migrating") {
    return (
      <Message>
        <span
          aria-hidden
          className="size-9 animate-spin rounded-full border-[3px] border-ink border-t-transparent motion-reduce:animate-none"
        />
        <p role="status" className="text-[15px] text-muted">
          Đang chuyển dữ liệu lên tài khoản…
        </p>
      </Message>
    );
  }
  if (state === "failed") {
    return (
      <Message>
        <p role="alert" className="text-[15px] text-muted">
          Chưa chuyển được dữ liệu. Hãy kiểm tra mạng và thử lại.
        </p>
        <Button className="w-full" onClick={() => void migrate()}>
          Thử lại
        </Button>
      </Message>
    );
  }
  if (state === "checking") return <Blank />;
  return <>{children}</>;
}

/** Keeps people on /onboarding until a goal exists, and off it afterwards (as v1's GoalGate). */
function GoalCheck({ children }: { children: ReactNode }) {
  const hasGoal = useHasGoal();
  const pathname = usePathname();
  const router = useRouter();
  const onOnboarding = pathname === ONBOARDING;
  const redirectTo =
    hasGoal === false && !onOnboarding ? ONBOARDING : hasGoal === true && onOnboarding ? "/" : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (hasGoal === undefined || redirectTo) return <Blank />;
  return <>{children}</>;
}
