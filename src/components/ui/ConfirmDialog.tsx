"use client";

import { Button } from "./Button";
import { Sheet } from "./Sheet";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm(): void;
  onCancel(): void;
};

export function ConfirmDialog({ open, title, message, confirmLabel, danger = false, onConfirm, onCancel }: Props) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p className="mb-4 text-[15px] text-muted">{message}</p>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>
          Hủy
        </Button>
        <Button variant={danger ? "danger" : "primary"} className="flex-1" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
