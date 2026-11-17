"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { Field, fieldAria, INPUT_CLASS } from "@/components/ui/Field";
import { todayKey } from "@/lib/dates";
import { formatInt, parseDecimal } from "@/lib/format";
import {
  ACTIVITY_OPTIONS,
  bodyStatsSchema,
  isValidTarget,
  MODE_OPTIONS,
  suggestTarget,
  tdee,
  type BodyStats,
} from "@/lib/tdee";
import { saveProfileAndGoal } from "@/lib/store";
import type { Activity, Goal, GoalMode, Profile, Sex } from "@/lib/types";

type Props = {
  initial?: { profile?: Profile; goal?: Goal };
  submitLabel: string;
  onSaved(): void;
};

type StatField = "mode" | "sex" | "age" | "heightCm" | "weightKg" | "bodyFatPct" | "activity";

const FIELD_ERROR: Record<StatField, string> = {
  mode: "Hãy chọn chế độ",
  sex: "Hãy chọn giới tính",
  age: "Nhập số nguyên từ 13 đến 100",
  heightCm: "Nhập số từ 100 đến 250",
  weightKg: "Nhập số từ 30 đến 300",
  bodyFatPct: "Nhập số từ 3 đến 60, hoặc để trống",
  activity: "Hãy chọn mức vận động",
};

const TARGET_HINT = "Từ 800 đến 6.000";
const TARGET_ERROR = "Nhập số từ 800 đến 6.000";
const SAVE_ERROR = "Không lưu được. Bộ nhớ trình duyệt có thể đã đầy.";

const SEX_OPTIONS: { code: Sex; label: string }[] = [
  { code: "male", label: "Nam" },
  { code: "female", label: "Nữ" },
];

const numberText = (n: number | undefined) => (n === undefined ? "" : String(n).replace(".", ","));

const choiceClass = (selected: boolean) =>
  `flex min-h-11 w-full items-center rounded-xl border px-3 py-2 text-left text-[15px] transition-colors ${
    selected ? "border-ink bg-ink text-white" : "border-line bg-card text-ink active:bg-bg"
  }`;

export function GoalForm({ initial, submitLabel, onSaved }: Props) {
  const p = initial?.profile;
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<GoalMode | null>(initial?.goal?.mode ?? null);
  const [sex, setSex] = useState<Sex | null>(p?.sex ?? null);
  const [age, setAge] = useState(numberText(p?.age));
  const [height, setHeight] = useState(numberText(p?.heightCm));
  const [weight, setWeight] = useState(numberText(p?.weightKg));
  const [bodyFat, setBodyFat] = useState(numberText(p?.bodyFatPct));
  const [activity, setActivity] = useState<Activity | null>(p?.activity ?? null);
  const [errors, setErrors] = useState<Partial<Record<StatField, string>>>({});

  // Set when step 2 is reached through the body stats; null when the user took the shortcut.
  const [stats, setStats] = useState<BodyStats | null>(null);
  const [target, setTarget] = useState("");
  const [targetError, setTargetError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const suggestion = stats && mode ? { tdee: tdee(stats), ...suggestTarget(tdee(stats), mode, stats.sex) } : null;

  function goToStep2(next: BodyStats | null, prefill: string) {
    setStats(next);
    setTarget(prefill);
    setTargetError(undefined);
    setSaveError(null);
    setStep(2);
  }

  function handleContinue(e: FormEvent) {
    e.preventDefault();
    const found: Partial<Record<StatField, string>> = {};
    if (!mode) found.mode = FIELD_ERROR.mode;

    const fatText = bodyFat.trim();
    const candidate = {
      sex: sex ?? undefined,
      age: parseDecimal(age) ?? undefined,
      heightCm: parseDecimal(height) ?? undefined,
      weightKg: parseDecimal(weight) ?? undefined,
      // An unreadable body-fat entry must fail validation instead of being treated as "left empty".
      bodyFatPct: fatText === "" ? undefined : (parseDecimal(fatText) ?? Number.NaN),
      activity: activity ?? undefined,
    };
    const parsed = bodyStatsSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as StatField;
        if (key in FIELD_ERROR) found[key] = FIELD_ERROR[key];
      }
    }

    setErrors(found);
    if (!parsed.success || !mode) return;
    const next = parsed.data as BodyStats;
    goToStep2(next, String(suggestTarget(tdee(next), mode, next.sex).kcal));
  }

  function handleShortcut() {
    if (!mode) {
      setErrors({ mode: FIELD_ERROR.mode });
      return;
    }
    setErrors({});
    // In settings, start from the number already in use; in onboarding the field starts empty.
    goToStep2(null, initial?.goal ? String(initial.goal.targetKcal) : "");
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (saving || !mode) return;
    const targetKcal = parseDecimal(target);
    if (targetKcal === null || !isValidTarget(targetKcal)) {
      setTargetError(TARGET_ERROR);
      return;
    }
    setTargetError(undefined);
    setSaving(true);
    setSaveError(null);

    // Shortcut: keep whatever body stats were saved before.
    const profile: Omit<Profile, "id" | "updatedAt"> = stats ?? {
      sex: p?.sex,
      age: p?.age,
      heightCm: p?.heightCm,
      weightKg: p?.weightKg,
      bodyFatPct: p?.bodyFatPct,
      activity: p?.activity,
    };

    try {
      // Applied locally at once; a failed sync is reported by the banner.
      saveProfileAndGoal(profile, {
        effectiveFrom: todayKey(),
        mode,
        targetKcal,
        suggestedKcal: suggestion?.kcal,
      });
    } catch {
      setSaving(false);
      setSaveError(SAVE_ERROR);
      return;
    }
    onSaved();
  }

  const disclaimer = (
    <p className="text-center text-[13px] text-muted">Con số chỉ mang tính tham khảo, không thay cho tư vấn y tế.</p>
  );

  if (step === 2) {
    return (
      <form onSubmit={handleSave} noValidate className="flex flex-col gap-5">
        {suggestion && (
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="text-sm text-muted">
              TDEE ước tính: <span className="tabular-nums text-ink">{formatInt(suggestion.tdee)} kcal</span>
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">Gợi ý: {formatInt(suggestion.kcal)} kcal/ngày</p>
            <p className="mt-1 text-sm text-muted tabular-nums">{suggestion.explanation}</p>
            {suggestion.floored && (
              <p className="mt-2 text-sm text-warn">Đã nâng lên mức tối thiểu khuyến nghị</p>
            )}
          </div>
        )}

        <Field label="Mục tiêu calories mỗi ngày (kcal)" htmlFor="goal-target" error={targetError} hint={TARGET_HINT}>
          <input
            {...fieldAria("goal-target", { error: targetError, hint: TARGET_HINT })}
            className={INPUT_CLASS}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </Field>

        <ErrorNote message={saveError} />

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setStep(1)} disabled={saving}>
            Quay lại
          </Button>
          <Button type="submit" className="flex-1" loading={saving}>
            {submitLabel}
          </Button>
        </div>
        {disclaimer}
      </form>
    );
  }

  const textField = (
    key: "age" | "heightCm" | "weightKg" | "bodyFatPct",
    label: string,
    value: string,
    set: (v: string) => void,
    hint?: string,
  ) => {
    const id = `goal-${key}`;
    return (
      <Field label={label} htmlFor={id} error={errors[key]} hint={hint}>
        <input
          {...fieldAria(id, { error: errors[key], hint })}
          className={INPUT_CLASS}
          type="text"
          inputMode={key === "age" ? "numeric" : "decimal"}
          autoComplete="off"
          value={value}
          onChange={(e) => set(e.target.value)}
        />
      </Field>
    );
  };

  return (
    <form onSubmit={handleContinue} noValidate className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2" aria-describedby={errors.mode ? "goal-mode-error" : undefined}>
        <legend className="mb-2 text-sm font-medium">Chế độ</legend>
        {MODE_OPTIONS.map((o) => (
          <button key={o.code} type="button" aria-pressed={mode === o.code} className={choiceClass(mode === o.code)} onClick={() => setMode(o.code)}>
            {o.label}
          </button>
        ))}
        {errors.mode && (
          <p id="goal-mode-error" role="alert" className="text-[13px] text-brand">
            {errors.mode}
          </p>
        )}
      </fieldset>

      <button type="button" onClick={handleShortcut} className="min-h-11 self-start text-[15px] font-medium text-brand underline underline-offset-4">
        Tôi đã biết con số của mình
      </button>

      <fieldset className="flex flex-col gap-2" aria-describedby={errors.sex ? "goal-sex-error" : undefined}>
        <legend className="mb-2 text-sm font-medium">Giới tính</legend>
        <div className="grid grid-cols-2 gap-2">
          {SEX_OPTIONS.map((o) => (
            <button key={o.code} type="button" aria-pressed={sex === o.code} className={`${choiceClass(sex === o.code)} justify-center`} onClick={() => setSex(o.code)}>
              {o.label}
            </button>
          ))}
        </div>
        {errors.sex && (
          <p id="goal-sex-error" role="alert" className="text-[13px] text-brand">
            {errors.sex}
          </p>
        )}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        {textField("age", "Tuổi", age, setAge)}
        {textField("heightCm", "Chiều cao (cm)", height, setHeight)}
        {textField("weightKg", "Cân nặng (kg)", weight, setWeight)}
        {textField("bodyFatPct", "Tỉ lệ mỡ (%)", bodyFat, setBodyFat, "Không bắt buộc")}
      </div>

      <fieldset className="flex flex-col gap-2" aria-describedby={errors.activity ? "goal-activity-error" : undefined}>
        <legend className="mb-2 text-sm font-medium">Mức vận động</legend>
        {ACTIVITY_OPTIONS.map((o) => {
          const selected = activity === o.code;
          return (
            <button key={o.code} type="button" aria-pressed={selected} className={`${choiceClass(selected)} flex-col items-start`} onClick={() => setActivity(o.code)}>
              <span className="font-medium">{o.label}</span>
              <span className={`text-[13px] ${selected ? "text-white/75" : "text-muted"}`}>{o.description}</span>
            </button>
          );
        })}
        {errors.activity && (
          <p id="goal-activity-error" role="alert" className="text-[13px] text-brand">
            {errors.activity}
          </p>
        )}
      </fieldset>

      <Button type="submit">Tiếp tục</Button>
      {disclaimer}
    </form>
  );
}
