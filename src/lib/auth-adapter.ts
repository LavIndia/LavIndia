/**
 * The Auth.js database adapter, adjusted to this project's User table.
 *
 * The stock Prisma adapter creates a user from what Google sends: name, email
 * and a profile `image`. Here a user also needs a unique `username` (the
 * password signup asks the client to choose one), and the picture lives in
 * `profilePicture`. Without this a first-time Google sign-in failed with
 * "Argument `username` is missing", so only people who already had an account
 * could use Google.
 */
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";

/** Letters, numbers and underscores, 3–20 characters — the same rule as signup. */
function usernameBase(email: string | null | undefined, name: string | null | undefined): string {
  const source = (email?.split("@")[0] || name || "client").toLowerCase().replace(/[^a-z0-9_]/g, "");
  return (source.length >= 3 ? source : `${source}client`).slice(0, 14);
}

/** A free username: the base plus four digits, retried on the rare clash. */
export async function uniqueUsername(email: string | null | undefined, name: string | null | undefined): Promise<string> {
  const base = usernameBase(email, name);
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    const taken = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${base}${Date.now().toString(36)}`.slice(0, 20);
}

export function lavIndiaAdapter(): Adapter {
  // Cast as before: the adapter package carries its own copy of the Auth.js types.
  return {
    ...PrismaAdapter(prisma),
    async createUser({ id: _id, image, name, email, emailVerified }) {
      void _id;
      return prisma.user.create({
        data: {
          name,
          email,
          emailVerified,
          profilePicture: image ?? null,
          username: await uniqueUsername(email, name),
        },
      }) as never;
    },
  } as Adapter;
}
