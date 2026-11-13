"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { css } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";

const wrapStyle = css({ display: "flex", flexDirection: "column", alignItems: "center", gap: "2" });
const frameStyle = css({
  padding: "3",
  background: "#fff",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  lineHeight: 0,
});
const amountStyle = css({ fontFamily: "display", fontSize: "lg", fontWeight: "semibold", fontVariantNumeric: "tabular-nums" });
const noteStyle = css({ fontSize: "xs", color: "fg.muted", textAlign: "center", lineHeight: "relaxed" });
const waitingStyle = css({ display: "flex", alignItems: "center", gap: "2", fontSize: "sm", color: "fg.muted" });
const paidStyle = css({ display: "flex", alignItems: "center", gap: "2", fontSize: "sm", fontWeight: "semibold", color: "green.700" });
const iconStyle = css({ height: "4", width: "4" });

const POLL_MS = 3000;

type Stage = "CREATING" | "WAITING" | "PAID" | "UNAVAILABLE";

/**
 * A UPI QR the gateway watches.
 *
 * It is created for exactly this bill, and the screen asks the server every
 * few seconds whether it was paid. When it is, the sale can be recorded with
 * the payer and bank reference taken from the gateway — nobody types them and
 * nobody has to take the customer's word for it.
 *
 * If a gateway QR cannot be made (no credentials, QR not enabled on the
 * account, no network) the plain UPI QR passed as `fallback` is shown instead
 * and the cashier confirms by hand, exactly as before. The shop can always
 * trade.
 */
export function PosRazorpayQr({
  amountCents,
  reference,
  fallback,
  onPaid,
  onAutomatic,
}: {
  amountCents: number;
  reference: string;
  fallback: ReactNode;
  /** The gateway has the money. */
  onPaid: (qrId: string) => void;
  /** Tells the bill whether it can rely on automatic confirmation. */
  onAutomatic: (automatic: boolean) => void;
}) {
  const [stage, setStage] = useState<Stage>("CREATING");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const callbacks = useRef({ onPaid, onAutomatic });
  callbacks.current = { onPaid, onAutomatic };

  useEffect(() => {
    let cancelled = false;
    let qrId: string | null = null;
    let paid = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function start() {
      try {
        const response = await fetch("/api/admin/pos/qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountCents, reference }),
        });
        if (!response.ok) throw new Error("unavailable");
        const { qr } = (await response.json()) as { qr: { qrId: string; imageUrl: string } };
        qrId = qr.qrId;
        if (cancelled) return;
        setImageUrl(qr.imageUrl);
        setStage("WAITING");
        callbacks.current.onAutomatic(true);

        timer = setInterval(async () => {
          try {
            const poll = await fetch(`/api/admin/pos/qr/${qr.qrId}`, { cache: "no-store" });
            if (!poll.ok) return;
            const { status } = (await poll.json()) as { status: { state: string } };
            if (status.state === "PAID" && !paid && !cancelled) {
              paid = true;
              clearInterval(timer);
              setStage("PAID");
              callbacks.current.onPaid(qr.qrId);
            }
          } catch {
            // A missed poll is harmless; the next one asks again.
          }
        }, POLL_MS);
      } catch {
        if (cancelled) return;
        setStage("UNAVAILABLE");
        callbacks.current.onAutomatic(false);
      }
    }
    void start();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      // Backing out of the bill (or changing method) must stop the code
      // working, unless it was already paid.
      if (qrId && !paid) void fetch(`/api/admin/pos/qr/${qrId}`, { method: "DELETE" }).catch(() => undefined);
    };
  }, [amountCents, reference]);

  if (stage === "UNAVAILABLE") {
    return (
      <div className={wrapStyle}>
        {fallback}
        <span className={noteStyle}>Automatic confirmation is not available right now. Confirm by hand below.</span>
      </div>
    );
  }

  if (stage === "CREATING" || !imageUrl) {
    return (
      <div className={waitingStyle}>
        <Loader2 className={css({ height: "4", width: "4", animation: "spin 1s linear infinite" })} />
        Preparing the QR…
      </div>
    );
  }

  return (
    <div className={wrapStyle}>
      <div className={frameStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={`UPI QR for ${formatPaisa(amountCents)}`} width={180} height={180} />
      </div>
      <span className={amountStyle}>{formatPaisa(amountCents)}</span>
      {stage === "PAID" ? (
        <span className={paidStyle}>
          <CheckCircle2 className={iconStyle} /> Payment received
        </span>
      ) : (
        <span className={waitingStyle}>
          <Loader2 className={css({ height: "4", width: "4", animation: "spin 1s linear infinite" })} />
          Waiting for the customer to pay…
        </span>
      )}
    </div>
  );
}
