/**
 * Shared by the GST admin routes.
 *
 * Every route here starts with requireAdmin and a named capability, so a new
 * route cannot ship without saying who may use it. Reading is `gst:read`;
 * changing is `gst:write`; the decisions that answer to an accountant —
 * approving a classification or a rate, turning the engine on — are
 * `gst:approve`. Today all three are the single ADMIN role.
 */
import { requireAdmin, type AdminActor } from "@/lib/require-admin";

export type GstCapability = "gst:read" | "gst:write" | "gst:approve";

export async function gstActor(capability: GstCapability): Promise<{ admin: AdminActor; actor: { id: string; name: string | null } }> {
  const admin = await requireAdmin(capability);
  return { admin, actor: { id: admin.id, name: admin.name } };
}
