# Google Play and App Store purchases

The app uses Google Play Billing on Android and StoreKit 2 on iOS for digital purchases. The Flutter checkout, backend verification, delivery ledger, restore flow, and store notification endpoints are implemented. As confirmed on 9 October 2026, neither developer account has been created yet, and the app has not been published in either store. Real store purchases still need developer enrollment, product setup, server credentials, and sandbox testing.

Paid checkout remains **off by default**. The current free shop continues to use the existing server-confirmed simulated purchases. No merchant credentials have been added, no real charges have been enabled, and no store submission has been made.

## What you need to provide or configure

**First: create the developer accounts.** Register with [Google Play Console](https://play.google.com/console/signup) and enroll in the [Apple Developer Program](https://developer.apple.com/programs/enroll/). The account holder must choose the individual or organization account type and complete the required identity, enrollment payment, and business verification. These are separate from Firebase and ordinary Google/Apple sign-in accounts. Enrollment does not publish the app or turn on customer payments. Android setup can proceed first while Apple enrollment is pending.

Once the relevant account is active:

1. **Private app records.** Create the app in Play Console and App Store Connect if you have not already done so. Publishing is not required for this step. The Android application ID and iOS bundle ID currently used by the code are both `com.brainbloom.app`. Confirm the final public app name before creating listings; changing the package/bundle ID later is a separate migration. Share the console app links and Apple's numeric app ID after creating the records. Google may require the first signed App Bundle with the billing permission uploaded to an internal testing track before product setup becomes available; this does not publish a production release.
2. **Products and prices.** Create the seven products below in each store. Choose the selling currency, countries, and prices in the consoles. Studio's pricing fields do not change Google or Apple's prices. The paid app displays the localized price returned by the store.
3. **Payment agreements.** Complete Play's payments profile and Apple's Paid Apps Agreement, tax, and bank details using the account holder's own accounts. These cannot be supplied by the app code.
4. **Verification credentials.** Add the credentials listed below directly to Vercel's protected environment variables. Do not put private keys, service-account JSON, passwords, or bank details in chat, source control, or the Flutter app.
5. **Test accounts and devices.** Provide the Firebase UIDs of the registered app accounts that should test purchases, add the Google accounts as Play license testers, and create Apple sandbox testers. Install from Play's internal testing track and TestFlight or a properly signed iOS development build. iOS signing and a real iPhone/Mac test are still required.

## Product catalogue

Use these exact IDs on both platforms. Configure standard purchases without free trials, introductory offers, prepaid plans, installments, Family Sharing, or subscription offers for the initial rollout. Those require additional offer-specific presentation and testing.

| Product ID | Store type | Delivery |
|---|---|---|
| `gems_100` | Consumable / one-time product | 100 gems per purchased quantity |
| `gems_500` | Consumable / one-time product | 500 gems per purchased quantity |
| `gems_1200` | Consumable / one-time product | 1,200 gems per purchased quantity |
| `heart_refill` | Consumable / one-time product | Refill to 5 hearts |
| `streak_freeze_3` | Consumable / one-time product | 3 streak freezes per purchased quantity |
| `premium_monthly` | Auto-renewing subscription | Premium until the verified expiry |
| `premium_yearly` | Auto-renewing subscription | Premium until the verified expiry, plus 3 freezes once per paid annual transaction |

For Google, create one active auto-renewing base plan per subscription: one month for `premium_monthly` and one year for `premium_yearly`. Suggested base-plan IDs are `monthly` and `yearly`. Disable multi-quantity checkout initially even though the backend verifies quantities and partial refunds.

For each Google one-time product, use one standard, backward-compatible buy purchase option. Rental, preorder, discounted one-time offers, and multiple purchase options are outside this integration. The Flutter adapter currently exposes the standard one-time price, not offer selection. The Android dependency uses Google Play Billing Library 8.0.0.

For Apple, put monthly and yearly Premium in **one subscription group**, at the same service level, with their matching one-month and one-year durations. Register the other five products as consumables. Complete the required product localization, prices, and review metadata. The first in-app purchases normally accompany an app version for review.

The initial app purchase flow prevents buying another subscription while Premium is already active. In-app proration/plan-switch checkout and promotional offers are not part of this version. Store renewal, cancellation, refund, grace-period, and restore updates are handled.

## Google Play verification

Enable the Google Play Android Developer API for the server's Google Cloud project. Create a dedicated service account and grant that service account access to this app in Play Console, including viewing financial/order data and managing orders/subscriptions as required by the purchase, consume, and acknowledge APIs. Do not assume the existing Firebase Admin account already has Play Console access.

Configure these **server-only** variables:

| Variable | Value |
|---|---|
| `GOOGLE_PLAY_PACKAGE_NAME` | `com.brainbloom.app` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | Dedicated service-account JSON, including `client_email` and `private_key` |
| `GOOGLE_PLAY_PUBSUB_AUDIENCE` | `https://brainblooms.vercel.app/api/purchases/google-play` |
| `GOOGLE_PLAY_PUBSUB_EMAIL` | The service account used to sign authenticated Pub/Sub push requests |
| `GOOGLE_PLAY_PUBSUB_SUBSCRIPTION` | Full subscription name: `projects/<project>/subscriptions/<subscription>` |

Configure Real-time Developer Notifications with a Pub/Sub topic. Grant `google-play-developer-notifications@system.gserviceaccount.com` publisher access to that topic. Create an **authenticated push subscription** targeting the URL above, with the exact audience above and the configured push service account. Grant the Pub/Sub service agent the required permission to create that identity token. Restrict who can publish to the topic. Send Play Console's test notification and confirm a successful response before enabling sales.

The server queries Product Purchases V2 and Subscriptions V2. It writes the delivery record and player balance in one Firestore transaction, then consumes consumables or acknowledges subscriptions. The app never auto-consumes an Android purchase before verification.

## Apple verification

In App Store Connect, use **Users and Access → Integrations → In-App Purchase** to create an In-App Purchase key. Save the `.p8` file securely; Apple only permits downloading a private key once.

| Variable | Value |
|---|---|
| `APP_STORE_BUNDLE_ID` | `com.brainbloom.app` |
| `APP_STORE_APP_ID` | The numeric Apple ID of the App Store Connect app record |
| `APP_STORE_ISSUER_ID` | Issuer ID for the In-App Purchase key |
| `APP_STORE_KEY_ID` | Key ID for the downloaded key |
| `APP_STORE_PRIVATE_KEY` | The `.p8` PEM content, stored only as a protected server secret |

Set the **App Store Server Notifications V2** production and sandbox URLs to:

`https://brainblooms.vercel.app/api/purchases/app-store`

Request a test notification and verify delivery. The server uses Apple's official App Store Server Library, verifies signed data against Apple's bundled root certificates with online revocation checks, and retrieves current transaction/subscription status from Apple. A client-supplied transaction ID alone never establishes ownership or entitlement.

StoreKit 2 purchases carry the server-issued `appAccountToken`. Unfinished transactions are recovered after app restart and are finished only after durable server delivery. Restore Purchases also synchronizes the App Store's transactions and refreshes the server entitlement.

## Sandbox rollout

1. Add the appropriate store credentials and notification settings to Vercel, then redeploy the backend.
2. Set `NATIVE_BILLING_MODE=sandbox` and `NATIVE_BILLING_TEST_UIDS=<uid1>,<uid2>` in the backend. Only these registered app accounts can use sandbox billing. Guests must sign in before purchasing.
3. Build the test app with `--dart-define=STORE_PAYMENTS_ENABLED=true`. The normal build remains in free mode when this flag is omitted. Use a signed Android App Bundle for Play internal testing; use the configured Apple signing team for TestFlight.
4. Keep `settings/player-security.paymentsEnabled=false` while the existing public app remains in free mode. Sandbox billing is separately restricted to the invited tester UIDs.
5. Test every product's exact currency/price, purchase, decline, cancellation, delayed approval, verification outage, app kill/restart, duplicate event, restore on a second device, wrong account, renewal, expiry, cancellation before expiry, grace period, and refunds. Test the real Google and Apple notifications, not only mock payloads.
6. Confirm that no receipt grants twice and that consumables cannot be reassigned to a different Firebase account. Verify consumption/acknowledgment in the store consoles.

Sandbox entitlements belong to the allowlisted tester accounts; use dedicated testers, not normal customer accounts. They share the existing backend data store and can change those accounts' Premium status in the app. They are not isolated in a separate Firebase project. Do not remove test users from the allowlist while they still have pending transactions that need cleanup.

## Production rollout

After sandbox validation and store approval, coordinate the app release and backend switch:

- Change `NATIVE_BILLING_MODE` to `production`.
- Set `settings/player-security.paymentsEnabled=true` to close the old free purchase endpoint. Keeping free grants available while selling the same benefits would bypass payment. Older free-mode apps and the web shop will then be unable to grant free purchases; the web shop is not given a new card checkout by this integration.
- Release the app built with `STORE_PAYMENTS_ENABLED=true`. Confirm the native store products are active before distributing it.
- Keep dedicated App Review and TestFlight/sandbox Firebase UIDs in `NATIVE_BILLING_TEST_UIDS`; production mode still restricts sandbox receipts to these accounts. Supply the dedicated reviewer app login through the store's private review notes so reviewers can use an allowlisted account.
- Verify production credentials, webhook delivery, restore behavior, and refunds before making the release broadly available.

Refunds remove the refunded virtual items once, including the bonus freezes from a refunded annual subscription payment. Refunding an earlier annual payment does not revoke a later paid renewal. Apple refund reversals can restore the affected items; an older Google lookup cannot undo a confirmed Google refund. If refunded gems or freezes have already been spent, their balance can become negative; future earnings/purchases repay that virtual balance. This never charges real money. A heart-refill refund removes up to the remaining hearts and resumes normal refill timing. Subscription cancellation preserves access until the verified paid expiry; expiration, account hold, and revocation remove that subscription's access while retaining any other valid entitlement.

Existing server-granted free-mode Premium expiry is retained during the transition. Store receipts remain bound to the original Firebase account. Account deletion removes the active billing profile and prevents later notifications from recreating the account; minimal server-only order records and deletion markers are retained for replay protection and purchase support.

Payment verification runs during purchase and entitlement recovery. The normal puzzle answer path does not call either store.

## Verification and references

Automated coverage includes account binding, forged requests, duplicate/concurrent delivery, partial refunds and refund reversal, exact subscription expiry, annual renewal bonuses, late events, deletion races, server finalization recovery, signed webhook rejection, localized prices, pending approval, account changes, and native recovery. Real store account/device tests remain required.

Validation on 8 October 2026:

- Flutter analysis: clean. Full Flutter suite: **1,236 passed**, with the manual event-calendar exporter skipped.
- Payment API, verification, delivery, and notification suites: **51 passed**.
- Real local Firestore transaction tests: **10 passed** across player and purchase delivery, including a concurrent purchase/account-deletion test.
- Firestore access rules: **68 passed**, including denial of client access to billing records for guests, players, and Studio administrators.
- TypeScript: clean. Focused ESLint: no errors; one existing account-deletion navigation warning remains.

These checks do not prove successful real store checkout. Signed Android internal-track and iOS sandbox/TestFlight purchase tests remain required before enabling customer payments. No paid APK or App Store submission has been made by this implementation.

Recovery on 9 October 2026:

- The interrupted chat's isolated backend release passed **482 tests** and its production Next.js build. All 24 selected backend files matched that tested snapshot before this guide was corrected; unrelated Studio work is excluded from that release.
- The saved Android release Kotlin/Java compilation completed successfully with the paid-billing build flag. This is a compilation check, not a store purchase test or an uploaded release.
- Fixed checkout recovery so a native launch failure does not permanently block another attempt. A store-confirmed pending approval continues to block duplicate checkout. All **41 focused Flutter billing/paywall tests** pass, including both new regression cases; Flutter analysis is clean.
- Production environment inspection found no native billing mode or store credentials configured. Checkout therefore remains disabled on the backend; normal Flutter builds also keep `STORE_PAYMENTS_ENABLED` off.
- The next owner action is developer enrollment. Store listings, products, protected credentials, signed test distribution, and real purchase/refund/renewal tests remain outstanding.

- [Google Play Billing integration](https://developer.android.com/google/play/billing/integrate)
- [Google Play Billing security](https://developer.android.com/google/play/billing/security)
- [Google Play Developer API setup](https://developers.google.com/android-publisher/getting_started)
- [Google subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
- [Real-time Developer Notifications](https://developer.android.com/google/play/billing/rtdn-reference)
- [Apple App Store Server Library](https://github.com/apple/app-store-server-library-node)
- [Apple App Store Server API](https://developer.apple.com/documentation/appstoreserverapi)
- [Apple Server Notifications](https://developer.apple.com/documentation/appstoreservernotifications)
- [Flutter in_app_purchase](https://pub.dev/packages/in_app_purchase)
