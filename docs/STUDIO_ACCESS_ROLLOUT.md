# Studio access: critical security fix

Status (5 October 2026): the critical database and administrator API fixes are live at https://brainblooms.vercel.app. GitHub commit `02f942a` deployed the security changes; `3a2d6fe` corrected a production dependency-loading failure. Vercel deployment `dpl_4HR8ckXFN391Y3ZsAq8CLFeUysRh` is READY and owns the production aliases. The restrictive Firestore rules are active, and the old plaintext `codes` field has been removed from `settings/studio`, preserving unrelated fields. Twelve live API denial checks pass. The owner has confirmed successful administrator sign-in with Google. A real invited contributor session remains to be checked through the live UI.

Studio remains a web-only, invitation-only tool. Email/password or Google verifies identity; a private invitation grants membership. An ordinary player account cannot enter Studio. Invitations are bound to a verified email, expire after seven days, and can be used by one account. Members subsequently sign in with that approved account.

| Permission | Administrator | Contributor | Player/guest |
|---|---|---|---|
| Create, list or cancel invitations | Yes | No | No |
| Invite another administrator | Explicit role selection | No | No |
| Create/edit own unpublished puzzles | Yes | Yes | No |
| Publish/review or edit other people's puzzles | Yes | No | No |
| View account summaries/send broadcasts | Yes | No | No |
| Manage lesson groups | Yes | Yes | No |
| Change pricing, pins or event configuration | Yes | No | No |

New invitations default to contributor. The owner intends to have two or three administrators; the system does not enforce an arbitrary numerical cap. Adding an administrator always requires an existing administrator, except for the trusted first-account bootstrap below.

## Enforcement and data

- API authentication verifies Firebase ID tokens, including revocation, then reads `staffAccess/{uid}` for every administrator request. Browser storage and token role claims do not grant access.
- Firestore rules independently consult enabled membership and verified identity for writes. Clients cannot create or change `staffAccess` or `staffInvites`; even administrators create invitations through the protected server API.
- Only invitation hashes are stored in Firestore. The code is returned once on creation, with `Cache-Control: no-store`; invitation lists never return the code. Revoked membership cannot be restored by redeeming an old or fresh invite.
- Legacy `settings/studio` is no longer client-readable or writable. All plaintext credential readers/defaults were removed. Do not migrate privileges from old codes or trust records that were publicly writable.
- Shared public settings are explicitly allowlisted. Player auto-selection and cipher history stay local; explicit Studio pins still write to the backend. Untrusted puzzle completion increments are now local, so shared completion totals need a future trusted aggregation service.
- The service worker bypasses API, authenticated, cross-origin and Studio requests. Its cache version was advanced to clear previously cached responses when the new worker activates.
- Historical puzzle `createdBy` values may contain old invite names. Administrators retain access to that content. If a contributor needs ownership of historical drafts, an administrator must explicitly reassign those drafts to the verified UID; do not infer membership from historical author names.

## Rollout

Completed production work:

1. Selected only the security changes for GitHub publication, preserving unrelated Workshop/import edits in the working tree. The exact release passed 140 web tests and a clean production build, including TypeScript.
2. Published through the existing GitHub-to-Vercel integration. Live logs exposed `ERR_REQUIRE_ESM` from Firebase Admin's `jwks-rsa` dependency loading `jose`. The serverless runtime disables Node's module compatibility feature; `vercel.json` now explicitly sets `NODE_OPTIONS=--experimental-require-module`. The failure was reproduced locally, the real dependency loaded with the setting, and 41 focused authorization/session tests passed again. Keep that setting while the installed dependency requires it.
3. Confirmed every protected route rejects missing and invalid tokens with HTTP 401 and `Cache-Control: no-store`. The checks cover user summaries, invitation GET/POST/DELETE, notifications and invitation redemption. The public home and Studio pages both return 200.
4. Activated ruleset `projects/brainbloom-40/rulesets/f23333a2-4d04-44ea-942a-4df003e4c76c` after the new authentication endpoints were healthy. The exact source was validated and hashed before publication. Live anonymous reads of legacy Studio settings, invitations and staff access return 403; intended public pricing and daily-puzzle reads return 200. Emulator tests cover the write boundaries without modifying production content.
5. Saved a private backup of legacy Studio settings, then removed only the `codes` field with an update-time precondition. This also retires credential lookup by older Vercel deployments using the same database. Old permissive rules and credential data must not be restored as a casual rollback.
6. Visually verified the production Studio page presents email, invite code, password and Google sign-in, with invite-only membership instructions. No mobile release was built or installed during this web/backend rollout. The tested Flutter cipher compatibility change remains local.

Remaining owner validation:

1. Completed: the owner redeemed the administrator invitation and confirmed successful Google sign-in. No further bootstrap invitation is needed.
2. Confirm administrator access, then issue any additional administrator invitations explicitly; leave ordinary Studio invitations at Contributor. Verify a real invited contributor can submit a draft but cannot issue invitations, access users, broadcast, publish, or change pricing. These role boundaries already pass API and Firestore emulator tests.
3. Reload existing Studio tabs so the new worker clears the old cache. Track the remaining audit findings separately; this rollout does not secure player-owned reward/entitlement fields or hide public puzzle drafts and answers.

For a future fresh installation only, bootstrap the first email-bound administrator invitation from a trusted workstation. Use the service account only through a server environment file or process environment. With the owner-specified email and actual project substituted:

   ```powershell
   node --env-file=.env.local scripts/bootstrap-staff.mjs --project PROJECT_ID --email OWNER_EMAIL
   node --env-file=.env.local scripts/bootstrap-staff.mjs --project PROJECT_ID --email OWNER_EMAIL --apply
   ```

   The first command is a read-only dry run. The second requires deliberate operator execution, refuses a mismatched project or an existing active administrator/live administrator invite, and creates one invitation. The code is saved to a restricted, gitignored `.private-invites/*.json` file; it is never printed. Treat the file as a credential and retrieve/share it privately. Google sign-in can create the invited identity; an email/password account must already exist and have verified its email.

## Revoking a joined account

Cancelling an unused invitation does not revoke an already joined member. Disable that private membership using trusted Firebase administration or the same tool:

```powershell
node --env-file=.env.local scripts/bootstrap-staff.mjs --project PROJECT_ID --disable-uid VERIFIED_UID
node --env-file=.env.local scripts/bootstrap-staff.mjs --project PROJECT_ID --disable-uid VERIFIED_UID --apply
```

The apply operation disables membership and revokes Firebase refresh tokens. Database/API checks consult current membership, so the disabled account loses staff authority even with an existing ID token. Preserve at least one administrator. If token revocation fails after membership is disabled, the script reports that partial outcome and can be retried.

## Local validation

- 192 web tests pass, including real authorization helpers with mocked Firebase Admin, direct contributor invitation/API denial, token revocation, invitation binding/expiry/replay, client membership restoration, private service-worker bypass and read-only player settings.
- 26 Firestore emulator tests pass against the actual rules using `demo-security`. They cover guests, players, unverified/disabled staff, forged roles, protected membership/invitations, admin writes, contributor ownership/publication/review boundaries and retained player profile/token access.
- TypeScript and the isolated production web build pass. Targeted lint is clean for new security code and the modified login/settings. Existing Users page warnings concern unused icons and an image element.
- Flutter analysis passes, and all 1,101 Flutter tests pass with one existing intentional skip. The new cipher tests exercise server-authored pins and local fallback against a read-only database.
- The production Studio sign-in page was visually inspected. Web deployment, live API denial checks, rules publication and legacy credential retirement are complete. The owner subsequently confirmed successful Google sign-in and first invitation redemption. Password sign-in needs a separately configured account password; the account currently uses Google. Device installation and a real contributor session remain unverified.

```powershell
npm test
firebase emulators:exec --only firestore --project demo-security --config firebase.json "npm run test:rules"
npx tsc --noEmit
node scripts/build-isolated.cjs
```

The emulator requires Java 21 or newer; Windows can use Android Studio's bundled JBR. No service-account credentials are needed for emulator tests.

This deploys the fixes for audit findings 1 and 2. A targeted Next.js 16.2.10 → 16.3.8 update and matching eslint-config-next update also shipped to address an additional critical web dependency finding. npm now reports zero critical affected packages; 22 high and 39 moderate dependency findings remain for follow-up. The separate player economy/entitlement, account deletion, consent, synchronization and public draft/answer findings remain open. Deployment, API and rules evidence is saved under `C:/Users/singh/Downloads/brainbloom_flutter/build/critical-baseline/` in `deployment-final.json`, `live-api-checks-final.json` and `live-rules-final.json`.

## 6 October follow-up: account cleanup, progress and sign-in feedback

GitHub commit `1b4f745132674be4a675d02b218a7f8b60150623` is live in READY deployment `dpl_CKUHdXnwu7xpSM8uDxywA63uisyW`, with production aliases verified. Ruleset `projects/brainbloom-40/rulesets/6f51b60a-4c6e-446e-bb54-b4e629208341` was published before the API/client release. The owner has confirmed successful Google administrator sign-in.

- Studio displays the Firebase profile name, falling back to email, while retaining UID for authorization and ownership. Session changes/logout clear stale errors. Raw credential errors have helpful copy.
- The live login page offers **Set or reset account password** and explains that Google users need a separate app password for email sign-in. No reset email was sent by the agent. Invite-only membership and admin-only invite creation are preserved.
- DELETE `/api/account` performs authenticated, recent-login, retryable server cleanup. A private deletion marker prevents client writes recreating deleted profiles/tokens. Unverified email claims cannot cancel another person's invitations.
- Server-only cloud reads distinguish failed reads from confirmed absence. Web writes wait for restoration and reconcile pending local changes without replacing newer cloud progress with an untouched stale snapshot. The corresponding Flutter release also preserves guest progress and removes background-widget progress writes.

Validation: 224 workspace web tests, 172 selected-release tests, 28 Firestore emulator tests, TypeScript and production build pass. Fourteen live unauthenticated/invalid-token requests return 401/no-store; home and Studio return 200. The live password action and guidance were verified in the browser. The Flutter full suite passed 1,116 tests with one intentional skip, then 14 focused account tests passed after the final deletion-retry adjustment. Release APK built successfully; not installed or published to an app store. Existing delete-dialog effect-state lint errors remain outside the core lint-clean changes.

The remaining audit findings, scope limits, APK hash and evidence paths are recorded in `C:/Users/singh/Downloads/brainbloom_flutter/docs/SECURITY_AUDIT_2026-10-05.md`. No real account was deleted during verification. Real password setup/sign-in and an invited contributor session remain owner checks.
