"use client";

import { createContext, useContext, useState } from "react";
import type { PieceFilter } from "@/modules/promotions/contracts";
import { css } from "styled-system/css";
import { Switch } from "@/components/ui/switch";
import { ProductPicker, type CatalogOptions } from "./ProductPicker";
import { SetPicker, type SetOption } from "./SetPicker";

interface SetsContextValue {
  sets: SetOption[];
  addSet: (set: SetOption) => void;
  options: CatalogOptions;
}

const SetsContext = createContext<SetsContextValue | null>(null);

/** The Piece Sets and catalog choices every picker in one offer shares. */
export function SetsProvider({
  initialSets,
  options,
  children,
}: {
  initialSets: SetOption[];
  options: CatalogOptions;
  children: React.ReactNode;
}) {
  const [sets, setSets] = useState(initialSets);
  return (
    <SetsContext.Provider
      value={{ sets, options, addSet: (s) => setSets((list) => [s, ...list.filter((x) => x.id !== s.id)]) }}
    >
      {children}
    </SetsContext.Provider>
  );
}

export function useSets() {
  const value = useContext(SetsContext);
  if (!value) throw new Error("useSets needs a SetsProvider");
  return value;
}

/**
 * Chooses pieces for any part of an offer — what counts, what the client
 * gets, each part of a bundle — as Piece Sets. Choosing no set means every
 * piece where that is allowed.
 */
export function PiecesChooser({
  value,
  onChange,
  allowAll = true,
  id,
}: {
  value: PieceFilter;
  onChange: (next: PieceFilter) => void;
  allowAll?: boolean;
  id: string;
}) {
  const { sets, addSet, options } = useSets();
  const excluded = value.exclude.flatMap((s) => (s.type === "products" ? s.ids : []));
  const skipMarkedDown = value.exclude.some((s) => s.type === "markedDown");
  const exclusions = (ids: string[], markedDown: boolean): PieceFilter["exclude"] => [
    ...(ids.length ? [{ type: "products" as const, ids }] : []),
    ...(markedDown ? [{ type: "markedDown" as const }] : []),
  ];
  const named = value.include.flatMap((s) => (s.type === "products" ? s.ids : []));
  const include = (ids: string[]): PieceFilter["include"] => (ids.length ? [{ type: "products", ids }] : []);
  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      <SetPicker
        id={id}
        value={value.setIds ?? []}
        onChange={(setIds) => onChange({ ...value, setIds, include: setIds.length === 0 && named.length === 0 ? [] : include(named) })}
        otherChoices={named.length > 0}
        onEvery={() => onChange({ include: [], exclude: value.exclude, setIds: [] })}
        sets={sets}
        onSetCreated={addSet}
        options={options}
        allowAll={allowAll}
      />
      <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
        <span className={css({ fontSize: "xs", fontWeight: "semibold", letterSpacing: "0.06em", textTransform: "uppercase", color: "fg.muted" })}>
          Specific pieces
        </span>
        <ProductPicker
          id={`${id}-pick`}
          chosen={named}
          products={options.products}
          placeholder="Add a piece by name…"
          onChange={(ids) => onChange({ ...value, include: include(ids) })}
        />
      </div>
      <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
        <span className={css({ fontSize: "xs", fontWeight: "semibold", letterSpacing: "0.06em", textTransform: "uppercase", color: "fg.muted" })}>
          Except these pieces
        </span>
        <ProductPicker
          id={`${id}-except`}
          chosen={excluded}
          products={options.products}
          placeholder="Leave out a piece…"
          onChange={(ids) => onChange({ ...value, exclude: exclusions(ids, skipMarkedDown) })}
        />
      </div>
      <label className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "3", fontSize: "sm" })}>
        <span>
          Leave out pieces already marked down
          <span className={css({ display: "block", color: "fg.muted" })}>So a reduced piece is never reduced twice.</span>
        </span>
        <Switch
          id={`${id}-markdown`}
          checked={skipMarkedDown}
          onCheckedChange={(on) => onChange({ ...value, exclude: exclusions(excluded, on) })}
        />
      </label>
    </div>
  );
}
