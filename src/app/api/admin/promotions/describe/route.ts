/**
 * "Describe your offer": words in, an editor draft out. Nothing is saved —
 * the admin checks the draft in the editor and saves it themselves.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { DescribeError, describeOffer, isDescribeConfigured } from "@/modules/promotions/describe/describe-offer";

// Claude may think for a while on a long description.
export const maxDuration = 120;

const schema = z.object({ text: z.string().trim().min(8, "Describe the offer in a sentence or two").max(2000) });

export const POST = apiHandler(async (req: NextRequest) => {
  await requireAdmin("catalog:write");
  if (!isDescribeConfigured()) {
    return NextResponse.json({ error: "Describing offers isn't switched on yet.", code: "NOT_CONFIGURED" }, { status: 503 });
  }
  const { text } = schema.parse(await req.json());
  try {
    return NextResponse.json(await describeOffer(text));
  } catch (error) {
    if (error instanceof DescribeError) return NextResponse.json({ error: error.message, code: "DESCRIBE_FAILED" }, { status: 422 });
    throw error;
  }
});
