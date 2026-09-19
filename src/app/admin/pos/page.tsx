import Link from "next/link";
import { BarChart3, ShoppingBag } from "lucide-react";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { PosTerminal } from "@/components/admin/pos/PosTerminal";
import { prisma } from "@/lib/prisma";
import { isValidVpa } from "@/modules/payments/upi/upi-link";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "5" });
const iconStyle = css({ height: "4", width: "4" });

export const metadata = {
  title: "Store POS",
};

export default async function PosPage() {
  // Read once on the server; the QR is simply not offered until both are set,
  // because a wrong VPA sends a customer's money to a stranger.
  const settings = await prisma.siteSettings.findFirst({
    select: { upiVpa: true, upiPayeeName: true, businessName: true },
  });
  const upiPayee =
    settings?.upiVpa && isValidVpa(settings.upiVpa)
      ? { vpa: settings.upiVpa, name: settings.upiPayeeName || settings.businessName }
      : null;

  return (
    <div className={pageStyle}>
      <AdminPageHeader
        title="Store POS"
        subtitle="Sell at the counter. Stock and the invoice are handled together."
        actions={
          <>
            {/* The counter is where the shop is run from, so the day's
                numbers and the order history are reachable from here rather
                than only from the sidebar. */}
            <Button variant="outline" asChild>
              <Link href="/admin/sales-insights">
                <BarChart3 className={iconStyle} />
                Sales insights
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/orders?channel=STORE">
                <ShoppingBag className={iconStyle} />
                Counter sales
              </Link>
            </Button>
          </>
        }
      />
      <PosTerminal upiPayee={upiPayee} />
    </div>
  );
}
