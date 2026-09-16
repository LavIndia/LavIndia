import { prisma } from "@/lib/prisma";
import { AuditLogsTable } from "@/components/admin/audit/AuditLogsTable";
import { css } from "styled-system/css";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const titleStyle = css({
  fontFamily: "display",
  fontSize: { base: "2xl", sm: "3xl" },
  fontWeight: "semibold",
  letterSpacing: "tight",
  color: "fg.default",
});
const subtitleStyle = css({ marginTop: "2", fontSize: "sm", color: "fg.muted" });

async function getAuditLogs() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return logs;
}

export default async function AuditLogsPage() {
  const logs = await getAuditLogs();

  return (
    <div className={pageStyle}>
      <div>
        <h1 className={titleStyle}>Audit Logs</h1>
        <p className={subtitleStyle}>
          Track all administrative actions and changes
        </p>
      </div>
      <AuditLogsTable logs={logs} />
    </div>
  );
}
