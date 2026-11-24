/**
 * Security checks on the GST API.
 *
 *     npx tsx scripts/verify-gst-security.ts [baseUrl]     (default http://localhost:8002)
 *
 * 1. Static: every GST admin route handler is gated by gstActor(...) and
 *    every write handler asks for a write or approve capability.
 * 2. Live, with no session: every GST admin route and the customer invoice
 *    route answer 401 or 403 to every method, and never 200.
 * Needs the dev server running for part 2; part 2 is skipped (and said so)
 * when it is not reachable. It sends no credentials and changes nothing.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { check, results } from "./verify-helpers";

const base = process.argv[2] ?? "http://localhost:8002";
const root = join(__dirname, "..", "src", "app", "api", "admin", "gst");

function routes(dir: string, prefix = ""): Array<{ file: string; url: string }> {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return routes(full, `${prefix}/${name}`);
    return name === "route.ts" ? [{ file: full, url: `/api/admin/gst${prefix}` }] : [];
  });
}

async function main() {
  const found = routes(root);
  check("GST admin routes were found", found.length >= 14, true);

  for (const { file, url } of found) {
    const source = readFileSync(file, "utf8");
    const handlers = [...source.matchAll(/export const (GET|POST|PUT|PATCH|DELETE)\s*=\s*apiHandler/g)].map((m) => m[1]);
    check(`${url}: has handlers`, handlers.length > 0, true);
    for (const method of handlers) {
      const body = source.slice(source.indexOf(`export const ${method}`)).split(/\nexport const /)[0];
      check(`${method} ${url}: gated by gstActor`, /gstActor\("gst:(read|write|approve)"\)/.test(body), true);
      if (method !== "GET") check(`${method} ${url}: not satisfied by read access alone`, !/gstActor\("gst:read"\)/.test(body) || /gstActor\("gst:(write|approve)"\)/.test(body), true);
    }
  }

  let up = true;
  try { await fetch(base, { method: "HEAD", signal: AbortSignal.timeout(5000) }); } catch { up = false; }
  if (!up) {
    console.log(`\n(live checks skipped: ${base} is not reachable)`);
    done();
    return;
  }

  const targets = [...found.map((f) => f.url.replace("[orderId]", "someorder").replace("[id]", "someid")), "/api/user/orders/someorder/gst-invoice"];
  for (const url of targets) {
    for (const method of ["GET", "POST", "PUT", "DELETE"]) {
      const response = await fetch(base + url, { method, headers: { "Content-Type": "application/json" }, body: method === "GET" ? undefined : "{}", redirect: "manual" });
      check(`no session: ${method} ${url} is refused`, [401, 403, 405].includes(response.status), true);
    }
  }
  done();
}

function done() {
  const { passed, failed } = results();
  console.log(`
${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exit(1); });
