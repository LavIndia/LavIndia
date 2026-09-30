"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { css } from "styled-system/css";
import type { PromotionStatus } from "@/modules/promotions/mapping";

type Action = "activate" | "pause" | "resume" | "end" | "archive" | "restore";

const LABELS: Record<Action, { label: string; done: string }> = {
  activate: { label: "Activate", done: "Offer activated" },
  pause: { label: "Pause", done: "Offer paused" },
  resume: { label: "Resume", done: "Offer resumed" },
  end: { label: "End now", done: "Offer ended" },
  archive: { label: "Archive", done: "Offer archived" },
  restore: { label: "Restore", done: "Offer restored" },
};

/** Which lifecycle steps make sense from each status. */
const ALLOWED: Record<PromotionStatus, Action[]> = {
  DRAFT: ["activate", "archive"],
  SCHEDULED: ["pause", "end", "archive"],
  LIVE: ["pause", "end", "archive"],
  PAUSED: ["resume", "end", "archive"],
  ENDED: ["activate", "archive"],
  ARCHIVED: ["restore"],
};

export function PromotionActions({
  id,
  status,
  canDelete,
}: {
  id: string;
  status: PromotionStatus;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async (url: string, init: RequestInit, done: string, go?: (body: { promotion?: { id: string } }) => string) => {
    setBusy(true);
    try {
      const res = await fetch(url, init);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Something went wrong");
      toast.success(done);
      if (go) router.push(go(body));
      else router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const lifecycle = (action: Action) =>
    run(
      `/api/admin/promotions/${id}/lifecycle`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) },
      LABELS[action].done,
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Offer actions" disabled={busy}>
          <MoreHorizontal className={css({ width: "4", height: "4" })} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status !== "ARCHIVED" && (
          <DropdownMenuItem onClick={() => router.push(`/admin/promotions/${id}`)}>Edit</DropdownMenuItem>
        )}
        {ALLOWED[status].map((action) => (
          <DropdownMenuItem key={action} onClick={() => lifecycle(action)}>
            {LABELS[action].label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onClick={() =>
            run(`/api/admin/promotions/${id}/duplicate`, { method: "POST" }, "Copied as a draft", (b) =>
              b.promotion ? `/admin/promotions/${b.promotion.id}` : "/admin/promotions",
            )
          }
        >
          Duplicate
        </DropdownMenuItem>
        {canDelete && (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => run(`/api/admin/promotions/${id}`, { method: "DELETE" }, "Offer deleted")}
          >
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
