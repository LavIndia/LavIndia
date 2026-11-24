"use client";

import Link from "next/link";
import { css } from "styled-system/css";
import { Check as CheckIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGst, shortDate } from "./gst-client";
import { ModeControl, type Check } from "./ModeControl";
import { Notice, Section, Stat, StatGrid, StatusPill, Hint, pageStyle } from "./gst-ui";

interface Overview {
  mode: string;
  profile: { legalName: string | null; gstin: string | null; stateName: string | null; verificationStatus: string; verifiedBy: string | null; engineModeChangedAt: string | null; enforceApprovedBy: string | null } | null;
  config: { shippingTreatment: string; codTreatment: string; treatmentApprovedBy: string | null } | null;
  products: { total: number; info: Record<string, number>; verified: number; awaitingApproval: number; needInformation: number };
  shadow: Array<{ mode: string; outcome: string; count: number }>;
  rates: Record<string, number>;
  unverifiedNotifications: number;
  pendingCatalogItems: number;
  invoices: { enforcedOrders: number; withGstDetail: number; valueMismatches: number };
  checks: { SHADOW: Check[]; ENFORCE: Check[] };
}

const li = css({ display: "flex", gap: "2", alignItems: "flex-start", fontSize: "sm", paddingBlock: "1" });

export function GstOverview() {
  const { data, error, loading, reload } = useGst<Overview>("/api/admin/gst/overview");
  if (error) return <Notice tone="bad">{error}</Notice>;
  if (!data) return <Hint>{loading ? "Loading…" : ""}</Hint>;

  const shadowCount = (outcome: string) => data.shadow.filter((s) => s.mode === "SHADOW" && s.outcome === outcome).reduce((n, s) => n + s.count, 0);
  const shadowTotal = data.shadow.filter((s) => s.mode === "SHADOW").reduce((n, s) => n + s.count, 0);
  const undetailed = Math.max(0, data.invoices.enforcedOrders - data.invoices.withGstDetail);
  const enforceBlockers = data.checks.ENFORCE.filter((c) => c.blocking && !c.ok);

  return (
    <div className={pageStyle}>
      {data.mode === "OFF" && <Notice>The GST engine is <strong>OFF</strong>. Nothing on the shop has changed; this is the place to get it ready.</Notice>}
      {undetailed > 0 && <Notice tone="warn">{undetailed} enforced order(s) have an invoice without GST details. <Link href="/admin/gst/invoices" className={css({ textDecoration: "underline" })}>Repair them</Link>.</Notice>}
      {data.invoices.valueMismatches > 0 && <Notice tone="bad">{data.invoices.valueMismatches} GST invoice(s) show a different value from the invoice they belong to. Check them on the Invoices screen.</Notice>}

      <Section title="Engine" hint={data.profile?.engineModeChangedAt ? `Last changed ${shortDate(data.profile.engineModeChangedAt)}${data.profile.enforceApprovedBy ? ` · enforcement approved by ${data.profile.enforceApprovedBy}` : ""}` : "The engine has never been switched on."}>
        <ModeControl mode={data.mode} checks={data.checks} onChanged={reload} />
      </Section>

      <Section title={`Ready to enforce? ${enforceBlockers.length === 0 ? "Yes" : `${enforceBlockers.length} thing${enforceBlockers.length === 1 ? "" : "s"} to do`}`} hint="Every blocking item must be cleared before the engine can be enforced. The database refuses to enforce without a verified registration and an approver as well.">
        <ul>
          {data.checks.ENFORCE.map((c) => (
            <li key={c.id} className={li}>
              {c.ok ? <CheckIcon className={css({ height: "4", width: "4", color: "green.700", flexShrink: 0, marginTop: "0.5" })} /> : <X className={css({ height: "4", width: "4", color: c.blocking ? "red.600" : "fg.muted", flexShrink: 0, marginTop: "0.5" })} />}
              <span>
                {c.label}
                <span className={css({ display: "block", color: "fg.muted", fontSize: "xs" })}>{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Products" hint="Where each piece stands on classification. Nothing is taxed by the engine until its classification is verified.">
        <StatGrid>
          <Stat label="Products" value={data.products.total} />
          <Stat label="Verified" value={data.products.verified} tone={data.products.verified === data.products.total ? "good" : undefined} />
          <Stat label="Awaiting accountant" value={data.products.awaitingApproval} tone={data.products.awaitingApproval ? "warn" : undefined} />
          <Stat label="Need information" value={data.products.needInformation} tone={data.products.needInformation ? "warn" : "good"} sub={`${data.products.info.MISSING} with no details at all`} />
        </StatGrid>
        <Button variant="outline" asChild className={css({ alignSelf: "flex-start" })}>
          <Link href="/admin/gst/classification">Open classification</Link>
        </Button>
      </Section>

      <Section title="Rates and sources">
        <StatGrid>
          <Stat label="Approved rates" value={data.rates.APPROVED ?? 0} tone={(data.rates.APPROVED ?? 0) ? "good" : "warn"} />
          <Stat label="Draft rates" value={data.rates.DRAFT ?? 0} sub="Not used for any calculation" />
          <Stat label="Unverified notifications" value={data.unverifiedNotifications} tone={data.unverifiedNotifications ? "warn" : "good"} sub="A rate needs a verified notification to be approved" />
          <Stat label="Catalog items to import" value={data.pendingCatalogItems} sub="Seen on the live shop" />
        </StatGrid>
      </Section>

      <Section title="Shadow calculations, last 30 days" hint="What the engine would have charged, set against what the existing checkout did.">
        {shadowTotal === 0 ? (
          <Hint>No shadow calculations yet. They appear once the engine is in shadow mode and orders come in.</Hint>
        ) : (
          <StatGrid>
            <Stat label="Calculated" value={shadowTotal} />
            <Stat label="Same as today" value={shadowCount("MATCHED")} tone="good" />
            <Stat label="Different" value={shadowCount("DIFFERS")} tone={shadowCount("DIFFERS") ? "warn" : undefined} />
            <Stat label="Not classified / error" value={shadowCount("MISSING_MAPPING") + shadowCount("ERROR")} tone={shadowCount("MISSING_MAPPING") + shadowCount("ERROR") ? "bad" : "good"} />
          </StatGrid>
        )}
        <Button variant="outline" asChild className={css({ alignSelf: "flex-start" })}>
          <Link href="/admin/gst/monitoring">See the calculations</Link>
        </Button>
      </Section>

      <Section title="Registration">
        {data.profile?.gstin ? (
          <div className={css({ display: "flex", gap: "3", flexWrap: "wrap", alignItems: "center", fontSize: "sm" })}>
            <strong>{data.profile.legalName ?? "—"}</strong>
            <span>GSTIN {data.profile.gstin}</span>
            <span>{data.profile.stateName}</span>
            <StatusPill status={data.profile.verificationStatus} />
          </div>
        ) : (
          <Hint>No GSTIN has been entered. Nothing is assumed: the shop&apos;s state is read from the GSTIN once it is entered.</Hint>
        )}
        <Button variant="outline" asChild className={css({ alignSelf: "flex-start" })}>
          <Link href="/admin/gst/business">Open registration</Link>
        </Button>
      </Section>
    </div>
  );
}
