"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MealEditor, type MealDraft } from "@/components/meal/MealEditor";
import { PhotoPicker } from "@/components/meal/PhotoPicker";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { Field, INPUT_CLASS } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { AnalyzeClientError, ERROR_MESSAGE, analyze } from "@/lib/api-client";
import { nowTime, resolveDateParam, todayKey, type DateKey } from "@/lib/dates";
import { putPhoto, requestPersistentStorage } from "@/lib/local-db";
import { saveMeal } from "@/lib/store";
import { formatDayLong } from "@/lib/format";
import { prepareImage } from "@/lib/image";
import { clearPendingPhoto, peekPendingPhoto } from "@/lib/pending-photo";
import { toMealItem } from "@/lib/nutrition";
import { TEXT_MAX_CHARS, type MealAnalysis } from "@/lib/schema";

type Phase = "input" | "analyzing" | "result";

const defaultTime = (date: DateKey) => (date === todayKey() ? nowTime() : "12:00");

function AddMeal() {
  const router = useRouter();
  const params = useSearchParams();
  const date = resolveDateParam(params.get("d"), todayKey());
  const pendingId = params.get("photo");
  const homeHref = `/?d=${date}`;

  // A photo from the home screen's camera button starts analyzing at once (see the effect below).
  const [phase, setPhase] = useState<Phase>(() => (peekPendingPhoto(pendingId) ? "analyzing" : "input"));
  const [photo, setPhoto] = useState<{ blob: Blob; dataUrl: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [text, setText] = useState("");
  const [time, setTime] = useState(() => defaultTime(date));
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [mealId, setMealId] = useState<string | null>(null);
  const [editorValid, setEditorValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const savingRef = useRef(false);

  // Leaving the page cancels a request that is still running.
  useEffect(() => () => controllerRef.current?.abort(), []);

  // An unsaved result is lost on reload or tab close, so ask the browser to confirm.
  useEffect(() => {
    if (phase !== "result") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  const handlePick = async (file: File) => {
    setError(null);
    setPreparing(true);
    try {
      setPhoto(await prepareImage(file));
    } catch {
      setError("Không đọc được ảnh này. Hãy thử ảnh khác.");
    } finally {
      setPreparing(false);
    }
  };

  const description = text.trim();
  const canAnalyze = !preparing && (photo !== null || description !== "");

  const showResult = (result: MealAnalysis) => {
    setDraft({ ...result, items: result.items.map((item) => toMealItem(item, crypto.randomUUID())) });
    setMealId(crypto.randomUUID());
    setEditorValid(false);
    setPhase("result");
  };

  const showAnalyzeError = (err: unknown) => {
    const code = err instanceof AnalyzeClientError ? err.code : "AI_ERROR";
    if (code !== "ABORTED") setError(ERROR_MESSAGE[code]);
    setPhase("input");
  };

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setPhase("analyzing");
    try {
      showResult(await analyze({ image: photo?.dataUrl, text: description || undefined }, controller.signal));
    } catch (err) {
      showAnalyzeError(err);
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  };

  // A photo taken with the home screen's camera button is analyzed straight away; the result
  // still waits for the user to review and save. A run cut short by leaving the page (or by
  // React re-running effects) changes nothing and leaves the photo for the next run; a run that
  // finishes forgets it, so coming back to this URL does not analyze it twice.
  const showResultRef = useRef(showResult);
  const showErrorRef = useRef(showAnalyzeError);
  useEffect(() => {
    showResultRef.current = showResult;
    showErrorRef.current = showAnalyzeError;
  });
  useEffect(() => {
    const file = peekPendingPhoto(pendingId);
    if (!file || pendingId === null) return;
    let cancelled = false;
    const controller = new AbortController();
    controllerRef.current = controller;
    void (async () => {
      let prepared: { blob: Blob; dataUrl: string };
      try {
        prepared = await prepareImage(file);
      } catch {
        if (cancelled) return;
        clearPendingPhoto(pendingId);
        setError("Không đọc được ảnh này. Hãy thử ảnh khác.");
        setPhase("input");
        return;
      }
      if (cancelled) return;
      setPhoto(prepared);
      try {
        const result = await analyze({ image: prepared.dataUrl }, controller.signal);
        if (cancelled) return;
        clearPendingPhoto(pendingId);
        showResultRef.current(result);
      } catch (err) {
        if (cancelled) return;
        clearPendingPhoto(pendingId);
        showErrorRef.current(err);
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pendingId]);

  const handleSave = async () => {
    if (!draft || !mealId || !editorValid || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      // The photo stays on this device; only the meal goes to the account.
      if (photo) await putPhoto(mealId, photo.blob);
      // Firestore applies the write locally at once and syncs in the background.
      saveMeal({
        id: mealId,
        date,
        time: time || defaultTime(date),
        source: photo && description ? "both" : photo ? "photo" : "text",
        ...(description ? { description } : {}),
        hasPhoto: photo !== null,
        ...draft,
        title: draft.title.trim(),
        createdAt: now,
        updatedAt: now,
      });
      void requestPersistentStorage();
      router.replace(homeHref);
    } catch {
      savingRef.current = false;
      setSaving(false);
      setError("Không lưu được. Bộ nhớ trình duyệt có thể đã đầy.");
    }
  };

  if (phase === "analyzing") {
    return (
      <>
        <PageHeader title={`Thêm bữa · ${formatDayLong(date)}`} />
        <main className="flex flex-col items-center gap-5 px-4 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL, nothing to optimise
            <img src={photo.dataUrl} alt="" className="max-h-64 w-full rounded-2xl object-cover opacity-50 blur-[2px]" />
          )}
          <span
            aria-hidden
            className="size-9 animate-spin rounded-full border-[3px] border-ink border-t-transparent motion-reduce:animate-none"
          />
          <p role="status" className="text-[15px] text-muted">
            Đang ước tính dinh dưỡng…
          </p>
          <Button variant="secondary" className="w-full" onClick={() => controllerRef.current?.abort()}>
            Hủy
          </Button>
        </main>
      </>
    );
  }

  if (phase === "result" && draft) {
    return (
      <>
        <PageHeader title="Kết quả" onBack={() => setConfirmLeave(true)} />
        <main className="flex flex-col gap-4 px-4 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <MealEditor
            key={mealId}
            value={draft}
            onChange={setDraft}
            photoUrl={photo?.dataUrl}
            onValidityChange={setEditorValid}
          />
          <ErrorNote message={error} />
          <p className="text-sm text-muted">Chưa đúng? Bổ sung mô tả rồi phân tích lại.</p>
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => {
              setError(null);
              setPhase("input");
            }}
          >
            Phân tích lại
          </Button>
          <Button disabled={!editorValid} loading={saving} onClick={handleSave}>
            Lưu bữa ăn
          </Button>
        </main>
        <ConfirmDialog
          open={confirmLeave}
          title="Bỏ kết quả này?"
          message="Kết quả phân tích chưa được lưu và sẽ mất."
          confirmLabel="Bỏ"
          danger
          onConfirm={() => router.push(homeHref)}
          onCancel={() => setConfirmLeave(false)}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={`Thêm bữa · ${formatDayLong(date)}`} backHref={homeHref} />
      <main className="flex flex-col gap-5 px-4 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <PhotoPicker photoUrl={photo?.dataUrl ?? null} onPick={handlePick} onClear={() => setPhoto(null)} busy={preparing} />
        <Field label="Mô tả" htmlFor="add-text" hint="Không bắt buộc nếu có ảnh.">
          <textarea
            id="add-text"
            aria-describedby="add-text-note"
            className={`${INPUT_CLASS} min-h-24 py-2.5`}
            placeholder="vd: 1 bát cơm, 150g ức gà áp chảo, rau luộc"
            maxLength={TEXT_MAX_CHARS}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
        <Field label="Giờ ăn" htmlFor="add-time">
          <input id="add-time" type="time" className={`${INPUT_CLASS} !w-36`} value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <ErrorNote message={error} />
        <Button disabled={!canAnalyze} onClick={handleAnalyze}>
          Phân tích
        </Button>
      </main>
    </>
  );
}

export default function AddPage() {
  // Routes stay mounted (hidden) between visits, so a fresh visit must start a fresh form;
  // back/forward keeps the same id and restores what was typed.
  const { bfcacheId } = useRouter();
  return (
    <Suspense fallback={null}>
      <AddMeal key={bfcacheId} />
    </Suspense>
  );
}
