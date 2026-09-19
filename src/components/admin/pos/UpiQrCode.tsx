"use client";

import { useMemo } from "react";
import qrcode from "qrcode-generator";
import { css } from "styled-system/css";
import { buildUpiLink, type UpiPayee } from "@/modules/payments/upi/upi-link";
import { formatPaisa } from "@/modules/_shared/money";

const wrapStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2",
});
const qrFrameStyle = css({
  padding: "3",
  background: "#fff",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  lineHeight: 0,
});
const payeeStyle = css({ fontSize: "xs", color: "fg.muted", textAlign: "center" });
const amountStyle = css({
  fontFamily: "display",
  fontSize: "lg",
  fontWeight: "semibold",
  fontVariantNumeric: "tabular-nums",
});
const missingStyle = css({
  padding: "4",
  borderRadius: "md",
  border: "1px dashed",
  borderColor: "border.subtle",
  fontSize: "xs",
  color: "fg.muted",
  textAlign: "center",
  lineHeight: "relaxed",
});

/**
 * The UPI payment QR.
 *
 * Error correction level M is deliberate: a counter bill is read off a screen
 * or freshly printed paper, so the extra redundancy of level Q or H would
 * only make the code denser and harder for an older phone camera to resolve.
 *
 * Rendered as SVG so it stays sharp both on screen and when the bill prints.
 */
export function UpiQrCode({
  payee,
  amountCents,
  note,
  reference,
  sizePx = 180,
}: {
  payee: UpiPayee | null;
  amountCents: number;
  note: string;
  reference?: string;
  sizePx?: number;
}) {
  const link = useMemo(() => {
    if (!payee?.vpa || !payee.name) return null;
    try {
      return buildUpiLink({ payee, amountCents, note, reference });
    } catch {
      // A malformed VPA must not take the whole bill down — the cashier can
      // still take cash while someone fixes the setting.
      return null;
    }
  }, [payee, amountCents, note, reference]);

  const svg = useMemo(() => {
    if (!link) return null;
    const qr = qrcode(0, "M");
    qr.addData(link);
    qr.make();
    // Margin 0 here; the frame around it provides the quiet zone.
    return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }, [link]);

  if (!svg) {
    return (
      <p className={missingStyle}>
        No UPI ID set yet. Add it under Settings › Payments to show a scannable
        QR here.
      </p>
    );
  }

  return (
    <div className={wrapStyle}>
      <div
        className={qrFrameStyle}
        style={{ width: sizePx, height: sizePx }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <span className={amountStyle}>{formatPaisa(amountCents)}</span>
      {/* Printed beside the code so a customer whose camera will not focus can
          still pay by typing the ID. */}
      <span className={payeeStyle}>
        {payee!.name}
        <br />
        {payee!.vpa}
      </span>
    </div>
  );
}
