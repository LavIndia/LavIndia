import Link from "next/link";
import { Plus } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { describeRule } from "@/components/admin/promotions/set-words";
import { loadCatalogFacts, loadSetLibrarySource, pieceRuleSchema, setUsage } from "@/modules/promotions";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";

const row = css({
  display: "flex",
  flexDirection: { base: "column", md: "row" },
  justifyContent: "space-between",
  gap: "2",
  padding: "4",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  textDecoration: "none",
  color: "fg.default",
  _last: { borderBottom: "none" },
  _hover: { background: "bg.canvas" },
});

export default async function PieceSetsPage() {
  const [source, usage, facts] = await Promise.all([loadSetLibrarySource(), setUsage(), loadCatalogFacts()]);
  const sets = source.stored.filter((s) => !s.archivedAt);

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <div
        className={css({
          display: "flex",
          flexDirection: { base: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { sm: "flex-end" },
          gap: "4",
        })}
      >
        <div>
          <h1 className={css({ fontFamily: "display", fontSize: { base: "2xl", md: "3xl" }, fontWeight: "bold" })}>
            Piece sets
          </h1>
          <p className={css({ fontSize: "sm", color: "fg.muted", maxWidth: "60ch" })}>
            Named groups of pieces, such as Festive earrings or Necklaces under ₹600, that any offer
            can use. Every category and collection already works as a set.
          </p>
        </div>
        <div className={css({ display: "flex", gap: "2" })}>
          <Button asChild variant="outline">
            <Link href="/admin/promotions">Offers</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/promotions/sets/new">
              <Plus className={css({ width: "4", height: "4" })} /> New set
            </Link>
          </Button>
        </div>
      </div>

      <div className={css({ borderRadius: "xl", border: "1px solid", borderColor: "border.subtle", background: "bg.surface" })}>
        {sets.length === 0 ? (
          <p className={css({ padding: "8", textAlign: "center", color: "fg.muted", fontSize: "sm" })}>
            No sets yet. Create one here, or from inside an offer with New set of pieces.
          </p>
        ) : (
          sets.map((s) => {
            const rules = z.array(pieceRuleSchema).safeParse(s.rules);
            const words = rules.success ? rules.data.map((r) => describeRule(r, facts.names)) : [];
            const users = usage.get(s.id) ?? [];
            return (
              <Link key={s.id} href={`/admin/promotions/sets/${s.id}`} className={row}>
                <div className={css({ display: "flex", flexDirection: "column", gap: "1", minWidth: 0 })}>
                  <span className={css({ fontWeight: "semibold" })}>{s.name}</span>
                  <span className={css({ fontSize: "sm", color: "fg.muted" })}>
                    {words.join(s.match === "ANY" ? " · or " : " · ") || "Only the pieces chosen by name"}
                    {s.includeProductIds.length > 0 && ` · plus ${s.includeProductIds.length} chosen`}
                    {s.excludeProductIds.length > 0 && ` · minus ${s.excludeProductIds.length}`}
                  </span>
                </div>
                <span
                  className={css({
                    fontSize: "sm",
                    color: users.some((u) => u.live) ? "success" : "fg.muted",
                    whiteSpace: "nowrap",
                  })}
                >
                  {users.length === 0 ? "Not used yet" : `Used by ${users.length} offer${users.length === 1 ? "" : "s"}`}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
