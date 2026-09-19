/**
 * Authorisation guard for admin API routes.
 *
 * One place decides what "may perform this action" means, so a new inventory,
 * POS or billing route cannot accidentally ship without a check. It returns
 * the acting user rather than just a boolean, because every mutation in those
 * domains has to record who did it.
 */
import { auth } from "@/lib/auth";

export interface AdminActor {
  id: string;
  name: string | null;
  role: "ADMIN" | "CUSTOMER";
}

/**
 * The capabilities admin screens check against.
 *
 * Today every one of these is granted by the single ADMIN role — the app has
 * no finer-grained roles yet and inventing them now would be complexity
 * without a user. They are named individually so that when
 * INVENTORY_MANAGER, SALES_OPERATOR and BILLING_OPERATOR do arrive, the call
 * sites already say what they need and only this file changes.
 */
export type Capability =
  | "inventory:read"
  | "inventory:write"
  | "pos:sell"
  | "pos:override-price"
  | "billing:issue"
  | "billing:void"
  | "catalog:write";

export class UnauthorizedError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "UnauthorizedError";
    this.status = status;
  }
}

/**
 * Resolves the acting admin or throws. Route handlers call this first and let
 * their shared error translation turn a failure into 401/403.
 */
export async function requireAdmin(_capability?: Capability): Promise<AdminActor> {
  const session = await auth();

  if (!session?.user) {
    throw new UnauthorizedError("You need to sign in", 401);
  }
  if (session.user.role !== "ADMIN") {
    throw new UnauthorizedError("You do not have access to this", 403);
  }

  return {
    id: session.user.id,
    name: session.user.name ?? null,
    role: session.user.role,
  };
}
