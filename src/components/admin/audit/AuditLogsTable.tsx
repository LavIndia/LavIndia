import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { css } from "styled-system/css";

interface AuditLog {
  id: string;
  adminId: string;
  adminName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date;
}

const tableWrapStyle = css({
  overflow: "hidden",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  boxShadow: "card",
});

const emptyCellStyle = css({
  textAlign: "center",
  paddingBlock: "8",
  color: "fg.muted",
});

// Compliance/read-heavy screen: favor legibility over decoration —
// monospaced numeric timestamp, tabular-nums, high-contrast text, no
// row-hover tint that would compete with scanning a long list.
const timestampStyle = css({
  fontSize: "sm",
  fontFamily: "mono",
  fontVariantNumeric: "tabular-nums",
  color: "fg.default",
  whiteSpace: "nowrap",
});

const adminCellStyle = css({ fontWeight: "medium", color: "fg.default" });

const entityIdStyle = css({
  fontSize: "xs",
  fontFamily: "mono",
  color: "fg.muted",
});

const detailsStyle = css({
  fontSize: "xs",
  fontFamily: "mono",
  color: "fg.muted",
  maxWidth: "80",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export function AuditLogsTable({ logs }: { logs: AuditLog[] }) {
  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      CREATE: "default",
      UPDATE: "secondary",
      DELETE: "destructive",
    };

    return <Badge variant={variants[action] || "outline"}>{action}</Badge>;
  };

  return (
    <div className={tableWrapStyle}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date &amp; Time</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Entity ID</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className={emptyCellStyle}>
                No audit logs found
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className={timestampStyle}>
                  {new Date(log.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })}
                </TableCell>
                <TableCell className={adminCellStyle}>
                  {log.adminName || log.adminId}
                </TableCell>
                <TableCell>{getActionBadge(log.action)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{log.entity}</Badge>
                </TableCell>
                <TableCell className={entityIdStyle}>
                  {log.entityId ? `${log.entityId.substring(0, 8)}...` : "—"}
                </TableCell>
                <TableCell className={detailsStyle} title={JSON.stringify(log.metadata)}>
                  {JSON.stringify(log.metadata)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
