// KNOWN LIMITATION (tracked intentionally, not a silent stub): this project
// has no SMS/email OTP delivery provider wired up yet (e.g. MSG91, Twilio,
// AWS SNS). OTP codes are generated and stored here exactly like a real
// implementation would, but they are only ever written to the server log —
// never actually delivered to the user's phone/email. The OTP login flow is
// therefore fully wired end-to-end but will not work for a real user until a
// provider is integrated in `requestOtp`'s TODO below. This is deliberate,
// per product decision, so the UI/flow can be reviewed now.
//
// This in-memory store is single-process only (fine for the current single
// dev/staging instance) — replace with a DB-backed or Redis-backed store
// before running multiple server instances.

type OtpRecord = {
  code: string;
  expiresAt: number;
  attempts: number;
};

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const store = new Map<string, OtpRecord>();

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function requestOtp(identifier: string) {
  const code = generateCode();
  store.set(identifier, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });

  // TODO(sms-provider): send `code` via SMS/email provider instead of
  // logging it. Until then, OTP login cannot succeed for real users.
  console.warn(
    `[otp] Generated OTP for ${identifier} but no SMS/email provider is configured — code was NOT delivered.`
  );

  return { expiresInSeconds: OTP_TTL_MS / 1000 };
}

export function verifyOtp(identifier: string, code: string) {
  const record = store.get(identifier);
  if (!record) return { ok: false as const, reason: "not_requested" as const };
  if (record.expiresAt < Date.now()) {
    store.delete(identifier);
    return { ok: false as const, reason: "expired" as const };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    store.delete(identifier);
    return { ok: false as const, reason: "too_many_attempts" as const };
  }
  record.attempts += 1;
  if (record.code !== code) {
    return { ok: false as const, reason: "invalid" as const };
  }
  store.delete(identifier);
  return { ok: true as const };
}
