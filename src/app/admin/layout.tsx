import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import { css } from "styled-system/css";

const shellStyle = css({
  display: "flex",
  height: "100vh",
  overflow: "hidden",
  background: "bg.canvas",
});

const contentColStyle = css({
  display: "flex",
  flex: "1",
  flexDirection: "column",
  overflow: "hidden",
});

const mainStyle = css({
  flex: "1",
  overflowY: "auto",
  padding: { base: "4", sm: "6", lg: "8" },
});

const mainInnerStyle = css({
  marginInline: "auto",
  width: "full",
  maxWidth: "1600px",
});

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className={shellStyle}>
      <AdminSidebar />
      <div className={contentColStyle}>
        <AdminTopbar user={session.user} />
        <main className={mainStyle}>
          <div className={mainInnerStyle}>{children}</div>
        </main>
      </div>
      <AdminCommandPalette />
    </div>
  );
}
