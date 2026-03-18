export type StripeEvent = {
  id: string;
  type: string;
  created: number;
  data?: {
    object?: Record<string, unknown>;
  };
};

type EnvLike = {
  STRIPE_WEBHOOK_SECRET?: string;
};

export async function parseStripeEvent(
  request: Request,
  rawBody: string,
  env: EnvLike,
): Promise<StripeEvent> {
  const signature = request.headers.get("stripe-signature");

  if (env.STRIPE_WEBHOOK_SECRET) {
    if (!signature) {
      throw new Error("Missing stripe-signature header");
    }

    const valid = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    if (!valid) {
      throw new Error("Invalid Stripe signature");
    }
  }

  return JSON.parse(rawBody) as StripeEvent;
}

async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const fields = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=", 2);
      return [key, value];
    }),
  );

  const timestamp = fields.t;
  const expected = fields.v1;
  if (!timestamp || !expected) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const actual = [...new Uint8Array(signatureBuffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

  return timingSafeEqual(actual, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}
