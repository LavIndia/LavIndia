import { CustomersTable } from "@/components/admin/customers/CustomersTable";
import { CustomersHeader } from "@/components/admin/customers/CustomersHeader";
import { getCustomerPage } from "@/modules/customers/customer-list";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const requested = parseInt(params.page || "1", 10) || 1;
  const { customers, ...pagination } = await getCustomerPage(requested);

  return (
    <div className={pageStyle}>
      <CustomersHeader />
      <CustomersTable customers={customers} pagination={pagination} />
    </div>
  );
}
