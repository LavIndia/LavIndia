import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/modules/inventory";

/**
 * Releases stock holds that have outlived their window.
 *
 * This endpoint exists because the sweeper it calls was written to be run on
 * a schedule and nothing was running it. An abandoned checkout takes a hold
 * on stock; without a sweep that hold is never released, so the last piece
 * in the shop quietly becomes unsellable and no screen explains why.
 *
 * Call it from a scheduler — a Vercel cron entry, or any external job:
 *
 *     curl -H "Authorization: Bearer $CRON_SECRET" \
 *          https://<host>/api/cron/release-expired-reservations
 *
 * Every few minutes is ample; the work is bounded by `limit` so a long
 * backlog is cleared over several runs rather than in one enormous
 * transaction.
 */

// Never cached: a sweep that returns a stored result has done nothing.
export const dynamic = "force-dynamic";

/** Bounded per run, so one invocation cannot hold the database for minutes. */
const DEFAULT_LIMIT = 200;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  // Refuse rather than run unprotected. An open endpoint that mutates stock
  // is worse than one that is switched off, and failing loudly here is what
  // stops it being deployed without the secret by accident.
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured", code: "NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const offered = request.headers.get("authorization");
  if (offered !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : DEFAULT_LIMIT;

  const released = await inventoryService.releaseExpiredReservations(limit);

  // Reported rather than silent: a sweep that releases nothing and a sweep
  // that never ran look identical in a log otherwise.
  return NextResponse.json({ released, limit, sweptAt: new Date().toISOString() });
}
