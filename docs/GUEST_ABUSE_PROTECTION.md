# Guest abuse protection

## Scope

Guest reward requests share a server-enforced network budget across anonymous Firebase accounts. Creating another guest account cannot reset that budget. Every first successful player command requires admission, including commands that skip the normal login snapshot. The existing account-level limit of 120 successful commands per ten minutes also remains active.

The public Firebase sign-up endpoint can still create anonymous authentication identities. These controls govern access to player progress, rewards, profile writes and push registration; they do not claim to stop Firebase identity creation or distributed attacks across many networks.

## Limits

| Per network | Without App Check proof | With verified App Check proof |
| --- | ---: | ---: |
| Request burst | 60 | 180 |
| Request refill | 1 per second | 3 per second |
| New player admissions, rolling hour | 12 | 60 |
| New player admissions, rolling 24 hours | 50 | 300 |

Existing guests consume request capacity but not another admission. All guests on a shared connection share these allowances. IPv6 privacy addresses are grouped by /64; IPv4-mapped IPv6 addresses use the corresponding IPv4 identity. A throttled response uses HTTP 429 and `Retry-After`; admission errors also offer Google sign-in.

Counters are read in the existing Firestore transaction batch. Admission and economic updates commit atomically. A rejected business operation consumes its request allowance but cannot commit partial progress, receipts or an admission. Concurrent attempts cannot spend the same final allowance twice.

## Configuration

- Set `PLAYER_ABUSE_SECRET` to a cryptographically random secret of at least 32 characters on every Vercel deployment that can serve the player API. Keep the same secret across production aliases. Rotation resets the effective network budgets and should be deliberate.
- Keep `PLAYER_APP_CHECK_MODE=compatible` for the current release. A missing proof uses the lower allowance; an invalid or expired supplied proof is rejected. Unknown mode values fail closed.
- The browser uses Firebase App Check with reCAPTCHA Enterprise. Its public site key must match the web app's Enterprise App Check configuration and allowed domains.
- On Vercel, network identity comes from the platform-overwritten forwarding headers. User-provided device or platform labels never grant an exemption. Missing or invalid trusted network data, or a missing secret, makes anonymous requests fail closed. Local development outside Vercel omits this network limiter.
- Restrict `/api/player` on historical immutable deployment hosts at the Vercel firewall. Otherwise an old deployment can bypass the new server code. Keep the allowlist aligned with the actual production and branch aliases; review it when adding a domain.

Firebase authentication, revocation checks, email verification and server grading remain required. App Check proof is not a substitute for a player identity.

## Compatibility and latency

The browser acquires authentication and App Check tokens concurrently. It reuses the SDK's cached proof and shares pending verification attempts. If minting a proof takes longer than 150 ms, the request continues under the lower allowance while minting finishes in the background. A cached proof normally resolves immediately. This limit covers the verification wait, not network or database latency.

The existing Android APK does not send App Check proof and remains supported in compatibility mode. Do not set the mode to `required` until native attestation is configured, a compatible native release is adopted, every caller of `requirePlayer` supplies proof, and expired-token, offline/recovery and real Google/guest login flows are verified. Old browser tabs must also reload. There is deliberately no untrusted platform-header bypass for required mode.

## Storage and cleanup

`playerAbuse/{key}` stores HMAC-SHA256 network identifiers, request counters and guest-admission timestamps. It does not store raw IP addresses. Firestore rules deny every client read and write to these records. Anonymous clients must have server-created `playerProgress/{uid}` before creating or updating their profile or writing push registrations.

Records expire after 48 hours without accepted request activity. The authenticated `/api/cron/hourly` handler removes up to 400 expired records per invocation, using update-time preconditions so a refreshed record cannot be erased by a stale cleanup query. The Vercel backup schedule runs daily; an external hourly trigger is documented separately. Physical deletion can therefore lag expiry and backlog should be monitored through the handler's `guestLimitsRemoved` response. Cleanup failure does not interrupt reminder delivery or reopen a budget.

## Validation and operations

Unit and HTTP tests cover spoofed identifiers, address normalization, rolling quotas, malformed and absent proof, strict-mode bypass attempts, replay throttling, provider failure and cleanup races. Firestore emulator tests cover unauthorized direct writes, concurrent final-slot admission and rollback of failed reward operations.

During deployment, verify the published rule hash and active aliases. Use isolated, positively identified test accounts for live guest/proof checks and remove their account data afterwards. Do not exhaust production network quotas or reset shared counters. Measure prepared answer latency separately from login, token minting and session preparation.

Mandatory attestation for every client, distributed-bot resistance and real-device validation remain follow-up work. These controls reduce guest abuse; they are not a claim that all security issues are resolved.
