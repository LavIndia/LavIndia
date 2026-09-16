import { css } from "styled-system/css";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface EngagementRow {
  productId: string;
  name: string;
  views: number;
  avgViewSeconds: number;
  addsToCart: number;
  conversionRate: number;
}

export function ProductEngagement({ products }: { products: EngagementRow[] }) {
  return (
    <Card className={css({ overflow: "hidden", borderRadius: "xl" })}>
      <CardHeader>
        <CardTitle>Product Engagement</CardTitle>
        <CardDescription>
          Real shopper behavior — page views, time spent looking, and how
          often a view turns into an add-to-cart
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={css({ overflowX: "auto" })}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Avg. Time Viewing</TableHead>
                <TableHead>Added to Cart</TableHead>
                <TableHead className={css({ textAlign: "right" })}>
                  View → Cart Rate
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className={css({ textAlign: "center", paddingBlock: "8", color: "fg.muted" })}
                  >
                    No engagement data yet — this fills in as shoppers view product pages
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell className={css({ fontWeight: "medium" })}>{p.name}</TableCell>
                    <TableCell>{p.views}</TableCell>
                    <TableCell>{p.avgViewSeconds}s</TableCell>
                    <TableCell>{p.addsToCart}</TableCell>
                    <TableCell className={css({ textAlign: "right" })}>
                      <Badge variant={p.conversionRate >= 20 ? "default" : "secondary"}>
                        {p.conversionRate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
