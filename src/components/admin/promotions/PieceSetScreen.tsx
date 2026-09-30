"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { css } from "styled-system/css";
import { PieceSetEditor, type PieceSetDraft } from "./PieceSetEditor";
import type { CatalogOptions } from "./ProductPicker";

/** The full-page home of one Piece Set. */
export function PieceSetScreen({
  initial,
  options,
  usedByLive,
  usedByAny,
}: {
  initial: PieceSetDraft;
  options: CatalogOptions;
  usedByLive: string[];
  usedByAny: number;
}) {
  const router = useRouter();

  const remove = async () => {
    const res = await fetch(`/api/admin/piece-sets/${initial.id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.error ?? "Could not delete the set");
      return;
    }
    toast.success("Set deleted");
    router.push("/admin/promotions/sets");
  };

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "5", maxWidth: "4xl" })}>
      <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "3" })}>
        <div className={css({ display: "flex", alignItems: "center", gap: "3" })}>
          <Button asChild variant="ghost" size="icon" aria-label="Back to piece sets">
            <Link href="/admin/promotions/sets">
              <ArrowLeft className={css({ width: "4", height: "4" })} />
            </Link>
          </Button>
          <h1 className={css({ fontFamily: "display", fontSize: { base: "xl", md: "2xl" }, fontWeight: "bold" })}>
            {initial.id ? initial.name : "New set of pieces"}
          </h1>
        </div>
        {initial.id && usedByAny === 0 && (
          <Button type="button" variant="outline" onClick={remove}>
            Delete set
          </Button>
        )}
      </div>
      <Card>
        <CardContent className={css({ paddingTop: "6" })}>
          <PieceSetEditor
            initial={initial}
            options={options}
            usedByLive={usedByLive}
            onSaved={() => {
              router.push("/admin/promotions/sets");
              router.refresh();
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
