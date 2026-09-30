"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { css } from "styled-system/css";
import { field, grid3, hint } from "./editor.styles";
import { CountInput } from "./MoneyInput";

interface Batch {
  batch: string;
  createdAt: string;
  total: number;
  used: number;
  usesEach: number | null;
  codes: Array<{ code: string; usedCount: number }>;
}

const batchRow = css({ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "2", borderRadius: "lg", border: "1px solid", borderColor: "border.subtle", padding: "3", fontSize: "sm" });

/**
 * Unique codes — one per client, usually usable once — for a private offer.
 * Generated here, copied out to send, and counted separately from the
 * offer's shared code.
 */
export function CodesPanel({ promotionId }: { promotionId?: string }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [count, setCount] = useState<number | null>(25);
  const [prefix, setPrefix] = useState("VIP");
  const [usesEach, setUsesEach] = useState<number | null>(1);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!promotionId) return;
    fetch(`/api/admin/promotions/${promotionId}/codes`)
      .then((r) => r.json())
      .then((b) => setBatches(b.batches ?? []))
      .catch(() => {});
  }, [promotionId]);

  if (!promotionId) {
    return <p className={hint}>Save the offer first, then generate unique codes for it here.</p>;
  }

  const call = async (init: RequestInit, url = `/api/admin/promotions/${promotionId}/codes`) => {
    setWorking(true);
    try {
      const res = await fetch(url, init);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not update codes");
      setBatches(body.batches ?? []);
      return body;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update codes");
    } finally {
      setWorking(false);
    }
  };

  const copy = async (codes: string[]) => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success(`${codes.length} codes copied`);
    } catch {
      toast.error("Could not copy — select them from the list instead");
    }
  };

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      <div className={grid3}>
        <div className={field}>
          <Label htmlFor="codes-count">How many</Label>
          <CountInput id="codes-count" value={count} onChange={setCount} />
        </div>
        <div className={field}>
          <Label htmlFor="codes-prefix">Start each with</Label>
          <Input id="codes-prefix" value={prefix} maxLength={12} onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
        </div>
        <div className={field}>
          <Label htmlFor="codes-uses">Uses per code</Label>
          <CountInput id="codes-uses" value={usesEach} onChange={setUsesEach} placeholder="Unlimited" />
        </div>
      </div>
      <p className={hint}>
        Codes look like {prefix ? `${prefix}-` : ""}K7M2QX — no 0/O or 1/I, so they read clearly aloud.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={working || !count}
        onClick={async () => {
          const body = await call({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count, prefix, usesEach }) });
          if (body) toast.success(`${count} codes generated`);
        }}
      >
        {working && <Loader2 className={css({ width: "4", height: "4", animation: "spin" })} />}
        Generate codes
      </Button>

      {batches.map((b) => {
        const unused = b.codes.filter((c) => c.usedCount === 0).map((c) => c.code);
        return (
          <div key={b.batch} className={batchRow}>
            <span>
              {b.total} codes · {b.used} used · {b.usesEach ? `${b.usesEach} use${b.usesEach === 1 ? "" : "s"} each` : "unlimited uses"}
              <span className={css({ display: "block", color: "fg.muted" })}>
                Made {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </span>
            <span className={css({ display: "flex", gap: "2" })}>
              <Button type="button" variant="outline" size="sm" disabled={!unused.length} onClick={() => copy(unused)}>
                <Copy className={css({ width: "3.5", height: "3.5" })} /> Copy {unused.length} unused
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={working || !unused.length} onClick={() => call({ method: "DELETE" }, `/api/admin/promotions/${promotionId}/codes?batch=${b.batch}`)}>
                Remove unused
              </Button>
            </span>
          </div>
        );
      })}
    </div>
  );
}
