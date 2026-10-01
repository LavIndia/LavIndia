import { CustomersTable } from "@/components/admin/customers/CustomersTable";
import { CustomersHeader } from "@/components/admin/customers/CustomersHeader";
import { CustomersFilters } from "@/components/admin/customers/CustomersFilters";
import { getCustomerPage } from "@/modules/customers/customer-list";
import { customersQuery, parseCustomerFilters } from "@/modules/customers/customer-filters";
import { loadTierThresholds } from "@/modules/customers/tier-settings";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; tier?: string }>;
}) {
  const params = await searchParams;
  const requested = parseInt(params.page || "1", 10) || 1;
  const filters = parseCustomerFilters(params);
  const thresholds = await loadTierThresholds();
  const { customers, ...pagination } = await getCustomerPage(requested, filters, thresholds);

  return (
    <div className={pageStyle}>
      <CustomersHeader exportQuery={customersQuery(filters)} />
      {/* Keyed on the applied filters so the bar resets when they change by
          navigation (back, a shared link) rather than holding stale text. */}
      <CustomersFilters key={customersQuery(filters)} initial={filters} thresholds={thresholds} />
      <CustomersTable
        customers={customers}
        pagination={pagination}
        filters={filters}
        thresholds={thresholds}
      />
    </div>
  );
}
