import { css } from "styled-system/css";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { BarcodePrintStudio } from "@/components/admin/inventory/BarcodePrintStudio";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const noteStyle = css({ fontSize: "sm", color: "fg.muted", lineHeight: "relaxed" });

export const metadata = {
  title: "Barcodes",
};

export default function BarcodesPage() {
  return (
    <div className={pageStyle}>
      <AdminPageHeader
        title="Barcodes"
        subtitle="Print labels for anything in the catalog."
      />

      <BarcodePrintStudio />

      <p className={noteStyle}>
        {/* Stated plainly because misrepresenting these would be a real
            problem the moment stock left the shop. */}
        These are LavIndia&rsquo;s own Code 128 barcodes. They are not
        registered EAN or GTIN numbers, so they identify a piece inside our own
        systems and nowhere else. Every sellable option already has one — this
        screen only prints them.
      </p>
    </div>
  );
}
