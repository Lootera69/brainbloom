import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { getAdminApp } from "@/lib/push-send";
import { privateJson } from "@/lib/server/staff-auth";
import { playerDatabase } from "@/lib/server/player-database";
import { billingConfig, requireBilling } from "@/lib/server/store-config";
import { BillingError, billingKey } from "@/lib/server/store-contract";
import { fulfillPurchase, purchaseOwner } from "@/lib/server/store-billing";
import { StoreVerifier } from "@/lib/server/store-verification";
import { authenticatePlayPush, billingFailure, notificationJson } from "@/lib/server/store-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const envelopeSchema = z.object({ subscription: z.string(), message: z.object({ messageId: z.string().min(1).max(200), data: z.string().min(1).max(60000) }) });
const token = z.string().min(1).max(8192);
const eventSchema = z.object({ packageName: z.string(), testNotification: z.unknown().optional(),
  subscriptionNotification: z.object({ purchaseToken: token }).optional(),
  oneTimeProductNotification: z.object({ purchaseToken: token }).optional(),
  voidedPurchaseNotification: z.object({ purchaseToken: token, orderId: z.string(), productType: z.number(), refundType: z.number() }).optional() });

export async function POST(request: Request) {
  try {
    const config = billingConfig();
    requireBilling(config, "google-play");
    await authenticatePlayPush(request, config);
    const envelope = envelopeSchema.parse(await notificationJson(request));
    if (envelope.subscription !== config.google!.subscription) throw new BillingError("invalid-notification", "Unexpected subscription.", 403);
    const event = eventSchema.parse(JSON.parse(Buffer.from(envelope.message.data, "base64").toString("utf8")));
    if (event.packageName !== config.google!.packageName) throw new BillingError("invalid-notification", "Unexpected app.", 403);
    if (event.testNotification) return privateJson({ ok: true });
    const input = event.subscriptionNotification ?? event.oneTimeProductNotification ?? event.voidedPurchaseNotification;
    if (!input) return privateJson({ ok: true });
    const app = getAdminApp();
    if (!app) throw new BillingError("billing-unavailable", "Notifications are unavailable.", 503);
    const db = getFirestore(app);
    const marker = db.doc(`storeNotifications/${billingKey("google-play", envelope.message.messageId)}`);
    if ((await marker.get()).exists) return privateJson({ ok: true });
    const database = playerDatabase(db, app.options.projectId!);
    const verifier = new StoreVerifier(config);
    const purchase = await verifier.googleNotificationPurchase(input.purchaseToken, !!event.subscriptionNotification || event.voidedPurchaseNotification?.productType === 1);
    const uid = await purchaseOwner(database, purchase.accountToken);
    if (!uid) return privateJson({ ok: true });
    const voided = event.voidedPurchaseNotification;
    if (voided && voided.orderId === purchase.transactionId) {
      if (voided.refundType === 1) { purchase.active = false; purchase.remainingQuantity = 0; purchase.refunded = true; }
      else if (voided.refundType === 2 && purchase.remainingQuantity === purchase.quantity) throw new BillingError("refund-pending", "Refund status is updating.", 503);
    } else if (voided?.refundType === 1 && purchase.subscription) {
      purchase.relatedRefund = { transactionId: voided.orderId, refunded: true };
    }
    await fulfillPurchase(database, config, uid, purchase);
    await verifier.finalize(purchase);
    await marker.set({ store: "google-play", receivedAt: Date.now() });
    return privateJson({ ok: true });
  } catch (error) {
    if (error instanceof BillingError && ["account-deleting", "purchase-pending", "billing-test-only"].includes(error.code)) return privateJson({ ok: true });
    if (error instanceof z.ZodError || error instanceof SyntaxError) return privateJson({ ok: false, error: "Invalid notification." }, 400);
    return billingFailure(error);
  }
}
