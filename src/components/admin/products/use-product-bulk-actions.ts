import { useState } from "react";
import { toast } from "sonner";

/** PATCH one product; resolves to whether the server accepted it. */
async function patchProduct(id: string, body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * What the products list does to a whole selection at once, apart from
 * deleting (which has its own dialog because it needs a confirmation).
 */
export function useProductBulkActions(selected: ReadonlySet<string>, onDone: () => void) {
  const [working, setWorking] = useState(false);

  const run = async (
    body: Record<string, unknown>,
    messages: { ok: (count: number) => string; failed: (failed: number, total: number) => string },
  ) => {
    setWorking(true);
    try {
      const ids = Array.from(selected);
      const results = await Promise.all(ids.map((id) => patchProduct(id, body)));
      const failed = results.filter((ok) => !ok).length;
      if (failed > 0) toast.error(messages.failed(failed, ids.length));
      else toast.success(messages.ok(ids.length));
      onDone();
    } finally {
      setWorking(false);
    }
  };

  const plural = (count: number) => `${count} piece${count === 1 ? "" : "s"}`;

  return {
    working,
    /** Show on the website, or hide from it. Nothing else changes. */
    setPublished: (isPublished: boolean) =>
      run(
        { isPublished },
        {
          ok: (count) => `${plural(count)} ${isPublished ? "published" : "hidden from the website"}`,
          failed: (failed, total) => `${failed} of ${total} could not be updated`,
        },
      ),
    /** Never stock again: what is on the shelf keeps selling. */
    retire: () =>
      run(
        { retired: true },
        {
          ok: (count) => `${plural(count)} retired`,
          failed: (failed, total) => `${failed} of ${total} could not be retired`,
        },
      ),
  };
}
