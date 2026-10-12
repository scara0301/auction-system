# 06 — Algorithms & Techniques: what, why, and why not the alternatives

There is **no ML algorithm** in this project. The "algorithms" are the allocation procedure and a handful of
database/concurrency/security techniques. Each section below: *what it does → how → why this → why not the
others → honest caveats.*

Table of contents
1. [Share allocation (price-time priority, greedy, pay-as-bid)](#1-share-allocation) ← the main one
2. [Weighted-average cost basis](#2-weighted-average-cost-basis-portfolio-upsert)
3. [Atomic guarded bid insert (and its real limits)](#3-atomic-guarded-bid-insert-toctou-fix)
4. [State machine via conditional UPDATE (double-close guard)](#4-state-machine-via-conditional-update)
5. [ACID transactions](#5-acid-transactions)
6. [Authentication: bcrypt + JWT](#6-authentication-bcrypt--jwt)
7. [Polling + Page Visibility](#7-live-updates-polling--page-visibility-api)
8. [Small client-side algorithms](#8-small-client-side-algorithms)

---

## 1. Share allocation

**Code:** `PATCH /api/auctions/:id/close`, `server.js:370-467` (loop at 418-451).

### The auction rules, in one paragraph
Bids are `(price, quantity)`. To enter, a bid must beat the current highest by ≥ ₹0.50, fit within the share
pool, and be affordable (`price × qty ≤ balance`). Nothing is allocated while the auction is open. When the
admin closes it, bids are ranked **highest price first, earliest time breaking ties**, and shares are handed
out down the list until supply runs out. Each winner **pays their own bid price** (pay-as-bid). A bid may be
**partially filled**.

### Pseudocode (matches the code)

```
BEGIN
  a = UPDATE auction SET status='closed' WHERE id=:id AND status='open' RETURNING *   -- else ROLLBACK, 400
  remaining = (stock) stock.available_shares  |  (ipo) ipo.total_shares ; mark ipo closed
  bids = SELECT * FROM bid WHERE auction_id=:id ORDER BY bid_price DESC, bid_time ASC
  if IPO: clearing = (bids empty ? a.base_price : bids.last.bid_price)         -- the LOWEST bid
          stock_row = UPSERT stock(company, total=pool, available=0, base_price=clearing)
  rank = 1
  for bid in bids:
      if remaining <= 0: break
      balance    = SELECT balance FROM user WHERE id = bid.user_id             -- re-read each time
      affordable = floor(balance / bid.price)
      alloc      = min(bid.quantity, remaining, affordable)
      if alloc <= 0: continue                                                  -- skip, don't block
      INSERT bid_ranking(auction, bid, rank, alloc)
      INSERT transaction(user, auction, alloc, bid.price, alloc*bid.price)
      UPSERT portfolio(user, stock, alloc, bid.price)   -- weighted-average merge
      UPDATE user SET balance = balance - alloc*bid.price
      remaining -= alloc ; rank += 1
  UPDATE stock SET available_shares = remaining                                 -- both stock & IPO rows
COMMIT   -- any exception ⇒ ROLLBACK
```

### ✅ Worked example (real run, seed data + one extra bid)

QuantumPay IPO, pool = 1,000,000 shares. Bids after rajesh adds ₹713 × 100:

| Rank | Bidder | Price | Requested | Balance before | ⌊balance/price⌋ | **Allocated** | Pays (own price) |
|------|--------|-------|-----------|----------------|-----------------|---------------|------------------|
| 1 | rajesh | 713 | 100 | 15,00,000 | 2,103 | **100** | ₹71,300 |
| 2 | priya | 712.50 | 5,000 | 20,00,000 | 2,807 | **2,807** | ₹19,99,987.50 |
| 3 | amit | 680 | 2,500 | 12,00,000 | 1,764 | **1,764** | ₹11,99,520 |
| 4 | rajesh | 645 | 1,000 | 14,28,700 *(already debited 71,300)* | 2,215 | **1,000** | ₹6,45,000 |

Remaining = 1,000,000 − 5,671 = **994,329** → written to the new `stock` row (base price = clearing price **₹645**,
the lowest bid). Note priya and amit were **capped by their balance**, not by supply; and rajesh's second
bid saw his balance *already reduced* by his first win (read-your-own-writes inside the transaction).

### Why this algorithm?

| Property | Why it matters |
|----------|----------------|
| **Greedy by price** | With divisible quantities (partial fills allowed) the problem is a **fractional knapsack**: items = bids, value-per-unit = price, capacity = shares. Taking the highest price per share first is **provably optimal for seller revenue** — no cleverer ordering can raise Σ qty×price. |
| **Time as tie-break (FIFO)** | Deterministic and fair: among equal prices the earliest bid wins. Determinism matters because the result is financial. |
| **Pay-as-bid** | Simple to explain and implement: the price on your bid *is* what you pay; the `transaction` row just records it. |
| **Skip-don't-block on affordability** | A bidder who can't afford their bid is skipped, so the next bidder still wins. Otherwise one over-bid whale could blank the whole auction. |
| **One transaction** | Rankings, receipts, holdings, balances and stock inventory change together or not at all (see §5). |
| **O(n log n)** | DB sort (`ORDER BY`) + a single pass. For n bids the loop runs n iterations (5 queries each ⇒ O(n) round-trips — fine at this scale, batchable later). |

### Why NOT the alternatives?

| Alternative | What it is | Why not chosen / trade-off |
|-------------|-----------|----------------------------|
| **Uniform-price (single clearing price)** | Everyone who wins pays the *same* price — the lowest winning bid (used by many real IPO book-builds, e.g. a single "cut-off price", and by some treasury auctions) | Arguably fairer and reduces bid-shading, **but** needs a second pass to find the cut-off, then re-price every winner and re-compute affordability at the new price. The project's "bid price = what you pay" model is simpler and was easier to show in the audit log. *It's the most likely follow-up question — see Q&A.* |
| **Pro-rata (proportional) allocation** | Oversubscribed → everyone gets the same % of what they asked for | Ignores price, so it isn't an *auction*; no price discovery. Closer to how oversubscribed retail IPO categories are often handled in practice. |
| **Lottery / ballot** | Random draw among bidders | Used for oversubscribed retail IPO applications; but it deliberately ignores bid price → no competitive pricing; non-deterministic (hard to audit/test). |
| **First-come-first-served** | Earliest bid wins | Ignores price entirely; rewards speed/bots. |
| **Second-price (Vickrey) / VCG** | Winners pay the price of the next-best bid; incentive-compatible (truthful bidding) | Elegant for single items; the multi-unit generalisation (VCG) is complex to compute and explain, and hard for users to understand. |
| **All-or-nothing bids (combinatorial)** | Bid must be filled entirely or not at all | Turns allocation into a 0/1 knapsack — **NP-hard** in general; unnecessary since partial fills are allowed. |
| **Dutch (descending-price) auction** | Price falls until demand = supply | Different mechanism; no bid book to rank, doesn't fit the "bid ladder" UI. |

### The ₹0.50 minimum increment changes the picture (insight to volunteer)

Because **every new bid must be ≥ current highest + 0.50**, bid prices in an auction are strictly increasing
over time: the newest bid is always the highest. Two consequences:

1. **The time tie-break is practically unreachable through the API** — no two bids share a price. It still matters as a deterministic safety net, and for rows inserted by SQL (the seed) or if the bid race in §3 lets two equal prices through.
2. **"Outbid" ≠ "lost".** An earlier, lower bid is labelled `outbid` in the UI but **still receives shares at close if supply is not exhausted** (in the example above all four bids won). Only price-ranked supply exhaustion or affordability eliminates a bid.

So the system is really an **ascending (English-style) bidding phase** feeding a **multi-unit, pay-as-bid allocation** at close.

### Caveats (know these)

- **Clearing price is the lowest *bid*, not the lowest *winning* bid.** Code: `bidsResult.rows[length-1].bid_price` (`server.js:405-407`). If supply runs out before the last bid, or the last bidder is skipped as unaffordable, the "clearing price" still equals that last bid's price. The README says "price at which the last share was allocated" — the code doesn't do that exactly. In the verified example they coincide (₹645).
- **Clearing price only sets the new `stock.base_price`.** It does **not** change what winners paid (pay-as-bid).
- **No price-band enforcement.** `price_band_min/max` are stored and displayed but `POST /bids` never checks a bid is inside the band.
- **Float maths in JS:** `totalCost = alloc * bid.bid_price` is computed in JavaScript floats and then stored into `DECIMAL(15,2)` (rounded on store). Harmless at 2 dp here; safer to compute the cost in SQL (`alloc * price`) as exact `NUMERIC`.
- **No escrow:** balances are checked at bid time and capped at close, but funds aren't reserved, so many open bids can collectively exceed a balance — the cap at close is the safety net.
- **Per-bid balance query** inside the loop is O(n) round-trips; a `JOIN` + in-memory balance map would batch it (must keep read-your-own-writes for repeat bidders).

---

## 2. Weighted-average cost basis (portfolio upsert)

**Code:** `server.js:441-447`.

```sql
INSERT INTO portfolio (user_id, stock_id, quantity_owned, avg_price) VALUES ($1,$2,$3,$4)
ON CONFLICT (user_id, stock_id) DO UPDATE SET
  quantity_owned = portfolio.quantity_owned + EXCLUDED.quantity_owned,
  avg_price = ((portfolio.avg_price * portfolio.quantity_owned) + (EXCLUDED.avg_price * EXCLUDED.quantity_owned))
              / (portfolio.quantity_owned + EXCLUDED.quantity_owned)
```

`new_avg = (old_qty × old_avg + new_qty × new_price) / (old_qty + new_qty)`.

✅ Verified: rajesh won 100 @ ₹713 then 1000 @ ₹645 → qty 1,100, avg = (71,300 + 645,000)/1,100 = **₹651.18**.

- **Why UPSERT:** one atomic statement handles "first purchase" and "additional purchase"; the `UNIQUE(user_id, stock_id)` constraint is what makes `ON CONFLICT` possible. No separate `SELECT` then `INSERT/UPDATE` (which would race).
- **Why average cost:** the standard blended cost basis shown by brokers; O(1) to maintain.
- **Alternatives:** FIFO/LIFO **tax lots** (one row per purchase, needs a `lots` table and sell logic) — more accurate for realised P&L but the app has no sell flow, so it's unnecessary.
- **Note:** inside `DO UPDATE`, `portfolio.avg_price`/`quantity_owned` are the *old* row values (SET expressions all read the pre-update row), so the formula correctly uses old qty in both places.

---

## 3. Atomic guarded bid insert (TOCTOU fix)

**Code:** `server.js:598-609`.

```sql
INSERT INTO bid (auction_id, user_id, bid_price, quantity)
SELECT $1, $2, $3, $4
WHERE $3 >= COALESCE((SELECT MAX(bid_price) FROM bid WHERE auction_id = $1), $5) + 0.50
RETURNING bid_id
```

**What it is for:** the earlier checks (`SELECT MAX` in JS, then insert) are *time-of-check ≠ time-of-use*:
another bid can land in between. Folding the price check into the `INSERT … SELECT … WHERE` removes the gap
between the JS check and the insert; 0 rows returned ⇒ HTTP 409 "Another bid was placed first".

### ⚠️ The honest truth — it narrows the race, it does **not** close it (✅ verified)

The README/WALKTHROUGH say the database "settles the race". That is **overstated**. Under PostgreSQL's default
**READ COMMITTED** isolation, each statement works from a snapshot taken when it starts. Two concurrent
`INSERT … SELECT … WHERE` statements both compute `MAX(bid_price)` before either has committed, both pass the
`WHERE`, and **both insert**.

I tested it: 15 concurrent same-price bidders × 30 rounds directly against the guarded statement →
**more than one insert succeeded in 29 of 30 rounds (worst case 15 of 15).** Through the HTTP API the earlier
JS pre-checks + timing made it harder to hit (a 3-way concurrent test returned `200, 400, 400`), but the SQL
guard alone is not a lock.

**Impact:** two bids at identical prices can exist. Allocation is still **deterministic** because the sort
`ORDER BY bid_price DESC, bid_time ASC` uses time as the tie-break — so no corruption, just a violated
"strictly increasing" invariant.

**Correct fixes (any one):**

| Fix | How | Notes |
|-----|-----|-------|
| **Row lock** ✅ verified | `BEGIN; SELECT 1 FROM auction WHERE auction_id=$1 FOR UPDATE; <guarded INSERT>; COMMIT;` | Serialises bidders per auction. **Tested: 0/30 racy rounds, exactly one winner each round** |
| Advisory lock | `pg_advisory_xact_lock(auction_id)` at the start of the transaction | Same effect without touching the row |
| SERIALIZABLE isolation | `BEGIN ISOLATION LEVEL SERIALIZABLE` + retry on `40001` | Strongest; needs retry logic |
| DB constraint | `UNIQUE (auction_id, bid_price)` | Rejects exact-price ties at the DB (`23505`) — but doesn't enforce the +0.50 rule |

**How to say it in an interview:** *"I reduced the TOCTOU window with a guarded insert, but I later realised
that under READ COMMITTED that's not a full lock — the proper fix is to take a `FOR UPDATE` lock on the
auction row, which I tested. Allocation stays deterministic regardless because of the time tie-break."*

---

## 4. State machine via conditional UPDATE

**Code:** open `server.js:472-475`; close `server.js:376-379`.

```sql
UPDATE auction SET status = 'open'   WHERE auction_id = $1 AND status = 'upcoming' RETURNING auction_id;
UPDATE auction SET status = 'closed' WHERE auction_id = $1 AND status = 'open'     RETURNING *;
```

The previous state is part of the `WHERE`, so illegal transitions change 0 rows → the API replies 400. For
**close** it doubles as a **lock**: the `UPDATE` takes a row lock; a concurrent second close **blocks until the
first transaction commits, then re-evaluates the `WHERE`** (now `status='closed'`) and updates 0 rows.

✅ **Verified:** 5 simultaneous close requests → exactly one `200` and four `400`; the `transaction` table
shows a single allocation, not five. (Unlike the bid guard, this one *is* race-safe because it's a row-level
`UPDATE` — it conflicts on the same row.)

- **Why this vs `SELECT … FOR UPDATE` then check in JS:** one statement, no extra round-trip, and impossible to forget the check.
- **Why this vs an application mutex:** a mutex wouldn't work across multiple Node processes; the row lock lives in the database.

---

## 5. ACID transactions

Used in exactly two handlers, both via a dedicated `client = await pool.connect()`:

| Handler | Statements grouped | Why |
|---------|--------------------|-----|
| `POST /api/auctions` | company upsert → stock/ipo → auction | No orphan company/stock if a later insert fails (Fix #3) |
| `PATCH /api/auctions/:id/close` | status flip, ranking, receipts, portfolio, balance, stock | All-or-nothing allocation |

| Letter | In this project |
|--------|-----------------|
| **A**tomicity | `catch → ROLLBACK`: a failure on the 3rd bidder undoes the 1st and 2nd |
| **C**onsistency | `CHECK (balance >= 0)`, FKs, UNIQUE keep the DB valid even mid-bug |
| **I**solation | READ COMMITTED (default); the close's own balance reads see its earlier writes |
| **D**urability | Postgres WAL — committed allocations survive a crash |

Pattern: `BEGIN … COMMIT`, `catch → ROLLBACK`, **`finally → client.release()`** (without release the 10-connection
pool would leak and eventually hang). `pool.query` can't be used for a transaction because each call may use a
different connection.

---

## 6. Authentication: bcrypt + JWT

### bcrypt (cost 10)
- `bcrypt.hash(password, 10)` → salted hash (salt embedded in the output). Cost 10 = 2¹⁰ = 1,024 rounds; slow on purpose so brute force is expensive. `bcrypt.compare` re-hashes with the stored salt and compares.
- **Why not SHA-256/MD5:** they're *fast*, which helps attackers; bcrypt is adaptive. **Why not argon2:** also excellent (memory-hard, newer) — bcrypt is the widely-supported, simple choice; argon2 would be the upgrade.
- **Why `bcryptjs`:** pure JS, no native compile; slower than native `bcrypt` but irrelevant here.

### JWT (HS256, 24 h)
- Payload: `{ user_id, name, email, username, role, iat, exp }`. Signed with `JWT_SECRET`; `jwt.verify` checks signature and expiry. Stateless: no server session store.
- **Trade-offs:** can't revoke before expiry; role is baked in until re-login; the default fallback secret (`"auction_secret"`) is insecure — hence the boot warning; storing in `localStorage` exposes it to XSS (httpOnly cookie is the hardened option).
- **Uniform error** `"Invalid credentials"` for both wrong password and unknown user prevents username enumeration by message. (✅ verified identical.) Minor residual leak: an unknown username returns *before* a bcrypt compare, so it's measurably faster — a timing side channel.
- **Role can't be self-assigned:** register hard-codes `'investor'`. ✅ verified: sending `role: "admin"` in the body still yields an investor.

---

## 7. Live updates: polling + Page Visibility API

`setInterval(load, 3000)`; on `visibilitychange`: hidden → `clearInterval`, visible → load immediately + restart. The
`useEffect` cleanup removes the listener and timer.

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Polling (chosen)** | Simplest; stateless server; self-healing | ≤3 s latency; N users ⇒ N req / 3 s | OK for a demo-scale app |
| **Server-Sent Events** | One-way push, simple, auto-reconnect | Needs long-lived connections | Good upgrade for read-only ladders |
| **WebSockets / socket.io** | Sub-second, bidirectional | Stateful, sticky sessions/scaling concerns | The README's stated future scope |

Rough load maths if asked: 100 open tabs ≈ 33 req/s on `GET /auctions`, each running correlated subqueries per auction.

---

## 8. Small client-side algorithms

| Item | Technique | Why |
|------|-----------|-----|
| **Timer** | Recomputes `⌊(endTime − Date.now())/1000⌋` **every tick** instead of decrementing a counter | Counters drift (throttled background tabs, slow ticks); recomputing from an absolute timestamp is always correct |
| **Quick-fill prices** | `minBid`, `highest×1.01`, `highest×1.05`, memoised with `useMemo` | Fast bidding UX without re-computing on every keystroke |
| **Auctions list** | filter (search ∩ status) → sort by chosen key, in memory | Dataset is tiny; avoids extra API round-trips |
| **Home "Top Active"** | filter open+bids → sort by highest bid → slice(5) | O(n log n) over a small list |
| **Bidder masking** | `name[0] + "*"…` (≤3) | Cosmetic privacy only — the API returns real usernames (✅ verified) |
| **Landing chart** | Cubic Bézier path through midpoints; `strokeDashoffset` animation; `IntersectionObserver` triggers candles/counters | Pure decoration with fake data — not an algorithmic claim |
