import { Badge } from "@/components/ui/badge";
import type { StockStatus } from "@/modules/inventory";

/**
 * How a stock line reads at a glance. Restrained on purpose — a full row of
 * coloured chips turns a stock table into noise, so only the states that
 * need an owner's attention carry weight.
 */
const PRESENTATION: Record<StockStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  IN_STOCK: { label: "In stock", variant: "outline" },
  LOW_STOCK: { label: "Low stock", variant: "secondary" },
  OUT_OF_STOCK: { label: "Out of stock", variant: "destructive" },
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const { label, variant } = PRESENTATION[status];
  return <Badge variant={variant}>{label}</Badge>;
}
