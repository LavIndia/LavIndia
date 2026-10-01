/**
 * Sends the settings form to the API.
 *
 * The logo is left out: it saves itself through LogoSection, and the copy the
 * form holds was taken when the page loaded — sending it would put the old
 * mark back over one just uploaded or chosen. A blank email goes as null
 * ("none"). Throws with the server's own wording when a field is refused.
 */
export async function saveSettings(settings: { logoUrl?: unknown; email?: string | null }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { logoUrl, ...fields } = settings;
  const response = await fetch("/api/admin/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...fields, email: fields.email?.trim() || null }),
  });
  if (response.ok) return;

  const result = (await response.json().catch(() => null)) as { error?: string } | null;
  throw new Error(result?.error || "Failed to update settings");
}
