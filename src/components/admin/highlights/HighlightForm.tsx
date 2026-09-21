"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MediaUploadField } from "@/components/admin/shared/MediaUploadField";
import { HIGHLIGHT_KINDS, type HighlightView } from "@/modules/marketing/client";
import { css } from "styled-system/css";

/**
 * Adding or editing one highlight.
 *
 * Only two things are actually required — a title and a picture — because a
 * highlight is a photograph with a caption, and everything else (where, when,
 * what kind, where it leads) is worth offering but never worth blocking on.
 *
 * The kind is a curated list with free text as the fallback, so twenty
 * highlights do not end up with twenty spellings of "exhibition".
 */

const columnStyle = css({ display: "flex", flexDirection: "column", gap: "6", paddingBottom: "24" });
const gridStyle = css({ display: "grid", gap: "6", lg: { gridTemplateColumns: "1.2fr 0.8fr" } });
const cardBodyStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "5",
  padding: "5",
  sm: { padding: "6" },
});
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const pairStyle = css({ display: "grid", gap: "4", sm: { gridTemplateColumns: "1fr 1fr" } });
const requiredMark = css({ color: "danger" });
const hintStyle = css({ fontSize: "xs", color: "fg.muted" });
const switchRowStyle = css({ display: "flex", alignItems: "center", gap: "3" });
const actionsStyle = css({ display: "flex", justifyContent: "flex-end", gap: "3" });
const backStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  fontSize: "sm",
  color: "fg.muted",
  "&:hover": { color: "fg.default" },
});

/** The date input wants YYYY-MM-DD; the service hands back an ISO string. */
function toDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function HighlightForm({ highlight }: { highlight?: HighlightView }) {
  const router = useRouter();
  const ids = useId();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    title: highlight?.title ?? "",
    description: highlight?.description ?? "",
    place: highlight?.place ?? "",
    happenedOn: toDateInput(highlight?.happenedOn ?? null),
    kind: highlight?.kind ?? "",
    mediaType: highlight?.mediaType ?? "IMAGE",
    mediaUrl: highlight?.mediaUrl ?? "",
    posterUrl: highlight?.posterUrl ?? "",
    linkUrl: highlight?.linkUrl ?? "",
    order: highlight?.order ?? 0,
    isActive: highlight?.isActive ?? true,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.mediaUrl) {
      toast.error("Choose an image for this highlight first");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        highlight ? `/api/admin/highlights/${highlight.id}` : "/api/admin/highlights",
        {
          method: highlight ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            description: form.description || null,
            place: form.place || null,
            happenedOn: form.happenedOn || null,
            kind: form.kind || null,
            posterUrl: form.posterUrl || null,
            linkUrl: form.linkUrl || null,
            order: Number(form.order) || 0,
          }),
        },
      );

      if (!response.ok) {
        throw new Error((await response.json()).error || "Failed to save highlight");
      }

      toast.success(highlight ? "Highlight updated" : "Highlight added");
      router.push("/admin/highlights");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save highlight");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={columnStyle}>
      <Link href="/admin/highlights" className={backStyle}>
        <ArrowLeft className={css({ width: "4", height: "4" })} />
        Back to highlights
      </Link>

      <form onSubmit={handleSubmit} className={gridStyle}>
        <Card>
          <CardHeader>
            <CardTitle>Media</CardTitle>
            <CardDescription>
              A photograph of the stand, the counter, the award or the page.
            </CardDescription>
          </CardHeader>
          <CardContent className={cardBodyStyle}>
            <MediaUploadField
              uploadUrl="/api/admin/highlights/upload"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              label="Image"
              required
              value={form.mediaUrl}
              onChange={(url) => set("mediaUrl", url)}
              // The upload says whether a film or a photograph arrived, so
              // the admin never has to restate what they just chose.
              onUploaded={(result) => {
                const kind = result.mediaType;
                if (kind === "VIDEO" || kind === "IMAGE") set("mediaType", kind);
              }}
              title={form.title}
              aspectRatio="4 / 5"
              maxWidth="22rem"
              hint="Shown as a portrait card, so a tall or square photograph works best. Film is accepted too; it plays when the card is opened."
            />

            {form.mediaType === "VIDEO" && (
              <MediaUploadField
                uploadUrl="/api/admin/highlights/upload"
                label="Poster frame"
                value={form.posterUrl}
                onChange={(url) => set("posterUrl", url)}
                title={`${form.title} poster`}
                aspectRatio="4 / 5"
                maxWidth="22rem"
                hint="The still shown on the card before the film is played. Optional."
              />
            )}
          </CardContent>
        </Card>

        <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>What this was, and where and when.</CardDescription>
            </CardHeader>
            <CardContent className={cardBodyStyle}>
              <div className={fieldStyle}>
                <Label htmlFor={`${ids}-title`}>
                  Title <span className={requiredMark}>*</span>
                </Label>
                <Input
                  id={`${ids}-title`}
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="IIJS Premiere 2026"
                  required
                />
              </div>

              <div className={fieldStyle}>
                <Label htmlFor={`${ids}-description`}>Description</Label>
                <Textarea
                  id={`${ids}-description`}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  placeholder="Two lines show on the card; the rest is read when it is opened."
                />
              </div>

              <div className={pairStyle}>
                <div className={fieldStyle}>
                  <Label htmlFor={`${ids}-place`}>Place</Label>
                  <Input
                    id={`${ids}-place`}
                    value={form.place}
                    onChange={(e) => set("place", e.target.value)}
                    placeholder="Bombay Exhibition Centre, Mumbai"
                  />
                </div>
                <div className={fieldStyle}>
                  <Label htmlFor={`${ids}-date`}>Date</Label>
                  <Input
                    id={`${ids}-date`}
                    type="date"
                    value={form.happenedOn}
                    onChange={(e) => set("happenedOn", e.target.value)}
                  />
                  <p className={hintStyle}>Only the month and year are shown.</p>
                </div>
              </div>

              <div className={pairStyle}>
                <div className={fieldStyle}>
                  <Label htmlFor={`${ids}-kind`}>Kind</Label>
                  <Input
                    id={`${ids}-kind`}
                    list={`${ids}-kinds`}
                    value={form.kind}
                    onChange={(e) => set("kind", e.target.value)}
                    placeholder="Expo"
                  />
                  <datalist id={`${ids}-kinds`}>
                    {HIGHLIGHT_KINDS.map((kind) => (
                      <option key={kind} value={kind} />
                    ))}
                  </datalist>
                  <p className={hintStyle}>The small tag on the card.</p>
                </div>
                <div className={fieldStyle}>
                  <Label htmlFor={`${ids}-order`}>Position</Label>
                  <Input
                    id={`${ids}-order`}
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={(e) => set("order", Number(e.target.value) || 0)}
                  />
                  <p className={hintStyle}>Lower numbers come first.</p>
                </div>
              </div>

              <div className={fieldStyle}>
                <Label htmlFor={`${ids}-link`}>Link</Label>
                <Input
                  id={`${ids}-link`}
                  value={form.linkUrl}
                  onChange={(e) => set("linkUrl", e.target.value)}
                  placeholder="https://… or /story"
                />
                <p className={hintStyle}>
                  Optional. Shown as &ldquo;Read more&rdquo; when the card is opened.
                </p>
              </div>

              <div className={switchRowStyle}>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => set("isActive", checked)}
                  aria-label="Show on the storefront"
                />
                <Label>Show on the storefront</Label>
              </div>
            </CardContent>
          </Card>

          <div className={actionsStyle}>
            <Button variant="outline" asChild>
              <Link href="/admin/highlights">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSaving || !form.title.trim() || !form.mediaUrl}>
              {isSaving ? "Saving..." : highlight ? "Save changes" : "Add highlight"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
