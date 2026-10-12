# 11 — Known Issues, Gaps & How to Talk About Them

**Why this file exists:** interviewers probe. If *you* raise a weakness first, with the cause and the fix, it
reads as engineering maturity. If they find it and you didn't know, it reads as the opposite.

**Evidence labels**
- ✅ **Verified** — I ran it (real Postgres 16 + the actual `server.js`/build) on 2026-10-12.
- 📖 **Read** — confirmed by reading the code, not executed.

I did **not** change any project code while preparing this pack — every issue below is still present.

---

## A. Bugs you should know about (ranked)

### 1. 🔴 The ★ watchlist button on auction cards doesn't work, and AuctionDetail's "Watch" can't tell what's watched — ✅ verified
- **Where:** `components/AuctionCard.js:31,35` and `pages/AuctionDetail.js:85,95` use `auction.referenceId || auction.reference_id`.
- **Cause:** the API (`GET /auctions`, `/auctions/:id`) never returns that field. ✅ Verified: the response keys are `basePrice, bidCount, company, currentHighestBid, description, endTime, highestBidder, id, logo, priceBand, remainingShares, sector, startTime, status, ticker, totalShares, type` — no `referenceId`.
- **Effect:** `addToWatchlist(undefined)` → JSON body omits `stockId` → server replies `400 {"error":"stockId is required"}` (✅ verified). On AuctionDetail the watched state is computed as `w.stock_id === undefined`, so it always shows "Watch".
- **What does work:** the Watchlist *page* (list + remove) works with rows that exist (e.g. the seeded ones), because it uses `stock_id` straight from the watchlist query.
- **Fix (2 lines, backend):** add `referenceId: r.reference_id,` to the object built in `GET /api/auctions` (server.js ≈ line 228) and `GET /api/auctions/:id` (≈ line 276). For stock auctions `reference_id` *is* the `stock_id`.
- **Say:** *"The watchlist star was added late; the card relies on a `referenceId` the list endpoint doesn't expose. It's a two-line API change — I found it while verifying."*

### 2. 🔴 Bids are accepted after the auction's end time — ✅ verified
- **Where:** `POST /api/bids` only checks `status = 'open'` (`server.js:561`); `end_time` is never compared with `NOW()`.
- **Effect:** I set auction 2's `end_time` an hour in the past and a bid was still accepted (`200`). The UI shows "Awaiting close" but the API keeps taking bids until an admin closes.
- **Fix:** add `AND end_time > NOW()` to the auction `SELECT`, and ideally a scheduled job (a `setInterval` in the server, `pg_cron`, or an external cron) that closes expired auctions.
- **Say:** *"Auction lifecycle is deliberately admin-driven. The gap is that the API doesn't enforce the deadline; the fix is one predicate plus an auto-close job."*

### 3. 🟠 The "race-proof" bid insert is not actually a lock — ✅ verified (and the fix verified too)
- **Claim in README/WALKTHROUGH:** the guarded `INSERT … SELECT … WHERE price >= MAX+0.50` means "the database settles the race".
- **Reality:** under READ COMMITTED two concurrent statements both read the same `MAX` and both insert. **15 concurrent equal-price bids × 30 rounds → >1 insert succeeded in 29/30 rounds (worst case 15/15).** Details in [06 §3](06-algorithms-and-why.md#3-atomic-guarded-bid-insert-toctou-fix).
- **Impact:** duplicate equal-price bids; allocation is *still deterministic* because of `ORDER BY bid_price DESC, bid_time ASC`. No data corruption.
- **Fix ✅ verified (0/30 racy rounds):** wrap in `BEGIN … COMMIT` and take `SELECT 1 FROM auction WHERE auction_id=$1 FOR UPDATE` before the guarded insert (or `pg_advisory_xact_lock`, or SERIALIZABLE + retry).
- **Contrast — ✅ the close-auction guard IS safe:** 5 simultaneous `PATCH …/close` → one `200`, four `400`, a single allocation.
- **Say:** *"I narrowed the race with a guarded insert, but only a row lock fully serialises it — I tested both. The close endpoint is safe because its conditional UPDATE conflicts on the same row."*

### 4. 🟡 `ipo.status` goes stale — ✅ verified
Set to `closed` on close but never to `open`: after opening an IPO auction, `auction.status='open'` but `ipo.status='upcoming'`. UI uses `auction.status`, so nothing visibly breaks. **Fix:** update both in `/open`, or drop `ipo.status` (it duplicates `auction.status`).

### 5. 🟡 "Clearing price" is the **lowest bid**, not the lowest *winning* bid — 📖 read
`server.js:405-407` uses `bidsResult.rows[last].bid_price`. If supply runs out before the last bid, or the last bidder can't afford any shares, the "clearing price" is still that last bid's price. The README text ("price at which the last share was allocated") describes something slightly different. It also only sets the new `stock.base_price` — winners pay **their own bid** (pay-as-bid), ✅ verified. Don't describe it as a uniform clearing price.

### 6. 🟡 IPO price band is stored but never enforced — 📖 read
`price_band_min/max` are displayed on the IPO UI but `POST /bids` doesn't check the bid is inside the band. Also the Admin "Create" form has no band fields, so every IPO gets `[basePrice, basePrice×1.2]` (✅ verified: base 100 → band 100–120).

### 7. 🟡 No funds escrow — 📖 read + ✅ seed demonstrates it
Balance is checked when bidding and the allocation is capped by balance at close, but money isn't reserved, so one user can hold many open bids whose total exceeds their balance. The cap at close makes it *safe*, not *fair* (a bidder can silently receive fewer shares than they bid for — e.g. Priya bid 5,000, got 2,807).

### 8. 🟡 Admin can close before `end_time` / open before `start_time` — 📖 read
No time checks on `/open` or `/close`. Intentional manual control, but worth stating.

### 9. 🟡 Deleting an account hard-deletes the audit ledger — ✅ verified
Cascade removes the user's bids, rankings, portfolio, **transactions** and watchlist; the shares they won are not returned to `stock.available_shares`. Production systems soft-delete (`deleted_at`) to keep financial history.

### 10. 🟡 Misleading labels / numbers — 📖 read
- "**Subscription %**" is really *allocated %*; it only changes at close (for an open auction it reflects earlier allocations).
- "**Total Volume**" = `Σ highestBid × (total − remaining)`, an approximation, not traded volume.
- Portfolio "**Current price**" = `base_price × 1.05` (simulated).
- Login-page stats and Landing charts are **hard-coded/fake**.
- An "outbid" bid can still win shares at close if supply remains (✅ seen in the worked example).

### 11. 🟡 Small UI gaps — 📖 read
- `IPOPage` "Place Bid" button only calls `stopPropagation()` (the card click navigates; the button itself does nothing).
- Watchlist "View Auctions" goes to the generic `/auctions` list, not that stock's auction.
- `AuctionDetail`'s close handler shows a generic error instead of the server's message (AdminPanel does show the server message).
- Dummy mode's `placeBid` doesn't apply the ₹0.50 rule.

---

## B. Security observations

| Issue | Evidence | Mitigation to propose |
|-------|----------|-----------------------|
| Default JWT secret `"auction_secret"` if env is missing | 📖 `server.js:13` (warns at boot) | Fail fast (exit) when `JWT_SECRET` is unset in production |
| JWT in `localStorage` (XSS-readable) | 📖 `AppContext.js:20-21` | httpOnly + SameSite cookie, CSRF token |
| No rate limiting / lockout on login | 📖 | `express-rate-limit`, account lockout/backoff |
| No security headers | 📖 | `helmet` |
| Username-enumeration by **timing** (unknown user skips bcrypt) | 📖 | always run a dummy `bcrypt.compare` |
| Role baked into JWT for 24 h | 📖 | short-lived access + refresh tokens, or re-check role from DB on sensitive routes |
| **Bidder masking is cosmetic** — API returns real usernames (and `GET /auctions` is *public* and returns `highestBidder`) | ✅ verified `/bids` returns `"rajesh"` | Mask/alias server-side; require auth on the list |
| Changing email/username needs no password re-entry | 📖 `PATCH /auth/me` | Require `currentPassword` for identity changes |
| No email verification | 📖 | verification flow |
| Passwords min length 6 only | 📖 | longer minimum / breached-password check |

**What *is* done well (say these):** parameterised SQL everywhere; bcrypt; role hard-coded on register (✅ verified escalation attempt fails); `adminOnly` on admin routes (✅ 403); identity always from the JWT never the URL; uniform login error; body-size limit; CORS pinned to one origin; internal errors never leaked (`"Internal server error"`).

---

## C. Engineering / process gaps

| Gap | Evidence | Note |
|-----|----------|------|
| **No working automated tests** | ✅ `npm test` fails: `Cannot find module 'react-router-dom'` (the Jest bundled with CRA 5 fails to resolve it — I didn't dig into why, likely the package's `exports`-style packaging), and the test looks for text "learn react" that doesn't exist anyway | The only test is the untouched CRA template. Backend has none. Behaviours above were verified by hand-written scripts, not a suite |
| **Frontend `npm ci` fails** | ✅ `Missing: yaml@2.9.1 from lock file` | Lockfile out of sync; `npm install` works and `npm run build` then **compiles** (✅ ~125 kB gz) |
| **Tailwind is an unused dependency** | 📖 `index.css` has no Tailwind import | Remove `tailwindcss`, `@tailwindcss/postcss` (and the PostCSS entry) or actually adopt it |
| Re-running `schema.sql` isn't safe | ✅ seed inserts aren't idempotent | Drop/recreate DB to reset; add `ON CONFLICT DO NOTHING` or split schema/seed |
| No migrations tool | 📖 | Prisma Migrate / Flyway / node-pg-migrate |
| Single 723-line `server.js`; SELECT duplicated list/detail | 📖 | Split routers/controllers/services; extract the SQL into one view or function |
| JS-float money maths at close | 📖 `totalCost = alloc * bid.bid_price` | Compute in SQL as `NUMERIC` |
| `GET /auctions` has 4 correlated subqueries per row, polled every 3 s | 📖 | Pre-aggregate (view/materialised view) or cache; ETag/304 |
| Per-bid queries inside the close loop (O(n) round-trips) | 📖 | Batch: one `JOIN` for balances + in-memory map; bulk inserts |
| No logging/monitoring beyond `console.error` | 📖 | pino/winston, request IDs |
| Missing indexes: `bid(auction_id, bid_price DESC)`, `bid_ranking(bid_id)`, `auction(type, reference_id)` | 📖 | see doc 05 §4 |
| No `UNIQUE(bid_id)` on `bid_ranking` | 📖 | add it |
| Polymorphic `auction.reference_id` has no FK | 📖 documented trade-off | 3 redesign options in doc 05 §3 |

---

## D. Documentation drift (don't repeat these claims!)

The repo's `README.md` / `WALKTHROUGH.md` are mostly accurate but have drifted from the code:

| Doc says | Code actually |
|----------|---------------|
| Responses use a `{ "data": …, "message": … }` envelope | Plain JSON: arrays/objects, `{message}`, `{error}` |
| `201 Created` for creates | Every success is `200` (`res.json` only) |
| `POST /api/bids` "Return updated bid ladder" | Returns `{ id, message }` only |
| Project tree lists `BidHistoryTable.js` and `Navbar.js` | **Neither file exists** (the bid table lives inside `AuctionDetail.js`) |
| Architecture diagram says React 18 | `package.json` is React **19.2** (the tech table says 19) |
| WALKTHROUGH: "10 pages" | 12 pages (`Landing`, `Settings`, `Watchlist` were added later) |
| README page map / API reference omit Landing, Settings, Watchlist, `/auth/me` | They exist (WALKTHROUGH covers the account routes) |
| WALKTHROUGH Ch.4: NovaTech is `/auction/3` | NovaTech is auction **1**; auction 3 is QuantumPay |
| README: server prints "Connected to PostgreSQL" | It prints `Auction backend running on http://localhost:<PORT>` only |
| "Database settles the race" (bid insert) | Narrows, doesn't close — see A3 |
| "Clearing price is the price at which the last share was allocated" | Lowest bid overall — see A5 |

---

## E. Quick wins you could implement tonight (if you want)

> Optional. None of these have been applied. Each is small and independently testable.

1. **Fix the watchlist ★** — backend, 2 lines: add `referenceId: r.reference_id,` in both auction mappers.
2. **Enforce the deadline** — in `POST /api/bids`: `SELECT * FROM auction WHERE auction_id = $1 AND status = 'open' AND end_time > NOW()`.
3. **Lock the auction row for bids** — run the bid validation + guarded insert in a transaction after `SELECT 1 FROM auction WHERE auction_id = $1 FOR UPDATE`.
4. **Set `ipo.status='open'`** inside `PATCH /auctions/:id/open` (for IPO type).
5. **Regenerate the frontend lockfile** (`npm install`, commit `package-lock.json`).
6. **Replace the dead CRA test** with one smoke test that renders `<Login/>` inside a `MemoryRouter` (and mock `axios`), or delete it.

If you'd like me to apply any of these (and add a real backend test), say so — I'd rather not change code you'll be asked about tomorrow without you deciding.

---

## F. One-liner answers for the three most likely "gotcha" probes

| Probe | Answer |
|-------|--------|
| "Is your bid insert race-safe?" | "It's *narrowed*, not closed — under READ COMMITTED the guarded INSERT can still admit concurrent equal bids (I tested it). The proper fix is a `FOR UPDATE` lock on the auction row, which I also tested. Allocation stays deterministic thanks to the time tie-break, and the close endpoint *is* fully race-safe." |
| "What happens at the end time?" | "Nothing automatic — closing is an admin action. That's a design simplification, and the known gap is that the API doesn't reject bids after `end_time`; fix is a predicate plus an auto-close job." |
| "Did you test it?" | "I verified behaviour end-to-end with scripts against a real Postgres — allocation, affordability caps, double-close, auth, cascade — but the repo doesn't have a committed automated test suite; the one CRA test is a leftover template. Turning those scripts into Jest/Supertest tests is the next step." |
