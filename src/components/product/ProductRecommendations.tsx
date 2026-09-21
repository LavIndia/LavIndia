"use client";

import { useEffect, useState } from "react";
import { ProductRail } from "@/components/product/ProductRail";
import type { RecommendationRail } from "@/modules/catalog/client";
import { css } from "styled-system/css";

/**
 * The suggestion rails beneath a product — "People Also Buy", "You May Also
 * Like", and so on.
 *
 * One request returns every rail already titled and ordered by the catalog
 * module, so this component composes rather than decides: whatever rails
 * come back are drawn, in order, with the same rail component. Adding a
 * strategy on the server therefore needs no change here.
 *
 * It loads after the page rather than with it, because nothing above the
 * fold depends on it and a customer should never wait on suggestions to see
 * the piece they came for. Until they arrive, nothing is reserved on screen:
 * these rails sit below the fold, so growing into place costs no layout
 * shift where anyone is looking.
 */

const dividerStyle = css({
  borderTop: "1px solid",
  borderColor: "border.subtle",
  background: "linear-gradient(to bottom, {colors.ivory.50}, {colors.ivory.100})",
});
const railStyle = css({ paddingY: "10", md: { paddingY: "12" } });

export function ProductRecommendations({ productId }: { productId: string }) {
  const [rails, setRails] = useState<RecommendationRail[]>([]);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;

    fetch(`/api/products/${encodeURIComponent(productId)}/recommendations`)
      .then((response) => (response.ok ? response.json() : { rails: [] }))
      .then((result) => {
        if (!cancelled) setRails(result.rails ?? []);
      })
      // Suggestions are an extra, never a dependency: a failure leaves the
      // product page exactly as it was.
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (rails.length === 0) return null;

  return (
    <div className={dividerStyle}>
      {rails.map((rail) => (
        <ProductRail
          key={rail.strategy}
          title={rail.title}
          subtitle={rail.subtitle}
          products={rail.products}
          className={railStyle}
        />
      ))}
    </div>
  );
}
