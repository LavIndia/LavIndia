import { HelpIndex } from "@/components/admin/help/HelpIndex";
import { css } from "styled-system/css";

export default function AdminHelpPage() {
  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6", maxWidth: "4xl" })}>
      <div>
        <h1 className={css({ fontFamily: "display", fontSize: { base: "2xl", md: "3xl" }, fontWeight: "bold" })}>
          Help
        </h1>
        <p className={css({ fontSize: "sm", color: "fg.muted", maxWidth: "60ch" })}>
          What each page of the admin is for and how to use it. On any page, the ? at the top opens
          the help for that page.
        </p>
      </div>
      <HelpIndex />
    </div>
  );
}
