"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImageUp, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * The shop's own mark.
 *
 * Offered as a choice between the marks drawn for LavIndia and anything the
 * owner uploads, because a brand usually already has a logo and being made
 * to pick from a list would be worse than useless. The house marks are there
 * so a shop that has not commissioned one is not left with a placeholder.
 */

const bodyStyle = css({ display: "flex", flexDirection: "column", gap: "4" });
const currentStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "4",
  padding: "4",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.glass",
});
const previewStyle = css({
  height: "16",
  width: "16",
  objectFit: "contain",
  flexShrink: 0,
});
const currentTextStyle = css({ display: "flex", flexDirection: "column", gap: "0.5" });
const labelStyle = css({ fontSize: "sm", fontWeight: "medium", color: "fg.default" });
const noteStyle = css({ fontSize: "xs", color: "fg.muted", lineHeight: "1.5" });
const choiceGridStyle = css({
  display: "grid",
  gap: "3",
  gridTemplateColumns: { base: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" },
});
const choiceStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2",
  padding: "4",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  cursor: "pointer",
  transition: "border-color 0.15s ease, transform 0.15s ease",
  _hover: { borderColor: "accent.default", transform: "translateY(-1px)" },
});
const choiceActiveStyle = css({
  borderColor: "accent.default",
  boxShadow: "0 0 0 2px token(colors.gold.200)",
});
const choiceNameStyle = css({
  fontSize: "xs",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "fg.muted",
});
const actionsStyle = css({ display: "flex", flexWrap: "wrap", gap: "2" });
const hiddenStyle = css({ display: "none" });
const iconStyle = css({ height: "4", width: "4" });

/** The marks drawn for LavIndia, kept in the brand's own folder. */
const HOUSE_MARKS = [
  { name: "Lotus", path: "/logos/lavindia-lotus.svg" },
  { name: "Brilliant", path: "/logos/lavindia-brilliant.svg" },
  { name: "Monogram", path: "/logos/lavindia-monogram.svg" },
];

const DEFAULT_MARK = "/logo-mark.svg";

export function LogoSection({ initialLogoUrl }: { initialLogoUrl: string | null }) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const choose = async (path: string | null) => {
    setBusy(true);
    const res = await fetch("/api/admin/settings/logo", {
      method: path === null ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: path === null ? undefined : JSON.stringify({ logoUrl: path }),
    });
    setBusy(false);

    if (!res.ok) {
      toast.error("The logo could not be changed");
      return;
    }
    setLogoUrl(path);
    toast.success(path ? "Logo updated" : "Back to the default mark");
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);

    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/admin/settings/logo", { method: "POST", body });
    setBusy(false);

    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      toast.error(detail?.error ?? "The logo could not be uploaded");
      return;
    }

    const { logoUrl: saved } = await res.json();
    setLogoUrl(saved);
    toast.success("Logo updated");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo</CardTitle>
        <CardDescription>
          The mark shown in the header, on bills and beside the shop name.
        </CardDescription>
      </CardHeader>
      <CardContent className={bodyStyle}>
        <div className={currentStyle}>
          <Image
            src={logoUrl || DEFAULT_MARK}
            alt=""
            width={64}
            height={64}
            className={previewStyle}
            unoptimized
          />
          <span className={currentTextStyle}>
            <span className={labelStyle}>
              {logoUrl ? "Your logo" : "The default mark"}
            </span>
            <span className={noteStyle}>
              An SVG stays sharp at every size, from a barcode label to a shop sign.
              PNG, WebP and JPEG also work. Up to 2MB.
            </span>
          </span>
        </div>

        <div className={choiceGridStyle}>
          {HOUSE_MARKS.map((mark) => (
            <button
              key={mark.path}
              type="button"
              disabled={busy}
              onClick={() => choose(mark.path)}
              className={`${choiceStyle} ${logoUrl === mark.path ? choiceActiveStyle : ""}`}
            >
              <Image src={mark.path} alt="" width={48} height={48} unoptimized />
              <span className={choiceNameStyle}>{mark.name}</span>
            </button>
          ))}
        </div>

        <div className={actionsStyle}>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? (
              <Loader2 className={css({ height: "4", width: "4", animation: "spin 1s linear infinite" })} />
            ) : (
              <ImageUp className={iconStyle} />
            )}
            Upload your own
          </Button>

          {/* Offered only when there is something to undo. */}
          {logoUrl && (
            <Button type="button" variant="outline" disabled={busy} onClick={() => choose(null)}>
              <RotateCcw className={iconStyle} />
              Use the default
            </Button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/svg+xml,image/png,image/webp,image/jpeg"
            className={hiddenStyle}
            onChange={(event) => {
              void upload(event.target.files?.[0]);
              // Cleared so choosing the same file twice still fires a change.
              event.target.value = "";
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
