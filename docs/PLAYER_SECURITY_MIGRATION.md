# Verified rewards and private content rollout

Release status: locally implemented; final selected-tree validation and deployment are pending. This document describes the release candidate, not completed production work.

Rewarded play requires internet. Both web and Flutter prepare attempts while the user reads, then send the answer in one request that grades the answer and returns committed progress. Studio still defines XP. The server checks eligibility, time, limits, duplicate rewards, shop products, and balances; it never accepts a client-supplied reward amount or correctness flag.

Guest policy: anonymous Firebase accounts receive a fresh verified balance. Meaningful old device-only progress is archived separately before replacement and remains available from Profile. Archive write/readback failure blocks migration. Existing cloud balances are preserved through the guarded migration; historical cloud balances are grandfathered rather than retroactively proven legitimate.

## Included protections

- `playerProgress/{uid}` owns economy state, attempt sessions, receipts, and award records. Transactions and revision ordering protect retries and account changes. Rules allow client profile preferences only, including for administrators.
- Published content reaches players through sanitized APIs. Raw Firestore puzzles require active Studio membership. Moment answers require administrator access; both clients use server grading and result restoration.
- Seed banks and Forge answer files are server-only. The Studio seed API requires a verified administrator and paginates large datasets. No answer bundle remains under `public` or in Studio client imports.
- Account deletion removes anonymous and permanent account progress through the server before signing out. Late responses cannot delete/sign out a replacement session. Studio removal continues to remove only membership.
- Apple credential requests use a fresh secure nonce, SHA-256 binding, and Firebase rawNonce. Apple sign-in UI remains disabled until Apple configuration and device verification are complete.
- Production npm dependency audit reports zero known vulnerabilities. Five high entries remain in one development-only `braces`/Next ESLint dependency chain; no patched braces release was available. The vulnerable operation processes build-tool glob patterns, not player API input.
- Paid checkout and rewarded ads remain unavailable until store verification, durable fulfillment, and ad callbacks are implemented. Intentional free-shop mode uses server-approved products and expiries.

## Verified locally

Flutter analysis passed. Full suite: 1,217 passed, zero failures, one intentional opt-in exporter skip (`build/security-final-tests.log` in the Flutter project). Apple nonce binding and missing-token cases passed.

Firestore emulator: 61 permission tests and four real transaction tests passed, including concurrent rewards, request replay, failed-operation rollback, and deletion markers. Preflight found 9 cloud profiles and 5,031 valid published scoring records. The public projection of the current bank is 3,929,982 bytes, below Vercel's function response limit; catalog growth requires pagination. Firestore is in `nam5`.

Web seed/content tests, TypeScript, and focused lint passed. Final authentication regressions, selected-tree build, live performance and deployment checks remain pending. Old APKs are interim review artifacts and do not represent this release.

## Deployment procedure

1. Finish and validate the exact selected Git tree; preserve unrelated Workshop/import changes outside the release.
2. Set `settings/player-security.enabled=false`. Deploy tested profile-only/content-private rules and verify their exact hash.
3. Run `node --import ./scripts/typescript-paths.mjs scripts/migrate-player-progress.ts --plan`. Review the private snapshot and apply with `--apply <plan-path>`. The tool verifies rules, checks unchanged economic values, preserves backups, and records resumable checkpoints.
4. Deploy the completed API/web release through GitHub main and Vercel. Verify private endpoints reject missing/invalid authentication and public responses contain only allowlisted content.
5. Enable rewards with `scripts/player-rollout.ts --enable` only after migration completes. Anonymous Firebase sign-in has already been enabled and verified.
6. Exercise an isolated anonymous test account, including successful grading, retry/duplicate handling, guest deletion, and real API latency. Do not change real member balances.
7. Produce the final signed release APK once. Record its checksum and deployment compatibility; do not uninstall/wipe the user's device.

Account membership must remain: singhharshit388@gmail.com administrator and chetan.harsigh@gmail.com contributor. Never log secrets or publish private migration/credential files. The earlier exposed server credential was revoked and replaced before this rollout.

## Limits and follow-up

Old immutable public deployment URLs and previously downloaded answer files cannot be repaired by changing the current source; check protection/retire exposed deployments after the replacement is ready. This is a scoped remediation, not a guarantee that every weakness has been found. App attestation, anonymous-account abuse protection, production latency under load, native SDK audits, Apple signing/push and device verification remain follow-up work. Real billing/ad verification must be completed before enabling those features.
