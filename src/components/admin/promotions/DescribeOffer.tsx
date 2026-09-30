"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { css } from "styled-system/css";
import { DESCRIBED_OFFER_KEY } from "./promotion-draft";

const EXAMPLES = [
  "Any 3 earrings for ₹999 this weekend, online and in store",
  "Pieces above ₹2,000: buy 4, get the cheapest free",
  "Earrings between ₹200 and ₹400, or black necklaces under ₹600 — 20% off till Sunday",
  "Code WELCOME10 for 10% off a first order over ₹1,500",
];

const box = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "gold.200",
  background: "gold.50",
  padding: { base: "4", md: "5" },
  _dark: { background: "bg.surface", borderColor: "gold.700" },
});
const example = css({
  fontSize: "sm",
  textAlign: "left",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  paddingInline: "3",
  paddingBlock: "1",
  cursor: "pointer",
  color: "fg.default",
  _hover: { borderColor: "accent.default" },
  _disabled: { opacity: 0.5, cursor: "not-allowed" },
});

/**
 * "Describe your offer": the admin writes the offer in their own words and
 * the editor opens filled in, with notes on anything to check. Nothing is
 * saved until they save it there.
 */
export function DescribeOffer({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (text.trim().length < 8 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/promotions/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't read that offer");
      try {
        sessionStorage.setItem(DESCRIBED_OFFER_KEY, JSON.stringify(body));
      } catch {
        throw new Error("This browser blocked the draft from being passed to the editor. Allow site data and try again.");
      }
      router.push("/admin/promotions/new?described=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that offer");
      setBusy(false);
    }
  };

  return (
    <section className={box} aria-labelledby="describe-heading">
      <div>
        <h2 id="describe-heading" className={css({ display: "flex", alignItems: "center", gap: "2", fontSize: "md", fontWeight: "semibold" })}>
          <Sparkles className={css({ width: "4", height: "4", color: "gold.600" })} aria-hidden />
          Describe your offer
        </h2>
        <p className={css({ fontSize: "sm", color: "fg.muted", lineHeight: "relaxed" })}>
          Write it the way you would tell a colleague. The offer opens filled in for you to check — nothing is saved until you save it.
        </p>
      </div>

      {configured ? (
        <>
          <Textarea
            aria-label="Describe your offer"
            rows={3}
            maxLength={2000}
            value={text}
            disabled={busy}
            placeholder="e.g. Any 3 earrings for ₹999 this weekend"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
          />
          <div className={css({ display: "flex", flexWrap: "wrap", gap: "2" })}>
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className={example} disabled={busy} onClick={() => setText(ex)}>
                {ex}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className={css({ fontSize: "sm", color: "danger" })}>
              {error}
            </p>
          )}
          <div className={css({ display: "flex", alignItems: "center", gap: "3", flexWrap: "wrap" })}>
            <Button type="button" onClick={submit} disabled={busy || text.trim().length < 8}>
              {busy && <Loader2 className={css({ width: "4", height: "4", animation: "spin" })} />}
              {busy ? "Reading your offer…" : "Fill in the offer"}
            </Button>
            {busy && <span className={css({ fontSize: "sm", color: "fg.muted" })}>This can take up to half a minute.</span>}
          </div>
        </>
      ) : (
        <p className={css({ fontSize: "sm", color: "fg.muted" })}>
          Not switched on yet. Your developer needs to add a Claude API key (ANTHROPIC_API_KEY) to the server settings. Until then, pick a kind of offer below.
        </p>
      )}
    </section>
  );
}
