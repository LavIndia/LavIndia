"use client";

import { useState } from "react";
import { css } from "styled-system/css";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rupees, shortDate, useGst } from "./gst-client";
import { Hint, Notice, Section, Stat, StatGrid, StatusPill, pageStyle, scrollX } from "./gst-ui";

interface Row { id: string; orderId: string | null; orderNumber: string | null; mode: string; channel: string; calculatedAt: string; outcome: string; supplyType: string | null; placeOfSupplyCode: string | null; totalTaxCents: number; legacyTaxCents: number | null; differenceCents: number | null; missingMappings: Array<{ productId: string | null; reason: string; detail: string }> | null; errorMessage: string | null }
interface Monitor { rows: Row[]; last30Days: Record<string, number>; taxFromEngineCents: number; taxFromExistingEngineCents: number; netDifferenceCents: number }

const OUTCOMES = [["all", "All outcomes"], ["DIFFERS", "Different from today"], ["MISSING_MAPPING", "Not classified"], ["ERROR", "Errors"], ["MATCHED", "Same as today"]] as const;
const MODES = [["all", "Shadow and enforced"], ["SHADOW", "Shadow only"], ["ENFORCE", "Enforced only"]] as const;

/**
 * What the engine has worked out, order by order. In shadow mode each row is a
 * comparison — the tax it would have charged beside what the existing checkout
 * charged — which is how a wrong classification or rate shows up before anyone
 * pays for it.
 */
export function MonitoringPanel() {
  const [outcome, setOutcome] = useState("all");
  const [mode, setMode] = useState("all");
  const { data, error } = useGst<Monitor>(`/api/admin/gst/monitor?${new URLSearchParams({ ...(outcome !== "all" ? { outcome } : {}), ...(mode !== "all" ? { mode } : {}) })}`);

  if (error) return <Notice tone="bad">{error}</Notice>;
  if (!data) return <Hint>Loading…</Hint>;
  const c = data.last30Days;
  const total = Object.values(c).reduce((a, b) => a + b, 0);

  return (
    <div className={pageStyle}>
      <Section title="Last 30 days" hint="Tax the engine worked out against tax the existing checkout charged, over orders where both could be calculated.">
        <StatGrid>
          <Stat label="Calculations" value={total} />
          <Stat label="Same as today" value={c.MATCHED ?? 0} tone="good" />
          <Stat label="Different" value={c.DIFFERS ?? 0} tone={c.DIFFERS ? "warn" : undefined} sub={`Net ${data.netDifferenceCents >= 0 ? "+" : "−"}${rupees(Math.abs(data.netDifferenceCents))}`} />
          <Stat label="Not classified / errors" value={(c.MISSING_MAPPING ?? 0) + (c.ERROR ?? 0)} tone={(c.MISSING_MAPPING ?? 0) + (c.ERROR ?? 0) ? "bad" : "good"} />
        </StatGrid>
        <Hint>Engine tax {rupees(data.taxFromEngineCents)} · existing checkout tax {rupees(data.taxFromExistingEngineCents)}.</Hint>
      </Section>

      <Section title="Calculations" actions={
        <div className={css({ display: "flex", gap: "2", flexWrap: "wrap" })}>
          <Select value={outcome} onValueChange={setOutcome}><SelectTrigger aria-label="Outcome" className={css({ width: "13rem" })}><SelectValue /></SelectTrigger><SelectContent>{OUTCOMES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          <Select value={mode} onValueChange={setMode}><SelectTrigger aria-label="Mode" className={css({ width: "11rem" })}><SelectValue /></SelectTrigger><SelectContent>{MODES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
        </div>
      }>
        {data.rows.length === 0 ? <Hint>No calculations match. They appear once the engine is in shadow or enforced mode and orders come in.</Hint> : (
          <>
            <div className={css({ display: { base: "none", md: "block" } }) + " " + scrollX}>
              <Table>
                <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Order</TableHead><TableHead>Outcome</TableHead><TableHead>Engine</TableHead><TableHead>Today</TableHead><TableHead>Difference</TableHead><TableHead>Why</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className={css({ fontSize: "sm" })}>{shortDate(r.calculatedAt)}<div className={css({ fontSize: "xs", color: "fg.muted" })}>{r.mode.toLowerCase()} · {r.channel === "STORE" ? "counter" : "online"}</div></TableCell>
                      <TableCell className={css({ fontSize: "sm" })}>{r.orderNumber ?? "—"}</TableCell>
                      <TableCell><StatusPill status={r.outcome} /></TableCell>
                      <TableCell>{r.outcome === "MATCHED" || r.outcome === "DIFFERS" ? rupees(r.totalTaxCents) : "—"}</TableCell>
                      <TableCell>{rupees(r.legacyTaxCents)}</TableCell>
                      <TableCell>{r.differenceCents === null ? "—" : `${r.differenceCents > 0 ? "+" : r.differenceCents < 0 ? "−" : ""}${rupees(Math.abs(r.differenceCents))}`}</TableCell>
                      <TableCell className={css({ fontSize: "xs", color: "fg.muted", maxWidth: "20rem" })}>{r.errorMessage ?? r.missingMappings?.[0]?.detail ?? (r.supplyType ? `${r.supplyType === "INTRA_STATE" ? "Intra-state" : "Inter-state"} (place of supply ${r.placeOfSupplyCode})` : "")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className={css({ display: { base: "flex", md: "none" }, flexDirection: "column", gap: "2" })}>
              {data.rows.map((r) => (
                <div key={r.id} className={css({ border: "1px solid", borderColor: "border.subtle", borderRadius: "lg", padding: "3", display: "flex", flexDirection: "column", gap: "1" })}>
                  <div className={css({ display: "flex", justifyContent: "space-between", gap: "2" })}><strong>{r.orderNumber ?? "—"}</strong><StatusPill status={r.outcome} /></div>
                  <span className={css({ fontSize: "xs", color: "fg.muted" })}>{shortDate(r.calculatedAt)} · {r.mode.toLowerCase()} · engine {rupees(r.totalTaxCents)} vs today {rupees(r.legacyTaxCents)}</span>
                  {(r.errorMessage || r.missingMappings?.[0]) && <span className={css({ fontSize: "xs" })}>{r.errorMessage ?? r.missingMappings?.[0]?.detail}</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
