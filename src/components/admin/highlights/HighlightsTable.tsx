"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, ImageIcon, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HighlightView } from "@/modules/marketing/client";
import { highlightMeta } from "@/components/home/highlights/highlight-display";
import { css } from "styled-system/css";

/**
 * The admin's list of highlights.
 *
 * Cards rather than a table, at every width. A highlight is a picture first,
 * and a row of text with a thumbnail in it tells an admin far less about
 * whether the band will look right than the picture itself does.
 */

const listStyle = css({ display: "grid", gap: "3", md: { gridTemplateColumns: "1fr 1fr" } });
const rowStyle = css({
  display: "flex",
  gap: "4",
  padding: "3",
  alignItems: "flex-start",
});
const thumbStyle = css({
  position: "relative",
  width: "5.5rem",
  height: "7rem",
  flexShrink: 0,
  borderRadius: "lg",
  overflow: "hidden",
  background: "bg.canvas",
});
const bodyStyle = css({ display: "flex", flexDirection: "column", gap: "1", minWidth: 0, flex: "1" });
const titleRowStyle = css({ display: "flex", alignItems: "center", gap: "2", flexWrap: "wrap" });
const titleStyle = css({ fontWeight: "medium", color: "fg.default" });
const metaStyle = css({ fontSize: "xs", color: "fg.muted" });
const descriptionStyle = css({ fontSize: "sm", color: "fg.muted", lineClamp: "2" });
const actionsStyle = css({ display: "flex", gap: "1", flexShrink: 0 });
const iconStyle = css({ width: "4", height: "4" });
const emptyStyle = css({
  padding: "12",
  textAlign: "center",
  color: "fg.muted",
  display: "flex",
  flexDirection: "column",
  gap: "3",
  alignItems: "center",
});

export function HighlightsTable({ highlights }: { highlights: HighlightView[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const remove = async (highlight: HighlightView) => {
    if (!confirm(`Delete "${highlight.title}"? This also removes its image.`)) return;

    setDeletingId(highlight.id);
    try {
      const response = await fetch(`/api/admin/highlights/${highlight.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error((await response.json()).error);
      toast.success("Highlight deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete highlight");
    } finally {
      setDeletingId(null);
    }
  };

  if (highlights.length === 0) {
    return (
      <Card className={emptyStyle}>
        <ImageIcon className={css({ width: "8", height: "8", color: "fg.subtle" })} />
        <p>
          No highlights yet. Add an expo stand, a pop-up counter, an award or a
          press mention and the band appears on the homepage.
        </p>
        <Button asChild>
          <Link href="/admin/highlights/new">Add the first highlight</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className={listStyle}>
      {highlights.map((highlight) => {
        const meta = highlightMeta(highlight);
        const isVideo = highlight.mediaType === "VIDEO";
        const still = isVideo ? highlight.posterUrl : highlight.mediaUrl;

        return (
          <Card key={highlight.id}>
            <div className={rowStyle}>
              <div className={thumbStyle}>
                {still ? (
                  <Image
                    src={still}
                    alt={highlight.title}
                    fill
                    sizes="88px"
                    className={css({ objectFit: "cover" })}
                  />
                ) : (
                  // A film with no poster frame has nothing to show here.
                  <span
                    className={css({
                      display: "flex",
                      width: "full",
                      height: "full",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "fg.subtle",
                    })}
                  >
                    <Film className={css({ width: "5", height: "5" })} />
                  </span>
                )}
              </div>

              <div className={bodyStyle}>
                <div className={titleRowStyle}>
                  <span className={titleStyle}>{highlight.title}</span>
                  {highlight.kind && <Badge variant="secondary">{highlight.kind}</Badge>}
                  {isVideo && <Badge variant="secondary">Film</Badge>}
                  <Badge variant={highlight.isActive ? "default" : "secondary"}>
                    {highlight.isActive ? "Visible" : "Hidden"}
                  </Badge>
                </div>
                {/* Each line is left out rather than shown empty. */}
                {meta && <p className={metaStyle}>{meta}</p>}
                {highlight.description && (
                  <p className={descriptionStyle}>{highlight.description}</p>
                )}
              </div>

              <div className={actionsStyle}>
                <Button variant="ghost" size="icon" asChild aria-label="Edit highlight">
                  <Link href={`/admin/highlights/${highlight.id}`}>
                    <Pencil className={iconStyle} />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(highlight)}
                  disabled={deletingId === highlight.id}
                  aria-label="Delete highlight"
                >
                  <Trash2 className={css({ width: "4", height: "4", color: "danger" })} />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
