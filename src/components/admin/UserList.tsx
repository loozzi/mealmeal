"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { AdminStats } from "@/lib/admin-types";
import { toDateKey } from "@/lib/dates";
import { formatDate, formatDateTime, formatInt, formatUsd } from "@/lib/format";

const PAGE = 50;

type User = AdminStats["users"][number];

function UserCard({ u }: { u: User }) {
  const name = u.email ?? `Tài khoản đã xóa (${u.uid.slice(0, 6)})`;
  const used = u.lastUsedAt ? `Dùng gần nhất ${formatDateTime(u.lastUsedAt)}` : "Chưa dùng AI";
  const created = u.createdAt ? ` · Tạo ${formatDate(toDateKey(new Date(u.createdAt)))}` : "";
  return (
    <li className="flex flex-col gap-0.5 rounded-2xl border border-line bg-card p-3 text-sm tabular-nums">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`min-w-0 truncate font-medium ${u.email ? "" : "text-muted"}`}>{name}</span>
        {u.costUsd !== null && <span className="shrink-0 font-semibold">{formatUsd(u.costUsd)}</span>}
      </div>
      <span className="text-muted">
        {formatInt(u.requests)} lượt · {formatInt(u.inputTokens + u.outputTokens)} token · {formatInt(u.meals)} bữa
      </span>
      <span className="text-xs text-muted">
        {used}
        {created}
      </span>
    </li>
  );
}

export function UserList({ users }: { users: User[] }) {
  const [limit, setLimit] = useState(PAGE);
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-base font-semibold">Người dùng ({formatInt(users.length)})</h2>
      <ul className="flex flex-col gap-2">
        {users.slice(0, limit).map((u) => (
          <UserCard key={u.uid} u={u} />
        ))}
      </ul>
      {users.length > limit && (
        <Button variant="secondary" onClick={() => setLimit((n) => n + PAGE)}>
          Xem thêm
        </Button>
      )}
    </section>
  );
}
