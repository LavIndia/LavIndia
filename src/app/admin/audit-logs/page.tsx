import { prisma } from "@/lib/prisma";
import { AuditLogsTable } from "@/components/admin/audit/AuditLogsTable";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">
          Track all administrative actions and changes
        </p>
      </div>
      <AuditLogsTable logs={logs} />
    </div>
  );
}
