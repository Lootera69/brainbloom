import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { getAdminApp } from "@/lib/push-send";
import { privateJson } from "@/lib/server/staff-auth";
import { playerDatabase } from "@/lib/server/player-database";
import { billingConfig } from "@/lib/server/store-config";
import { BillingError, billingKey, knownProduct, validAccountToken } from "@/lib/server/store-contract";
import { fulfillPurchase, purchaseOwner } from "@/lib/server/store-billing";
import { StoreVerifier } from "@/lib/server/store-verification";
import { billingFailure, notificationJson } from "@/lib/server/store-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = z.object({ signedPayload: z.string().min(1).max(60000) }).strict().parse(await notificationJson(request));
    const config = billingConfig();
    const verifier = new StoreVerifier(config);
    const { notification, transaction, environment } = await verifier.appleNotification(body.signedPayload);
    if (notification.notificationType === "TEST" || notification.notificationType === "CONSUMPTION_REQUEST") return privateJson({ ok: true });
    if (!transaction || !knownProduct(transaction.productId) || !transaction.transactionId || !validAccountToken(transaction.appAccountToken)) return privateJson({ ok: true });
    if (!notification.notificationUUID) throw new BillingError("invalid-notification", "Invalid notification.", 400);
    const app = getAdminApp();
    if (!app) throw new BillingError("billing-unavailable", "Notifications are unavailable.", 503);
    const db = getFirestore(app);
    const marker = db.doc(`storeNotifications/${billingKey("app-store", notification.notificationUUID)}`);
    if ((await marker.get()).exists) return privateJson({ ok: true });
    const database = playerDatabase(db, app.options.projectId!);
    const uid = await purchaseOwner(database, transaction.appAccountToken);
    if (!uid) return privateJson({ ok: true });
    const purchase = await verifier.verify({ store: "app-store", productId: transaction.productId, token: transaction.transactionId, environment });
    await fulfillPurchase(database, config, uid, purchase);
    await marker.set({ store: "app-store", receivedAt: Date.now() });
    return privateJson({ ok: true });
  } catch (error) {
    if (error instanceof BillingError && ["account-deleting", "billing-test-only"].includes(error.code)) return privateJson({ ok: true });
    if (error instanceof z.ZodError) return privateJson({ ok: false, error: "Invalid notification." }, 400);
    return billingFailure(error);
  }
}
