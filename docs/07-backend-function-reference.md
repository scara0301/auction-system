# 07 — Backend Function Reference (`auction-backend/server.js`)

Every function/route in the backend. For each: **what it does → input → what it calls → tables touched →
output → errors → why it's written that way.** Line numbers refer to `server.js`.

Legend: **R** = reads, **W** = writes. 🔒 = needs a valid JWT. 👑 = also needs `role === 'admin'`.

## Quick index

| # | Route / function | Lines | Auth | Tables |
|---|------------------|-------|------|--------|
| – | `authMiddleware` | 29-40 | – | – |
| – | `adminOnly` | 42-45 | – | – |
| 1 | `POST /api/auth/register` | 49-80 | public | user W |
| 2 | `POST /api/auth/login` | 82-100 | public | user R |
| 3 | `GET /api/auth/me` | 105-118 | 🔒 | user R |
| 4 | `PATCH /api/auth/me` | 122-167 | 🔒 | user R/W |
| 5 | `DELETE /api/auth/me` | 172-194 | 🔒 | user W (+cascade) |
| 6 | `GET /api/auctions` | 198-251 | public | auction, stock, ipo, company, bid, bid_ranking, user R |
| 7 | `GET /api/auctions/:id` | 253-297 | public | same, one row |
| 8 | `POST /api/auctions` | 299-367 | 👑 | company, stock/ipo, auction W (txn) |
| 9 | `PATCH /api/auctions/:id/close` | 370-467 | 👑 | 8 tables (txn) |
| 10 | `PATCH /api/auctions/:id/open` | 470-482 | 👑 | auction W |
| 11 | `GET /api/bids/all` | 487-513 | 👑 | bid, user R |
| 12 | `GET /api/bids?auctionId=` | 515-541 | 🔒 | bid, user R |
| 13 | `POST /api/bids` | 543-615 | 🔒 | auction, bid, stock/ipo, user R; bid W |
| 14 | `GET /api/portfolio` | 619-654 | 🔒 | portfolio, stock, company, transaction, auction, ipo R |
| 15 | `GET /api/transactions` | 658-676 | 🔒 | transaction, auction, stock, ipo, company R |
| 16 | `GET /api/watchlist` | 680-694 | 🔒 | watchlist, stock, company R |
| 17 | `POST /api/watchlist` | 696-707 | 🔒 | watchlist W |
| 18 | `DELETE /api/watchlist/:stockId` | 709-717 | 🔒 | watchlist W |
| – | `app.listen` | 721-723 | – | – |

---

## Setup & middleware

### Boot section (lines 1-26)
- Loads `.env` via `dotenv`, builds the Express app.
- `app.use(cors({ origin: ALLOWED_ORIGIN || "http://localhost:3000" }))` — only the SPA origin may call from a browser.
- `app.use(express.json({ limit: "100kb" }))` — parses JSON bodies; rejects bigger ones.
- `JWT_SECRET = env || "auction_secret"`; prints a `[WARN]` if the env var is missing.
- `new Pool({ host, user, password, database, port, max: 10 })` — **connection pool** (reuse connections; at most 10).
- **Why:** configuration via environment keeps secrets out of code; a pool avoids the cost of opening a TCP+auth connection per request.

### `authMiddleware(req, res, next)` — lines 29-40
- **Input:** `Authorization: Bearer <token>` header.
- **Does:** no header → `401 {error:"No token provided"}`. `jwt.verify(token, JWT_SECRET)` → on success sets `req.user = decoded` and calls `next()`; on any failure (bad signature, expired, malformed) → `401 {error:"Invalid or expired token"}`.
- **Calls:** `jwt.verify`. No DB.
- **Output:** either continues the chain or a 401.
- **Why:** stateless identity — every protected handler can trust `req.user.user_id` and `req.user.role` without a DB lookup. Handlers never take a user id from the URL/body, which blocks "view someone else's portfolio" (IDOR) bugs.
- ✅ Verified messages: no token → `No token provided`; garbage token → `Invalid or expired token`.

### `adminOnly(req, res, next)` — lines 42-45
- **Does:** `req.user.role !== "admin"` → `403 {error:"Admin access required"}`; else `next()`. Always placed *after* `authMiddleware`.
- **Why:** role-based access control. ✅ Verified: an investor calling `POST /api/auctions` gets 403.

---

## Auth & account

### 1. `POST /api/auth/register` — lines 49-80
- **Input (body):** `{ name, email, username, password }` (extra fields such as `role` are ignored).
- **Validation:** all four required (trimmed); `password.length >= 6`; `username` 3–50 chars; email matches `/\S+@\S+\.\S+/`.
- **Calls:** `bcrypt.hash(password, 10)` → `INSERT INTO "user" (name,email,username,password,role) VALUES (…,'investor') RETURNING user_id` → `jwt.sign(user, JWT_SECRET, {expiresIn:"24h"})`.
- **Tables:** `user` W (balance takes the column default ₹10,00,000).
- **Output:** `200 { user:{user_id,name,email,username,role}, token }`.
- **Errors:** `400` validation messages; `400 "Username or email already exists"` on Postgres error `23505` (UNIQUE violation); `500` otherwise.
- **Why:** role is **hard-coded** to `'investor'` (✅ verified: posting `role:"admin"` still yields investor). Uniqueness is enforced by the DB, not by a racy "check then insert". Password is hashed before it ever touches the DB.

### 2. `POST /api/auth/login` — lines 82-100
- **Input:** `{ username, password }`.
- **Calls:** `SELECT * FROM "user" WHERE username=$1` → `bcrypt.compare` → `jwt.sign(payload)`.
- **Tables:** `user` R.
- **Output:** `200 { user:{user_id,name,email,username,role}, token }` (the password hash is **not** returned).
- **Errors:** `400` missing fields; `401 "Invalid credentials"` for unknown user *and* wrong password (same message ✅ verified).
- **Why:** identical message avoids telling attackers which usernames exist.

### 3. `GET /api/auth/me` 🔒 — lines 105-118
- **Input:** JWT only.
- **Calls:** `SELECT user_id,name,email,username,role,balance,created_at FROM "user" WHERE user_id=$1`.
- **Output:** `200 { …fields, balance: <number> }` (`parseFloat(u.balance)` because `DECIMAL` arrives as a string).
- **Errors:** `404 "User not found"` (e.g. deleted user with a still-valid token).
- **Why:** the JWT intentionally doesn't carry `balance` (it changes constantly), so the Settings page fetches it live.

### 4. `PATCH /api/auth/me` 🔒 — lines 122-167
- **Input:** `{ name, email, username, currentPassword?, newPassword? }`.
- **Validation:** name/email/username required; email regex; username 3–50; if `newPassword`: ≥ 6 chars **and** `currentPassword` must `bcrypt.compare` against the stored hash.
- **Calls:** builds params dynamically — `params=[name,email,username]`, optionally `passwordClause = ", password = $4"` + hashed password; then `UPDATE "user" SET name=$1,email=$2,username=$3{passwordClause} WHERE user_id=$n RETURNING user_id,name,email,username,role` → `jwt.sign(row)`.
- **Tables:** `user` R (current hash) / W.
- **Output:** `200 { user, token }` — a **fresh token**, because the old one embeds the old name/email/username.
- **Errors:** `400` validation; `400 "Current password is incorrect"` ✅; `400 "Username or email already taken"` (`23505`).
- **Why:** one endpoint for both profile edit and password change; you can't change a password without proving you know the old one. `${passwordClause}`/`$${idx}` interpolate only *placeholder numbers* — user data stays parameterised.

### 5. `DELETE /api/auth/me` 🔒 — lines 172-194
- **Input:** JWT only (the id comes from the token, never the URL).
- **Calls:** if `role==='admin'`: `SELECT COUNT(*) FROM "user" WHERE role='admin'` → refuse if ≤ 1; then `DELETE FROM "user" WHERE user_id=$1 RETURNING user_id`.
- **Tables:** `user` W; **cascades** to `bid`, `bid_ranking` (via bid), `portfolio`, `"transaction"`, `watchlist`.
- **Output:** `200 {message:"Account deleted"}`.
- **Errors:** `400 "Cannot delete the last admin account…"` ✅ verified; `404`.
- **Why:** *last-admin guard* prevents locking the system out. Hard delete (rather than soft-delete) was chosen to demonstrate `ON DELETE CASCADE`; ✅ verified side-effect: deleting a winner erases their audit history and doesn't refund `stock.available_shares`.

---

## Auctions

### 6. `GET /api/auctions` — lines 198-251 (public)
- **Input (query, optional):** `?type=stock|ipo`, `?status=open|upcoming|closed`.
- **Calls:** one big `SELECT` with the **polymorphic join** (stock/ipo/company) plus correlated subqueries for `current_highest_bid`, `highest_bidder`, `bid_count`, and `remaining_shares` (IPO = `total_shares − SUM(bid_ranking.allocated_quantity)`). Filters are appended as `$n` placeholders; `ORDER BY a.start_time DESC`.
- **Tables:** `auction`, `stock`, `ipo`, `company`, `bid`, `user`, `bid_ranking` — all R.
- **Output:** array of
  ```json
  { "id":3, "company":"QuantumPay Financial", "ticker":"QPFL", "sector":"Fintech", "description":"…",
    "totalShares":1000000, "remainingShares":1000000, "basePrice":550,
    "currentHighestBid":712.5, "highestBidder":"priya", "startTime":"…", "endTime":"…",
    "status":"open", "type":"ipo", "logo":"Q", "bidCount":3, "priceBand":{"min":550,"max":750} }
  ```
  (`priceBand` is `null` for stock auctions; no `referenceId` field — see the watchlist bug in doc 11.)
- **Why:** the response is reshaped to camelCase and `parseFloat`-ed so the frontend gets numbers, not DECIMAL strings. `currentHighestBid` falls back to `basePrice` when there are no bids.
- **Cost note:** 3 correlated subqueries per auction row, polled every 3 s by every open page — fine for 6 rows; would need pre-aggregation/caching at scale.

### 7. `GET /api/auctions/:id` — lines 253-297 (public)
- Same SQL minus `bid_count`, filtered by `WHERE a.auction_id=$1`.
- **Output:** one object (same shape, no `bidCount`); `404 "Auction not found"`.
- **Why separate from the list:** the detail page polls only the one auction it shows.
- **Smell to admit:** the ~30-line SELECT is copy-pasted from the list handler.

### 8. `POST /api/auctions` 👑 — lines 299-367
- **Input:** `{ type, company, ticker, sector?, description?, totalShares, basePrice, startTime, endTime, priceBandMin?, priceBandMax? }`.
- **Validation:** required fields; `type ∈ {stock, ipo}`; `basePrice > 0`; `totalShares ≥ 1`; `startTime < endTime`.
- **Calls (all on one `client` inside `BEGIN … COMMIT`):**
  1. `INSERT INTO company … ON CONFLICT (ticker) DO UPDATE SET company_name, sector, description RETURNING company_id` (ticker uppercased, `logo_letter` = first letter).
  2. `type==='ipo'`: `INSERT INTO ipo (company_id,total_shares,price_band_min,price_band_max,start_date,end_date,status='upcoming') RETURNING ipo_id` — band defaults to `basePrice` … `basePrice×1.2`.
     `type==='stock'`: `INSERT INTO stock … ON CONFLICT (company_id) DO UPDATE SET total_shares, available_shares, base_price RETURNING stock_id`.
  3. `INSERT INTO auction (type, reference_id, start_time, end_time, base_price, status='upcoming') RETURNING auction_id`.
- **Tables:** `company`, `stock` *or* `ipo`, `auction` — W, atomically.
- **Output:** `200 { id, message:"Auction created" }`. Errors `400` (validation), `500` + `ROLLBACK`.
- **Why:** three dependent inserts in one transaction ⇒ no orphan company rows (Fix #3). `ON CONFLICT` makes re-listing an existing company idempotent.
- **Caveats:** re-creating a **stock** auction for an existing company *overwrites* `total_shares` and **resets `available_shares`** (so it can restore shares previously sold); the Admin form never sends a price band, so IPO bands are always the default 1.0×–1.2×.

### 9. `PATCH /api/auctions/:id/close` 👑 — lines 370-467  ⭐ the core
- **Input:** `:id` in the URL; no body.
- **Calls (one transaction, dedicated `client`):** exactly the pseudocode in [06 §1](06-algorithms-and-why.md#1-share-allocation):
  1. `UPDATE auction SET status='closed' WHERE auction_id=$1 AND status='open' RETURNING *` — 0 rows ⇒ `ROLLBACK`, `400 "Auction not found or already closed"`.
  2. Pool size: stock → `SELECT * FROM stock` (`available_shares`); IPO → `SELECT * FROM ipo` (`total_shares`) **and** `UPDATE ipo SET status='closed'`.
  3. `SELECT * FROM bid WHERE auction_id=$1 ORDER BY bid_price DESC, bid_time ASC`.
  4. IPO only: `SELECT company_id FROM ipo`, compute clearing price (lowest bid, else `base_price`), `INSERT INTO stock … ON CONFLICT (company_id) DO UPDATE SET base_price = EXCLUDED.base_price RETURNING stock_id`.
  5. Loop per bid: `SELECT balance` → `alloc = min(qty, remaining, ⌊balance/price⌋)` → `INSERT bid_ranking` → `INSERT "transaction"` → portfolio UPSERT (weighted avg) → `UPDATE "user" SET balance = balance - cost`.
  6. `UPDATE stock SET available_shares = $remaining WHERE stock_id = $settledStockId`.
- **Tables written:** `auction`, `ipo`, `stock`, `bid_ranking`, `"transaction"`, `portfolio`, `"user"` (7); reads `bid`, `ipo`/`stock`, `user`.
- **Output:** `200 { message:"Auction closed and shares allocated", allocations:<rank−1> }`.
- **Errors:** `400` already closed/not open (✅ verified double-close and 5-way concurrent close); `500` → full `ROLLBACK`.
- **Why:** see doc 06. In short: atomic, fair (price-time), affordability-safe, double-close-proof, preserves leftover IPO supply (Fix #1), handles repeat bidders via read-your-own-writes.
- **Caveats:** doesn't check that `end_time` has passed (admin can close early); clearing price = lowest *bid*; if **no one** is allocated (empty book) `allocations` is `0` and stock/IPO still settle.

### 10. `PATCH /api/auctions/:id/open` 👑 — lines 470-482
- `UPDATE auction SET status='open' WHERE auction_id=$1 AND status='upcoming' RETURNING auction_id`.
- **Output:** `200 {message:"Auction opened"}`; `400 "Auction not found or not in upcoming status"`.
- **Why:** state transition enforced in the `WHERE`. **Note:** doesn't touch `ipo.status` (stays `upcoming` ✅ verified) and doesn't check `start_time`.

---

## Bids

### 11. `GET /api/bids/all` 👑 — lines 487-513
- **Calls:** `SELECT b.bid_id, b.auction_id, b.bid_price, b.quantity, b.bid_time, u.username AS bidder FROM bid b JOIN "user" u … ORDER BY b.auction_id, b.bid_price DESC, b.bid_time ASC`, then groups in JS by `auction_id`.
- **Output:** `{ "<auctionId>": [ {id, auctionId, bidder, price, quantity, time, status:"highest"|"outbid"}, … ], … }` (index 0 of each group = `"highest"`).
- **Why:** **one request** replaces N per-auction requests for the Admin Panel (Fix #12 — avoids the N+1 pattern).

### 12. `GET /api/bids?auctionId=` 🔒 — lines 515-541
- **Input:** `auctionId` query param (required → `400 "auctionId is required"`).
- **Calls:** `SELECT b.*, u.username AS bidder, u.name AS bidder_name FROM bid b JOIN "user" u … WHERE b.auction_id=$1 ORDER BY b.bid_price DESC, b.bid_time ASC`.
- **Output:** array of `{id, auctionId, bidder, bidderName, userId, price, quantity, time, status}`.
- **Why:** this ordering **is** the allocation order, so the bid book the user sees is exactly the order shares will be handed out.
- **Privacy note:** returns real usernames/names/userIds; the frontend's `maskName` is cosmetic (✅ verified).

### 13. `POST /api/bids` 🔒 — lines 543-615  ⭐
- **Input:** `{ auctionId, price, quantity }` — the bidder is `req.user.user_id` (never from the body).
- **Checks, in order (each a 400 unless noted):**
  1. fields present; `price` positive number; `quantity` integer ≥ 1.
  2. `SELECT * FROM auction WHERE auction_id=$1 AND status='open'` → else `"Auction is not open"`.
  3. `currentMax = MAX(bid_price)` (or `auction.base_price`); `minBid = currentMax + 0.50` → else `"Bid must be at least ₹X (₹0.50 above current highest)"`.
  4. Pool: stock → `available_shares`; IPO → `total_shares`; `quantity > pool` → `"Quantity exceeds available shares (N)"`.
  5. `SELECT balance`; `price × quantity > balance` → `"Insufficient balance — bid total ₹… exceeds your balance of ₹…"` ✅ verified.
  6. Guarded insert: `INSERT INTO bid … SELECT … WHERE $3 >= COALESCE(MAX, base) + 0.50 RETURNING bid_id`; 0 rows → **`409`** `"Another bid was placed first — refresh and bid above the new highest."`
- **Tables:** `auction`, `bid`, `stock`/`ipo`, `user` R; `bid` W.
- **Output:** `200 { id, message:"Bid placed successfully" }`.
- **Why:** server-side re-validation of everything (never trust the client). Quantity is checked against the whole pool, *not* pool minus other bids ⇒ **oversubscription is allowed**, which is what makes allocation competitive.
- **Caveats (honest):** (a) the final guard is **not** a lock — concurrent equal-price bids can both insert (✅ verified, [06 §3](06-algorithms-and-why.md#3-atomic-guarded-bid-insert-toctou-fix)); (b) **no check that `now < end_time`** — bids are accepted after the end time while status is `open` ✅ verified; (c) no price-band check; (d) balance isn't escrowed.

---

## Portfolio, transactions, watchlist

### 14. `GET /api/portfolio` 🔒 — lines 619-654
- **Calls:** `SELECT p.*, s.base_price, c.company_name, c.ticker, c.sector, c.logo_letter, (SELECT MIN(t.transaction_date) … polymorphic subquery) AS won_at FROM portfolio p JOIN stock s JOIN company c WHERE p.user_id=$1`.
- **Output:** array of `{ id, company, ticker, sector, logo, quantity, avgPrice, totalInvestment (= qty×avg), currentPrice (= base_price×1.05, simulated), wonAt }`.
- **Why:** identity from JWT; `wonAt` gives the "Acquired on" date by finding the user's earliest transaction for any auction tied to this stock (either a `stock` auction on it, or an `ipo` of the same company).

### 15. `GET /api/transactions` 🔒 — lines 658-676
- **Calls:** `SELECT t.*, c.company_name, c.ticker FROM "transaction" t JOIN auction a LEFT JOIN stock s LEFT JOIN ipo i LEFT JOIN company c ON (s.company_id=c.company_id OR i.company_id=c.company_id) WHERE t.user_id=$1 ORDER BY t.transaction_date DESC`.
- **Output:** raw rows (snake_case, DECIMALs as strings): `transaction_id, user_id, auction_id, quantity, price, total_amount, transaction_date, company_name, ticker`. The page applies `parseFloat`.
- **Why:** read-only audit trail; company name resolved through the polymorphic link.

### 16. `GET /api/watchlist` 🔒 — lines 680-694
- `SELECT w.*, s.base_price, s.total_shares, c.company_name, c.ticker, c.sector, c.logo_letter FROM watchlist w JOIN stock s JOIN company c WHERE w.user_id=$1`.
- **Output:** raw rows incl. `stock_id`. Only entries with a `stock` row can be listed — IPO-only companies can't be watched.

### 17. `POST /api/watchlist` 🔒 — lines 696-707
- **Input:** `{ stockId }` (`400 "stockId is required"` if absent — ✅ this is what the card ★ triggers, see doc 11).
- `INSERT INTO watchlist (user_id, stock_id) VALUES ($1,$2)`; `23505` → `400 "Already in watchlist"`.
- **Output:** `200 {message:"Added to watchlist"}`.
- **Why:** `UNIQUE(user_id, stock_id)` blocks duplicates in the database. An invalid `stockId` hits the FK → falls through to `500`.

### 18. `DELETE /api/watchlist/:stockId` 🔒 — lines 709-717
- `DELETE FROM watchlist WHERE user_id=$1 AND stock_id=$2`; always `200 {message:"Removed from watchlist"}` (idempotent; scoped by the JWT user so you can't delete someone else's row).

### `app.listen(PORT)` — lines 721-723
Starts the HTTP server; logs `Auction backend running on http://localhost:<PORT>`.

---

## Common patterns (say these when asked "how is the backend structured?")

| Pattern | Where |
|---------|-------|
| `try { … } catch (err) { console.error("[route]", err); res.status(500).json({error:"Internal server error"}) }` | every handler — internal details never leak to the client |
| Validate → authorise → query → shape response | all handlers |
| DECIMAL → `parseFloat` before sending | auctions, bids, portfolio, `/me` |
| Parameterised SQL (`$1…`) | all queries |
| Postgres error `23505` ⇒ friendly 400 | register, update profile, watchlist |
| `ON CONFLICT` for idempotent upserts | company, stock, portfolio |
| `BEGIN/COMMIT/ROLLBACK/release` | create auction, close auction |

**HTTP status usage:** the code uses `200` for every success (never `201`), `400` validation/business-rule failures,
`401` unauthenticated, `403` forbidden, `404` missing, `409` bid conflict, `500` unexpected. (The README claims a
`{data, message}` envelope and `201` — the code doesn't do that; responses are plain JSON objects/arrays.)
