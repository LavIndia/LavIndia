import { supplierService } from "@/modules/purchasing";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { SuppliersManager } from "@/components/admin/suppliers/SuppliersManager";
import { css } from "styled-system/css";

/**
 * Who the shop buys from.
 *
 * Sits under Inventory because that is where receiving happens, and a
 * supplier only exists in order to be chosen on a delivery.
 */

export const metadata = { title: "Suppliers" };

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "5" });

export default async function SuppliersPage() {
  // One query for both lists; retired suppliers are shown apart so they can
  // be reinstated.
  const all = await supplierService.list({ includeInactive: true });
  const suppliers = all.filter((s) => s.isActive);
  const retired = all.filter((s) => !s.isActive);

  return (
    <div className={pageStyle}>
      <AdminPageHeader
        title="Suppliers"
        subtitle="The workshops and wholesalers stock is bought from. Choose one when receiving a delivery and the spend is totalled in Accounting."
      />
      <SuppliersManager initial={suppliers} retired={retired} />
    </div>
  );
}
