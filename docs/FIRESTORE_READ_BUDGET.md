# Firestore Read Budget and Scaling Plan

Updated: 2026-10-13

## Executive summary

The project is not reading 120 Moments as 120 Firestore documents. Moments are
stored in one `settings/events` document, so a normal public configuration read
costs one document read. The largest current read multipliers are:

1. A cold published-puzzle catalogue load materialises about 5,000 puzzle
   documents.
2. The Studio dashboard and analytics currently need the full puzzle bank on a
   cold browser cache, also about 5,000 reads each.
3. The old Home implementation could request the same Moments document from
   several mounted components at once.
4. Player verification commands are intentionally transactional and read a
   small set of authoritative documents on every command. They are not the
   main spike, but idle polling can make them expensive over time.

At the current content size, ten uncached full-bank loads are enough to consume
50,000 daily reads. One developer opening Studio, Analytics, Learn and Home in
fresh browser/server-cache conditions can approach that faster than expected.

This document separates measured source-based estimates from live billing.
The repository cannot see the Firebase Usage dashboard, so the exact production
cause must still be confirmed against Firebase Console's per-day read graph.

## Current read-cost model

Assumptions:

- `P` = 5,000 published puzzles.
- `N` = 5,000 total puzzles in the Studio bank.
- `M` = 120 Moments stored inside one `settings/events` document.
- `D` = 120 Discover lessons stored as separate documents.
- No Firestore transaction retries.
- A server-side `unstable_cache` hit is counted as zero Firestore reads.

### Studio

| Flow | Cold reads | Warm same-browser reads | Main source |
| --- | ---: | ---: | --- |
| Studio dashboard | `N + 2` ≈ 5,002 | Usually 0 for the puzzle bank | `services/puzzle-service.ts`, `app/studio/page.tsx` |
| Studio analytics | `N + 2` ≈ 5,002 | Usually 1–2 | `services/analytics-service.ts` |
| Studio settings | Usually 3 | Usually 0–2 | lesson groups, pricing, staff listener |
| Studio Moments | Usually 3 | Usually 1 | staff auth + `settings/events` |
| Discover Studio list | `D + 2` ≈ 122 | Usually 0 in one tab | admin auth + Discover query |
| Discover Studio editor | Previously `D + 2`; now about 3 | About 0 with local UI state | one-lesson admin endpoint |

The full-bank Studio cache is persisted locally. Its TTL is now 24 hours and is
cleared after Studio mutations. This is a safe first reduction, but it does not
remove the first-load cost for a new browser or device. Server-side pagination
remains the long-term fix.

### Player web session

The exact count varies by identity, cache state and transaction retries. A
representative authenticated first Home load is:

| Flow | Approximate reads |
| --- | ---: |
| Auth/profile restore and player snapshot | 5 |
| First Daily Set | `P + 8` on a catalogue miss; about 8 when warm |
| Weekly cipher | 2–4 when the published catalogue is warm |
| Leaderboard | up to 10 top entries + current-user lookup |
| Public Moments configuration | 1 after client request deduplication |

The dangerous term is `P`: a cold published catalogue load is about 5,000
document reads even when the player only needs three Daily Set puzzles. The
server cache in `lib/server/puzzle-catalogue.ts` normally shields later requests
for up to 24 hours, but a new cache instance, cache invalidation, deployment or
uncached path can materialise the bank again.

### Flutter player session

Flutter calls the shared HTTP API; these are server-side Firestore reads, not
direct Flutter SDK reads. A warm signed-in Home session is approximately:

| Flow | Approximate server reads |
| --- | ---: |
| Forced user document + snapshot | about 5 |
| Daily Set | about 7–8 after initialization |
| Weekly cipher | about 2–4 |
| Leaderboard | up to 11 plus a rank aggregation when needed |
| Public Moments configuration | 1, now locally persisted and request-deduplicated |

The shell's local 30-second timer remains for heart/day UI updates, but passive
server snapshots are now guarded to five minutes after an accepted authoritative
response. Explicit refreshes and reward/answer commands remain server-authoritative.

Opening a normal puzzle adds a fresh start transaction and one or more answer
transactions. Those reads protect answer secrecy, sessions, receipts, rate
limits, awards and account-deletion state; they should not be replaced with
client-only rewards.

### Discover and Moments

- 120 Moments in one settings document: one read per uncached public request,
  not 120 reads.
- Multiple Home Moment consumers previously raced and could request the same
  document up to eight times. Client in-flight deduplication reduces that to
  one request per cache miss.
- 120 published Discover lessons: roughly 120 reads for a cold public library
  query, plus one read for a lesson detail.
- Discover progress, bookmarks and reading position are local-only and do not
  consume Firestore reads.

## Changes already applied

### Web

- `services/event-service.ts`: concurrent public Moment requests share one
  in-flight request while retaining the five-minute client cache and local
  fallback.
- `app/api/puzzles/route.ts`: category requests query only the requested
  category. They no longer load the full published bank and filter it in
  memory. This uses a single category field query and avoids requiring a
  composite index.
- `services/puzzle-service.ts`: Studio's persisted full-bank cache now lasts
  24 hours and is still cleared after writes.
- `app/api/admin/discover/[id]/route.ts`: added authenticated one-lesson GET.
- `services/discover-service.ts` and
  `components/studio/discover/DiscoverLessonEditor.tsx`: editing one Discover
  lesson no longer reads the full Discover collection.
- `services/discover-service.ts`: public Discover list/detail reads now share a
  five-minute in-memory cache and single-flight request.

### Flutter

- Removed the duplicate resume snapshot invocation.
- Passive verified snapshots are suppressed for five minutes after a successful
  authoritative response; explicit refresh still bypasses that guard.
- Published puzzle memory-cache hits now still check the 24-hour refresh age and
  start one single-flight background refresh when due.
- Discover's refresh control now performs a real service refresh instead of
  invalidating a provider that could return the same in-memory cache.

## Remaining high-impact work

### P0: materialise a small published-puzzle selection index

The current Daily Set selector needs a candidate pool. Reading every published
puzzle is the wrong shape for a 5,000-document bank. Use a server-maintained
manifest/shard instead:

- Store only `{id, type, category}` in category-balanced manifest documents.
- Keep each shard comfortably below the Firestore 1 MiB document limit.
- Read the small relevant shards for Daily Set/category selection.
- Read only the selected puzzle documents for scoring and delivery.
- Rebuild the manifest after seed/import and update it transactionally when a
  puzzle changes publication state, category or type.
- Keep the current full catalogue as an explicit Studio export/admin rebuild
  path, not as an implicit player dependency.

This changes the cold Daily Set path from approximately `P + 8` reads to a
small number of manifest-shard reads plus three selected puzzle reads. The
manifest must be invalidated as part of publication changes; a stale manifest
must never make an unpublished puzzle playable.

### P1: paginate the Studio puzzle bank

The dashboard currently downloads every puzzle so the browser can filter, sort
and paginate. Replace it with an admin endpoint that supports:

- `limit` and cursor pagination;
- server-side review status, type and category filters;
- a lightweight list projection for dashboard rows;
- an explicit full-bank export for operations that truly need all records.

Analytics should use aggregate counters/materialized statistics rather than
re-reading all puzzle documents. A cold dashboard should read one page (for
example 50–100 documents), not 5,000.

### P1: cache public catalogue responses at the server boundary

The published catalogue already uses a 24-hour Next data cache, but ordinary
category requests now bypass it with a scoped Firestore query. Add a short
server cache for high-frequency category responses or a versioned category
manifest. Invalidate it whenever a publish/unpublish or seed operation changes
the relevant category.

Public event configuration can similarly use a short server cache keyed by the
settings document version. The client-side five-minute cache and request
deduplication are already in place, so this is lower priority than puzzle
selection.

### P2: reduce recurring background work

The hourly web reminder job currently scans user documents separately for
morning, evening and midnight work. As the user base grows, maintain a
denormalised next-reminder bucket or combine the eligible-user scan so one user
document is not read three times in one hourly invocation.

Leaderboard responses should have a bounded 30–60 second cache keyed by week and
user ID. Failed auth/cloud restores should use backoff instead of retrying the
same five-read restore on every visibility/online event.

## Monitoring and proof plan

The Firebase console is the source of truth for actual billed usage. Capture
these separately:

1. Firestore Usage → document reads by day, with the UTC day boundary noted.
2. Server logs/metrics by route and command:
   - `/api/puzzles` full catalogue versus category;
   - `/api/player` action and transaction retry count;
   - `/api/events`, `/api/discover`, leaderboard;
   - Studio full-bank loads and Discover admin list/editor loads;
   - hourly cron and push-token scans.
3. Cache hit/miss counters for `publishedCatalogue`, player-content caches,
   Studio local cache, event config and Discover.
4. A test matrix using a fixed 5,000-puzzle / 120-Moment fixture:
   - fresh browser Home;
   - warm Home reload;
   - Learn category open;
   - Studio dashboard and Analytics;
   - Discover library and editor;
   - app foreground for 30 minutes;
   - three puzzle attempts.

Do not infer Firestore reads from HTTP request count alone. One HTTP request can
run a multi-page Firestore query, a transaction can retry, and an aggregation
has its own billing behavior.

## Verification commands

Web focused checks:

```text
npx vitest run lib/event-service.test.ts lib/server/discover-routes.test.ts
npx tsc --noEmit
```

Flutter focused checks:

```text
flutter analyze
flutter test test/core/services/puzzle_refresh_test.dart \
  test/core/services/discover_service_test.dart \
  test/core/providers/verified_refresh_test.dart \
  test/core/routing/deep_link_test.dart
```

The checks above verify the implemented cache, deduplication, Discover editor,
refresh and routing changes. They do not replace a Firebase Console usage
check or a production load test.
