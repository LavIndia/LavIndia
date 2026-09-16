import Image from "next/image";
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

interface Product {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
  /** Optional thumbnail — rendered only when present in the source data. */
  image?: string | null;
}

const thumbStyle = css({
  width: "10",
  height: "10",
  borderRadius: "md",
  objectFit: "cover",
  border: "1px solid",
  borderColor: "border.subtle",
  flexShrink: 0,
});

const thumbFallback = css({
  width: "10",
  height: "10",
  borderRadius: "md",
  background: "bg.surface",
  border: "1px solid",
  borderColor: "border.subtle",
  flexShrink: 0,
});

const productCell = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  fontWeight: "medium",
});

export function TopProducts({ products }: { products: Product[] }) {
  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toLocaleString("en-IN")}`;
  };

  return (
    <Card className={css({ overflow: "hidden", borderRadius: "xl" })}>
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
        <CardDescription>
          Best performing products by quantity sold
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={css({ overflowX: "auto" })}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Units Sold</TableHead>
                <TableHead className={css({ textAlign: "right" })}>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className={css({ textAlign: "center", paddingBlock: "8", color: "fg.muted" })}
                  >
                    No sales data available
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product, index) => (
                  <TableRow key={product.productId}>
                    <TableCell>
                      <Badge variant={index === 0 ? "default" : "outline"}>
                        #{index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className={productCell}>
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={40}
                            height={40}
                            className={thumbStyle}
                          />
                        ) : (
                          <div className={thumbFallback} aria-hidden />
                        )}
                        <span>{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{product.quantitySold}</Badge>
                    </TableCell>
                    <TableCell className={css({ textAlign: "right", fontWeight: "medium" })}>
                      {formatPrice(product.revenue)}
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
