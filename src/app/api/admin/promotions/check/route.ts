/**
 * The editor's live check: plain-English summary, errors, warnings and how
 * many pieces match — without saving anything.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { checkPromotion, promotionInputSchema } from "@/modules/promotions";

const schema = z.object({ input: z.unknown(), selfId: z.string().optional() });

export const POST = apiHandler(async (req: NextRequest) => {
  await requireAdmin("catalog:write");
  const body = schema.parse(await req.json());
  const parsed = promotionInputSchema.safeParse(body.input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({
      errors: [issue ? issue.message : "Some settings are incomplete"],
      warnings: [],
      matchCount: 0,
      noCostCount: 0,
    });
  }
  return NextResponse.json(await checkPromotion(parsed.data, body.selfId));
});
