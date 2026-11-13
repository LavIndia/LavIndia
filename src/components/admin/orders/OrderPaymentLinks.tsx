"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Link2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { formatOrderDate, formatRupees } from "./OrderBadges";
import type { OrderRow } from "./order-types";

interface PaymentLinkRow {
  id: string;
  kind: "LINK" | "QR";
  url: string;
  amountCents: number;
  status: "CREATED" | "PAID" | "EXPIRED" | "CANCELLED";
  expiresAt: string | null;
  sentTo: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<PaymentLinkRow["status"], string> = {
  CREATED: "Waiting for payment",
  PAID: "Paid",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

const boxStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  padding: "4",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
});
const titleStyle = css({ fontFamily: "display", fontSize: "md", fontWeight: "semibold", color: "fg.default" });
const mutedStyle = css({ fontSize: "sm", color: "fg.muted" });
const actionsStyle = css({ display: "flex", gap: "2", flexWrap: "wrap" });
const iconStyle = css({ height: "4", width: "4" });
const urlStyle = css({ fontSize: "sm", color: "fg.default", overflowWrap: "anywhere" });
const qrStyle = css({ width: "full", maxWidth: "15rem", alignSelf: "center", borderRadius: "md" });
const rowStyle = css({ display: "flex", justifyContent: "space-between", gap: "3", fontSize: "sm", color: "fg.muted" });

/** A payment link is only meaningful for an online order still waiting to be paid. */
export function canCollectPayment(order: OrderRow): boolean {
  return order.source === "ONLINE" && order.status === "PENDING" && order.paymentStatus === "PENDING";
}

function whatsappHref(mobile: string | null, orderNumber: string, url: string): string {
  const digits = (mobile ?? "").replace(/\D/g, "");
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const text = encodeURIComponent(`Your payment link for order ${orderNumber}: ${url}`);
  return `https://wa.me/${phone}?text=${text}`;
}

/**
 * Collect payment for an online order that is still unpaid: send the client a
 * payment link, or show a UPI QR when they are in the shop. Paying is picked up
 * by the gateway's confirmation — the order moves on by itself.
 */
export function OrderPaymentLinks({ order }: { order: OrderRow }) {
  const [links, setLinks] = useState<PaymentLinkRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const base = `/api/admin/orders/${order.id}/payment-links`;

  const load = useCallback(async () => {
    const response = await fetch(base);
    if (response.ok) setLinks(((await response.json()) as { links: PaymentLinkRow[] }).links);
  }, [base]);

  useEffect(() => {
    setLinks(null);
    void load();
  }, [load]);

  const open = links?.find((link) => link.status === "CREATED");
  const waiting = !!open;

  // While something is out for payment, look for the answer every few seconds
  // so a QR shown at the counter turns "paid" without anyone refreshing.
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(async () => {
      const response = await fetch(base);
      if (!response.ok) return;
      const next = ((await response.json()) as { links: PaymentLinkRow[] }).links;
      setLinks(next);
      if (next.some((link) => link.status === "PAID")) {
        toast.success("Payment received");
        router.refresh();
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [waiting, base, router]);

  async function create(kind: "LINK" | "QR") {
    setBusy(true);
    try {
      const response = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not create it");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create it");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(link: PaymentLinkRow) {
    const response = await fetch(`${base}/${link.id}`, { method: "DELETE" });
    if (!response.ok) toast.error(((await response.json()) as { error?: string }).error ?? "Could not cancel it");
    await load();
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy — select the link and copy it by hand");
    }
  }

  const past = (links ?? []).filter((link) => link !== open);

  return (
    <div className={boxStyle}>
      <span className={titleStyle}>Collect payment</span>
      <span className={mutedStyle}>
        Send a link to pay on their phone, or show a UPI QR if they are in the shop. The order moves on by itself once
        the payment arrives.
      </span>

      {open?.kind === "LINK" && (
        <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
          <span className={urlStyle}>{open.url}</span>
          <span className={mutedStyle}>
            {formatRupees(open.amountCents)}
            {open.expiresAt && ` · valid until ${formatOrderDate(open.expiresAt)}`}
          </span>
          <div className={actionsStyle}>
            <Button size="sm" variant="outline" onClick={() => copy(open.url)}>
              <Copy className={iconStyle} /> Copy
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={whatsappHref(order.customerMobile, order.orderNumber, open.url)} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => cancel(open)}>
              Cancel link
            </Button>
          </div>
        </div>
      )}

      {open?.kind === "QR" && (
        <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open.url} alt={`UPI QR for ${formatRupees(open.amountCents)}`} className={qrStyle} />
          <span className={mutedStyle}>
            {formatRupees(open.amountCents)} · single use
            {open.expiresAt && ` · valid until ${formatOrderDate(open.expiresAt)}`}
          </span>
          <Button size="sm" variant="ghost" onClick={() => cancel(open)}>
            Cancel QR
          </Button>
        </div>
      )}

      {!open && (
        <div className={actionsStyle}>
          <Button size="sm" disabled={busy} onClick={() => create("LINK")}>
            <Link2 className={iconStyle} /> Send payment link
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => create("QR")}>
            <QrCode className={iconStyle} /> Show UPI QR
          </Button>
        </div>
      )}

      {past.length > 0 && (
        <div className={css({ display: "flex", flexDirection: "column", gap: "1" })}>
          {past.map((link) => (
            <div key={link.id} className={rowStyle}>
              <span>
                {link.kind === "LINK" ? "Link" : "QR"} · {formatOrderDate(link.createdAt)}
              </span>
              <span>{STATUS_LABEL[link.status]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
