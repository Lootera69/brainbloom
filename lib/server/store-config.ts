import { BillingError, type Store, type StoreEnvironment } from "@/lib/server/store-contract";

export interface BillingConfig {
  mode: "disabled" | "sandbox" | "production";
  testUids: Set<string>;
  google?: { packageName: string; credentials: { client_email: string; private_key: string }; audience?: string; pushEmail?: string; subscription?: string };
  apple?: { bundleId: string; appId: number; issuerId: string; keyId: string; privateKey: string };
}

export function billingConfig(env: Readonly<Record<string, string | undefined>> = process.env): BillingConfig {
  const mode = env.NATIVE_BILLING_MODE ?? "disabled";
  if (!["disabled", "sandbox", "production"].includes(mode)) throw new BillingError("billing-configuration", "Purchases are temporarily unavailable.", 503);
  const config: BillingConfig = { mode: mode as BillingConfig["mode"], testUids: new Set((env.NATIVE_BILLING_TEST_UIDS ?? "").split(",").map((uid) => uid.trim()).filter(Boolean)) };
  if (mode === "disabled") return config;
  if (env.GOOGLE_PLAY_PACKAGE_NAME && env.GOOGLE_PLAY_SERVICE_ACCOUNT) {
    try {
      const credentials = JSON.parse(env.GOOGLE_PLAY_SERVICE_ACCOUNT);
      if (typeof credentials.client_email !== "string" || typeof credentials.private_key !== "string" || !credentials.private_key.includes("PRIVATE KEY")) throw new Error();
      config.google = { packageName: env.GOOGLE_PLAY_PACKAGE_NAME, credentials: { client_email: credentials.client_email, private_key: credentials.private_key },
        audience: env.GOOGLE_PLAY_PUBSUB_AUDIENCE, pushEmail: env.GOOGLE_PLAY_PUBSUB_EMAIL, subscription: env.GOOGLE_PLAY_PUBSUB_SUBSCRIPTION };
    } catch { throw new BillingError("billing-configuration", "Purchases are temporarily unavailable.", 503); }
  }
  if (env.APP_STORE_BUNDLE_ID && env.APP_STORE_ISSUER_ID && env.APP_STORE_KEY_ID && env.APP_STORE_PRIVATE_KEY && env.APP_STORE_APP_ID) {
    const appId = Number(env.APP_STORE_APP_ID);
    if (!Number.isSafeInteger(appId) || appId <= 0) throw new BillingError("billing-configuration", "Purchases are temporarily unavailable.", 503);
    config.apple = { bundleId: env.APP_STORE_BUNDLE_ID, appId, issuerId: env.APP_STORE_ISSUER_ID, keyId: env.APP_STORE_KEY_ID, privateKey: env.APP_STORE_PRIVATE_KEY.replace(/\\n/g, "\n") };
  }
  return config;
}

export function requireBilling(config: BillingConfig, store: Store, uid?: string, environment?: StoreEnvironment) {
  if (config.mode === "disabled" || (store === "google-play" ? !config.google : !config.apple)) {
    throw new BillingError("billing-unavailable", "Purchases are not available yet. Please try again later.", 503);
  }
  if (uid && ((config.mode === "sandbox" || environment === "sandbox") && !config.testUids.has(uid))) {
    throw new BillingError("billing-test-only", "Test purchases are available only to invited testers.", 403);
  }
  if (config.mode === "sandbox" && environment === "production") {
    throw new BillingError("billing-test-only", "Use a store test account for this build.", 403);
  }
}
