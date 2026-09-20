import { listContentPages } from "@/modules/marketing";
import { ContentPagesTable } from "@/components/admin/content-pages/ContentPagesTable";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const headingStyle = css({
  fontFamily: "display",
  fontSize: "3xl",
  fontWeight: "bold",
  letterSpacing: "tight",
  color: "fg.default",
});

export default async function ContentPagesPage() {
  const pages = await listContentPages();

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <div>
        <h1 className={headingStyle}>Page Content</h1>
        <p className={css({ color: "fg.muted", marginTop: "2" })}>
          The written pages customers read — the story, the FAQ and the
          policies. Each one ships with a draft; edit it here and your version
          replaces it everywhere immediately.
        </p>
      </div>
      <ContentPagesTable pages={pages} />
    </div>
  );
}
