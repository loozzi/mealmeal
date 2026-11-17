"use client";

import { useRouter } from "next/navigation";
import { GoalForm } from "@/components/goal/GoalForm";

export default function OnboardingPage() {
  const router = useRouter();
  return (
    <main className="px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <h1 className="text-2xl font-bold">Chào bạn đến với MealMeal</h1>
      <p className="mt-2 mb-6 text-[15px] text-muted">
        Đặt mục tiêu calories mỗi ngày để bắt đầu theo dõi bữa ăn.
      </p>
      <GoalForm key={router.bfcacheId} submitLabel="Bắt đầu" onSaved={() => router.replace("/")} />
    </main>
  );
}
