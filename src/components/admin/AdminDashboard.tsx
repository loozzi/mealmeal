"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/ErrorNote";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminClientError, fetchAdminStats, type AdminClientCode } from "@/lib/admin-client";
import { ADMIN_ERROR_MESSAGE, type AdminStats, type StatsRange } from "@/lib/admin-types";
import { formatDate, formatDateTime, formatInt, formatUsd, formatUsdRate } from "@/lib/format";
import { DaysList } from "./DaysList";
import { UserList } from "./UserList";

const RANGE_LABEL: Record<StatsRange, string> = { today: "Hôm nay", "7d": "7 ngày", "30d": "30 ngày" };
const GENERIC_ERROR = "Không tải được số liệu. Hãy thử lại.";

type Result = { key: string; stats?: AdminStats; error?: { code: AdminClientCode; message?: string } };

function RefreshIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}

function Tile({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-2xl border border-line bg-card p-3">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xl font-semibold tabular-nums">{value}</span>
      {children && <span className="text-xs text-muted tabular-nums">{children}</span>}
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-line/70 motion-reduce:animate-none" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-line/70 motion-reduce:animate-none" />
      ))}
    </div>
  );
}

function Overview({ stats }: { stats: AdminStats }) {
  const t = stats.totals;
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Tile label="Chi phí ước tính" value={t.costUsd === null ? "Chưa đặt giá" : formatUsd(t.costUsd)} />
        <Tile label="Token" value={formatInt(t.inputTokens + t.outputTokens)}>
          vào {formatInt(t.inputTokens)} · ra {formatInt(t.outputTokens)}
          {t.missingUsage > 0 && <span className="block text-warn">Có {formatInt(t.missingUsage)} lượt gọi không kèm số token, chưa được tính.</span>}
        </Tile>
        <Tile label="Người dùng hoạt động" value={`${formatInt(t.activeUsers)} / ${formatInt(t.accounts)} tài khoản`}>
          +{formatInt(t.newAccounts)} tài khoản mới
        </Tile>
        <Tile label="Lượt phân tích" value={`${formatInt(t.requests)} (OK ${formatInt(t.ok)})`}>
          {formatInt(t.notFood)} không phải món ăn · {formatInt(t.failed)} lỗi · {formatInt(t.rateLimited)} bị giới hạn
        </Tile>
      </div>
      <p className="text-sm tabular-nums">Bữa ăn đã ghi: {formatInt(t.meals)}</p>
    </>
  );
}

export function AdminDashboard({ range }: { range: StatsRange }) {
  const router = useRouter();
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  // The numbers on screen: kept while a new range loads, so the page does not jump.
  const [shown, setShown] = useState<AdminStats | null>(null);
  const key = `${range}#${nonce}`;
  const loading = result?.key !== key;

  useEffect(() => {
    let live = true;
    fetchAdminStats(range).then(
      (stats) => {
        if (!live) return;
        setResult({ key, stats });
        setShown(stats);
      },
      (err: unknown) => {
        if (!live) return;
        const e = err instanceof AdminClientError ? err : new AdminClientError("ADMIN_ERROR");
        setResult({ key, error: { code: e.code, message: e.serverMessage } });
      },
    );
    return () => {
      live = false;
    };
  }, [range, key]);

  const error = !loading ? result?.error : undefined;
  const refresh = (
    <button
      type="button"
      aria-label="Làm mới"
      onClick={() => setNonce((n) => n + 1)}
      className="inline-flex size-11 items-center justify-center rounded-full active:bg-line/60"
    >
      <RefreshIcon />
    </button>
  );

  if (error?.code === "FORBIDDEN") {
    return (
      <>
        <PageHeader title="Quản trị" backHref="/settings" />
        <main className="flex flex-col gap-3 px-4 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <p>{ADMIN_ERROR_MESSAGE.FORBIDDEN}</p>
          <Link href="/" className="inline-flex min-h-11 items-center self-start font-semibold underline">
            Về trang chính
          </Link>
        </main>
      </>
    );
  }

  const stats = shown;
  const updated = stats ? formatDateTime(stats.generatedAt).slice(-5) : null;

  return (
    <>
      <PageHeader title="Quản trị" backHref="/settings" right={refresh} />
      <main className="flex flex-col gap-4 px-4 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-line/60 p-1">
          {(Object.keys(RANGE_LABEL) as StatsRange[]).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={r === range}
              onClick={() => router.replace(`/admin?range=${r}`)}
              className={`min-h-11 rounded-lg text-sm font-semibold ${r === range ? "bg-card shadow-sm" : "text-muted"}`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>

        {error &&
          (error.code === "ADMIN_UNAVAILABLE" ? (
            <ErrorNote message={error.message || ADMIN_ERROR_MESSAGE.ADMIN_UNAVAILABLE} />
          ) : (
            <div className="flex flex-col gap-2">
              <ErrorNote message={GENERIC_ERROR} />
              <Button variant="secondary" className="self-start" onClick={() => setNonce((n) => n + 1)}>
                Thử lại
              </Button>
            </div>
          ))}

        {stats ? (
          <div className={`flex flex-col gap-4 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading || undefined}>
            <p className="text-sm text-muted tabular-nums">
              {stats.from === stats.to ? formatDate(stats.to) : `${formatDate(stats.from)} – ${formatDate(stats.to)}`} · cập nhật {updated}
            </p>
            <Overview stats={stats} />
            {stats.range !== "today" && <DaysList days={stats.days} hasPrice={stats.price !== null} />}
            <UserList key={stats.range} users={stats.users} />
            <p className="text-xs text-muted tabular-nums">
              {stats.price
                ? `Chi phí tính theo giá hiện tại: vào ${formatUsdRate(stats.price.inputPer1M)} / ra ${formatUsdRate(stats.price.outputPer1M)} cho 1 triệu token.`
                : "Đặt AI_PRICE_INPUT_PER_1M_USD và AI_PRICE_OUTPUT_PER_1M_USD để xem chi phí."}
            </p>
          </div>
        ) : (
          loading && <Skeleton />
        )}
      </main>
    </>
  );
}

