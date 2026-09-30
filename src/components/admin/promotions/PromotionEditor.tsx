"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { css } from "styled-system/css";
import { classOf } from "@/modules/promotions/contracts";
import { headline, type NameLookup } from "@/modules/promotions/summarise";
import { templateById } from "@/modules/promotions/templates";
import type { PromotionStatus } from "@/modules/promotions/mapping";
import { BenefitEditor } from "./BenefitEditor";
import { cardBody, cardNumber } from "./editor.styles";
import { CodesPanel } from "./CodesPanel";
import { LimitsFields, MessageFields } from "./LimitsAndMessage";
import { PiecesChooser, SetsProvider } from "./PiecesChooser";
import type { CatalogOptions } from "./ProductPicker";
import type { SetOption } from "./SetPicker";
import { PromotionSummary, useDraftCheck } from "./PromotionSummary";
import { type Draft, type DraftPatch, toPayload } from "./promotion-draft";
import { BasicsFields, CombiningFields, ScheduleFields } from "./SettingsCards";
import { TestCartPanel, type TestPiece } from "./TestCartPanel";

interface Props {
  initial: Draft;
  promotionId?: string;
  status?: PromotionStatus;
  options: CatalogOptions;
  names: NameLookup;
  pieces: TestPiece[];
  sets: SetOption[];
}

const layout = css({ display: "grid", gridTemplateColumns: { base: "1fr", lg: "minmax(0,1fr) 22rem" }, gap: "6", alignItems: "start" });
const main = css({ display: "flex", flexDirection: "column", gap: "5", minWidth: 0 });
// Pinned beside the form on wide screens, and scrollable on its own so a long
// test cart never pushes its button out of reach.
const aside = css({
  display: "flex",
  flexDirection: "column",
  gap: "5",
  position: { lg: "sticky" },
  top: { lg: "4" },
  maxHeight: { lg: "calc(100vh - 6rem)" },
  overflowY: { lg: "auto" },
  paddingBottom: { lg: "2" },
});
const bar = css({ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "3" });
const spin = css({ width: "4", height: "4", animation: "spin" });

function Section({ n, title, children }: { n?: number; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={css({ fontSize: "md", display: "flex", alignItems: "center" })}>
          {n && <span className={cardNumber}>{n}</span>}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cardBody}>{children}</CardContent>
    </Card>
  );
}

const STATUS_WORD: Record<PromotionStatus, string> = {
  DRAFT: "Draft", SCHEDULED: "Scheduled", LIVE: "Live", PAUSED: "Paused", ENDED: "Ended", ARCHIVED: "Archived",
};

export function PromotionEditor({ initial, promotionId, status, options, names, pieces, sets }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [saving, setSaving] = useState<"save" | "activate" | null>(null);
  const set = (patch: DraftPatch) => setDraft((d) => ({ ...d, ...patch }));
  const check = useDraftCheck(draft, promotionId);
  const template = templateById(draft.template);
  const cls = classOf(draft.benefit);
  const isLive = status === "LIVE" || status === "SCHEDULED" || status === "PAUSED";

  const save = async (activate: boolean) => {
    setSaving(activate ? "activate" : "save");
    try {
      const res = await fetch(promotionId ? `/api/admin/promotions/${promotionId}` : "/api/admin/promotions", {
        method: promotionId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(draft)),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save the offer");
      const id: string = body.promotion.id;

      if (activate) {
        const act = await fetch(`/api/admin/promotions/${id}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "activate" }),
        });
        const actBody = await act.json();
        if (!act.ok) {
          toast.error(actBody.error ?? "Saved, but it could not be activated");
          router.push(`/admin/promotions/${id}`);
          return;
        }
        toast.success(actBody.status === "SCHEDULED" ? "Offer scheduled" : "Offer is live");
        router.push("/admin/promotions");
      } else {
        toast.success(promotionId ? "Changes saved" : "Saved as a draft");
        if (promotionId) router.refresh();
        else router.push(`/admin/promotions/${id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the offer");
    } finally {
      setSaving(null);
    }
  };

  const blocked = Boolean(check?.errors.length);
  return (
    <SetsProvider initialSets={sets} options={options}>
    <div className={css({ display: "flex", flexDirection: "column", gap: "5" })}>
      <div className={bar}>
        <div className={css({ display: "flex", alignItems: "center", gap: "3", minWidth: 0 })}>
          <Button asChild variant="ghost" size="icon" aria-label="Back to offers">
            <Link href="/admin/promotions"><ArrowLeft className={css({ width: "4", height: "4" })} /></Link>
          </Button>
          <div className={css({ minWidth: 0 })}>
            <h1 className={css({ fontFamily: "display", fontSize: { base: "xl", md: "2xl" }, fontWeight: "bold" })}>
              {draft.name || "New offer"}
            </h1>
            <p className={css({ fontSize: "sm", color: "fg.muted" })}>
              {template?.name ?? "Offer"} · {status ? STATUS_WORD[status] : "Not saved yet"}
            </p>
          </div>
        </div>
        <div className={css({ display: "flex", gap: "2" })}>
          <Button type="button" variant="outline" disabled={saving !== null} onClick={() => save(false)}>
            {saving === "save" && <Loader2 className={spin} />}
            {promotionId ? "Save changes" : "Save draft"}
          </Button>
          {!isLive && (
            <Button type="button" disabled={saving !== null || blocked} onClick={() => save(true)}>
              {saving === "activate" && <Loader2 className={spin} />}
              Save and activate
            </Button>
          )}
        </div>
      </div>
      {isLive && (
        <p className={css({ fontSize: "sm", borderRadius: "lg", background: "gold.50", border: "1px solid", borderColor: "gold.200", padding: "3", _dark: { background: "bg.surface", borderColor: "gold.700" } })}>
          This offer is running. Saved changes apply to new orders only; orders already placed keep their prices.
        </p>
      )}

      <div className={layout}>
        <div className={main}>
          <Section n={1} title="Offer"><BasicsFields draft={draft} set={set} /></Section>
          {draft.trigger === "CODE" && (
            <Section title="Unique codes (optional)">
              <CodesPanel promotionId={promotionId} />
            </Section>
          )}
          {cls !== "DELIVERY" && draft.benefit.type !== "bundle" && (
            <Section n={2} title={cls === "ORDER" ? "Which pieces count towards it" : "Which pieces"}>
              <PiecesChooser id="pieces" value={draft.pieces} onChange={(pieces) => set({ pieces })} />
              {check && (
                <p className={css({ fontSize: "sm", fontWeight: "medium", color: check.matchCount === 0 ? "danger" : "fg.default" })}>
                  {check.matchCount} piece{check.matchCount === 1 ? "" : "s"} included
                </p>
              )}
            </Section>
          )}
          <Section n={3} title="What the client gets">
            <BenefitEditor
              benefit={draft.benefit}
              onChange={(benefit) => set({ benefit })}
              maxApplications={draft.maxApplicationsPerOrder}
              onMaxApplications={(n) => set({ maxApplicationsPerOrder: n })}
            />
          </Section>
          <Section n={4} title="When"><ScheduleFields draft={draft} set={set} /></Section>
          <Section n={5} title="Who and how much"><LimitsFields draft={draft} set={set} isOrderOffer={cls !== "PIECE"} /></Section>
          <Section n={6} title="With other offers"><CombiningFields draft={draft} set={set} /></Section>
          <Section n={7} title="What the client sees"><MessageFields draft={draft} set={set} headline={headline(draft.benefit)} /></Section>
        </div>
        <aside className={aside}>
          <Section title="Summary"><PromotionSummary draft={draft} names={names} check={check} /></Section>
          <Section title="Test with a cart"><TestCartPanel draft={draft} pieces={pieces} selfId={promotionId} /></Section>
        </aside>
      </div>
    </div>
    </SetsProvider>
  );
}
