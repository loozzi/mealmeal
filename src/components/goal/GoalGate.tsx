"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { db } from "@/lib/db";

const ONBOARDING = "/onboarding";

type GateState = "has-goal" | "no-goal" | "blocked";

/**
 * Keeps people on /onboarding until a goal exists, and off it afterwards. Queries the table here
 * rather than through useGoals so a blocked IndexedDB becomes a message instead of a render error.
 */
export function GoalGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const state = useLiveQuery(async (): Promise<GateState> => {
    try {
      return (await db.goals.count()) > 0 ? "has-goal" : "no-goal";
    } catch {
      return "blocked";
    }
  }, []);

  const onOnboarding = pathname === ONBOARDING;
  const redirectTo =
    state === "no-goal" && !onOnboarding ? ONBOARDING : state === "has-goal" && onOnboarding ? "/" : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (state === "blocked") {
    return (
      <main className="flex min-h-dvh items-center px-6">
        <p role="alert" className="text-center text-[15px] text-muted">
          Trình duyệt đang chặn lưu dữ liệu trên máy. Hãy tắt chế độ riêng tư hoặc dùng trình duyệt khác.
        </p>
      </main>
    );
  }

  // Loading or about to redirect: an empty screen in the page background colour.
  if (state === undefined || redirectTo) return <div className="min-h-dvh" />;

  return <>{children}</>;
}
