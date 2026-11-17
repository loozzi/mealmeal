"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MealEditor, type MealDraft } from "@/components/meal/MealEditor";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { Field, INPUT_CLASS, fieldAria } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { isFuture, parseDateKey, todayKey } from "@/lib/dates";
import { deleteMeal, saveMeal } from "@/lib/db";
import { useMeal } from "@/lib/db-hooks";
import type { Meal } from "@/lib/types";
import { useObjectUrl } from "@/lib/use-object-url";

const MAIN_CLASS = "flex flex-col gap-4 px-4 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom))]";

const snapshot = (draft: MealDraft, date: string, time: string) => JSON.stringify([draft, date, time]);

function MealForm({ meal }: { meal: Meal }) {
  const router = useRouter();
  // Copied once: later changes to the stored record must not overwrite what is being edited.
  const [draft, setDraft] = useState<MealDraft>(() => ({
    title: meal.title,
    items: meal.items,
    confidence: meal.confidence,
    notes: meal.notes,
  }));
  const [date, setDate] = useState<string>(meal.date);
  const [time, setTime] = useState(meal.time);
  const [initial] = useState(() => snapshot(draft, date, time));
  const [editorValid, setEditorValid] = useState(false);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"delete" | "leave" | null>(null);
  const photoUrl = useObjectUrl(meal.photo);

  const today = todayKey();
  const dateOk = parseDateKey(date) !== null && !isFuture(date, today);
  const dateError = dateOk ? undefined : "Chọn một ngày không sau hôm nay.";
  const timeOk = /^\d{2}:\d{2}$/.test(time);
  const dirty = snapshot(draft, date, time) !== initial;
  const canSave = dirty && editorValid && dateOk && timeOk && busy === null;
  const homeHref = `/?d=${meal.date}`;

  const handleSave = async () => {
    if (!canSave) return;
    setBusy("save");
    setError(null);
    try {
      await saveMeal({ ...meal, ...draft, title: draft.title.trim(), date, time });
      router.push(`/?d=${date}`);
    } catch {
      setBusy(null);
      setError("Không lưu được. Bộ nhớ trình duyệt có thể đã đầy.");
    }
  };

  const handleDelete = async () => {
    setDialog(null);
    setBusy("delete");
    setError(null);
    try {
      await deleteMeal(meal.id);
      router.replace(homeHref);
    } catch {
      setBusy(null);
      setError("Không xóa được bữa ăn. Hãy thử lại.");
    }
  };

  return (
    <>
      <PageHeader title="Bữa ăn" backHref={homeHref} onBack={dirty ? () => setDialog("leave") : undefined} />
      <main className={MAIN_CLASS}>
        <MealEditor value={draft} onChange={setDraft} photoUrl={photoUrl} onValidityChange={setEditorValid} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ngày" htmlFor="meal-date" error={dateError}>
            <input
              {...fieldAria("meal-date", { error: dateError })}
              type="date"
              max={today}
              className={INPUT_CLASS}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Giờ ăn" htmlFor="meal-time">
            <input
              id="meal-time"
              type="time"
              aria-invalid={!timeOk || undefined}
              className={INPUT_CLASS}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
        </div>
        <ErrorNote message={error} />
        <Button disabled={!canSave && busy !== "save"} loading={busy === "save"} onClick={handleSave}>
          Lưu thay đổi
        </Button>
        <Button variant="ghost" className="!text-brand" disabled={busy !== null} loading={busy === "delete"} onClick={() => setDialog("delete")}>
          Xóa bữa ăn
        </Button>
      </main>
      <ConfirmDialog
        open={dialog === "delete"}
        title="Xóa bữa ăn"
        message="Xóa bữa ăn này? Không thể hoàn tác."
        confirmLabel="Xóa"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "leave"}
        title="Bỏ các thay đổi?"
        message="Các thay đổi chưa lưu sẽ mất."
        confirmLabel="Bỏ"
        danger
        onConfirm={() => router.push(homeHref)}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}

function MealDetail() {
  const id = useSearchParams().get("id");
  const meal = useMeal(id);
  // The record as first loaded. Kept so the form stays up while a delete or save navigates away,
  // instead of flashing "not found" when the live query reports the record gone.
  const [loaded, setLoaded] = useState<Meal | null>(null);
  if (meal && loaded?.id !== meal.id) setLoaded(meal);
  const current = loaded && loaded.id === id ? loaded : null;

  if (current) return <MealForm key={current.id} meal={current} />;

  if (meal === undefined) {
    return (
      <>
        <PageHeader title="Bữa ăn" backHref="/" />
        <main className={MAIN_CLASS} aria-busy="true">
          <div className="h-11 animate-pulse rounded-xl bg-line/70 motion-reduce:animate-none" />
          <div className="h-40 animate-pulse rounded-2xl bg-line/70 motion-reduce:animate-none" />
          <div className="h-20 animate-pulse rounded-2xl bg-line/70 motion-reduce:animate-none" />
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Bữa ăn" backHref="/" />
      <main className={`${MAIN_CLASS} items-center pt-16 text-center`}>
        <p className="text-lg font-semibold">Không tìm thấy bữa ăn</p>
        <p className="text-[15px] text-muted">Bữa ăn này có thể đã bị xóa.</p>
        <Link
          href="/"
          className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-5 text-[15px] font-semibold text-white active:bg-ink/85"
        >
          Về trang chính
        </Link>
      </main>
    </>
  );
}

export default function MealPage() {
  return (
    <Suspense fallback={null}>
      <MealDetail />
    </Suspense>
  );
}
