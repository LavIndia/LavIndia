import Link from "next/link";
import { Plus } from "lucide-react";
import { listHighlights } from "@/modules/marketing";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { HighlightsTable } from "@/components/admin/highlights/HighlightsTable";
import { Button } from "@/components/ui/button";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HighlightsPage() {
  const highlights = await listHighlights();

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <AdminPageHeader
        title="Highlights"
        subtitle="Expos, pop-ups, awards and press — shown on the homepage"
        actions={
          <Button size="sm" asChild>
            <Link href="/admin/highlights/new">
              <Plus className={css({ height: "4", width: "4" })} />
              <span className={css({ display: { base: "none", sm: "inline" } })}>
                Add Highlight
              </span>
            </Link>
          </Button>
        }
      />
      <HighlightsTable highlights={highlights} />
    </div>
  );
}
