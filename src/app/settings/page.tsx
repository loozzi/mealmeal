"use client";

import { useRouter } from "next/navigation";
import { GoalForm } from "@/components/goal/GoalForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { todayKey } from "@/lib/dates";
import { useGoals, useProfile } from "@/lib/db-hooks";
import { goalForDate } from "@/lib/goals";

export default function SettingsPage() {
  const router = useRouter();
  const profile = useProfile();
  const goals = useGoals();
  const ready = profile !== undefined && goals !== undefined;

  return (
    <>
      <PageHeader title="Mục tiêu" backHref="/" />
      <main className="px-4 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {/* The form copies `initial` into its own state, so it is mounted only once the data is in. */}
        {ready && (
          <GoalForm
            key={router.bfcacheId}
            initial={{ profile: profile ?? undefined, goal: goalForDate(goals, todayKey()) }}
            submitLabel="Lưu"
            onSaved={() => router.push("/")}
          />
        )}
      </main>
    </>
  );
}
