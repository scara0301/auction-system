# StockAuction — Guided Tutorial & Showcase

A hands-on tour of the Stock & IPO Auction System. We'll follow real users as they sign up, bid, and win shares — and at every step we'll peek behind the curtain to see **what the app does**, **how it works**, **which tables get updated**, and **the exact SQL query** that runs.

> This is the companion to `README.md`. The README is the formal project report; this file is the friendly walkthrough.

---

## What is this project?

**StockAuction** is a full-stack web app that runs **live auctions for company shares** — both secondary-market **stocks** and brand-new **IPOs**. Investors place competitive bids; when an admin closes an auction, the system runs a fair **price-time-priority allocation** and atomically hands out shares, records transactions, updates portfolios, and debits balances — all inside a single database transaction.

```
┌──────────────┐     HTTP/JSON      ┌──────────────┐     SQL      ┌──────────────┐
│   React UI   │ ◄────────────────► │ Express API  │ ◄──────────► │  PostgreSQL  │
│ (10 pages)   │   Axios + JWT      │ (server.js)  │   pg Pool    │  (10 tables) │
└──────────────┘                    └──────────────┘              └──────────────┘
```

| Layer | Tech | Role |
|-------|------|------|
| Frontend | React + React Router + Axios | 10 pages, 3-second live polling |
| Backend | Node.js + Express | REST API, JWT auth, allocation engine |
| Database | PostgreSQL (via `pg`) | 10 tables, constraints, transactions |

---

## Meet the cast (demo accounts)

| Role | Username | Password | Starting Balance |
|------|----------|----------|------------------|
| 👑 Admin | `admin` | `admin123` | ₹50,00,000 |
| Investor | `rajesh` | `pass123` | ₹15,00,000 |
| Investor | `priya` | `pass123` | ₹20,00,000 |
| Investor | `amit` | `pass123` | ₹12,00,000 |

We'll mostly follow **Rajesh** (an investor) and **the Admin**.

---

## The 10 tables at a glance

| Table | Holds | Updated when… |
|-------|-------|---------------|
| `user` | accounts + balances | register, profile/password edit, balance debited on allocation, account delete |
| `company` | listed company info | admin creates an auction |
| `stock` | secondary-market share inventory | auction created/closed |
| `ipo` | IPO offering windows | IPO created / closed |
| `auction` | the auction event + state | created, opened, closed |
| `bid` | every bid placed | investor places a bid |
| `bid_ranking` | who won what, in rank order | auction close (allocation) |
| `portfolio` | each investor's holdings | auction close (allocation) |
| `transaction` | immutable audit log of allocations | auction close (allocation) |
| `watchlist` | stocks an investor follows | add/remove watchlist |

Keep this table handy — each chapter below tells you exactly which of these rows change.

---

# Part 1 — The Investor Journey

## Chapter 1 · Creating an account

**What you do:** Rajesh opens `/register`, fills in name, username, email, password, and clicks **Create Account**.

**How it works:** The browser sends the form to `POST /api/auth/register`. The server validates the input, hashes the password with **bcrypt** (so the plaintext is never stored), inserts the new user, then signs a **JWT** (a tamper-proof login token) and returns it.

**🗂 Tables updated:** `user` (one new row)

**The query:**
```sql
INSERT INTO "user" (name, email, username, password, role)
VALUES ($1, $2, $3, $4, 'investor')
RETURNING user_id;
```

**Notice:**
- `role` is **hard-coded to `'investor'`** — you can't sign up as an admin even if you tamper with the request. 🔒
- `email` and `username` are `UNIQUE`. If someone grabs the name first, PostgreSQL rejects the duplicate (error `23505`), and the API replies *"Username or email already exists."* The **database** guarantees uniqueness, not just the app.
- `RETURNING user_id` hands back the new auto-generated ID in the same round-trip.

---

## Chapter 2 · Logging in

**What you do:** Rajesh enters his username + password on `/login`.

**How it works:** `POST /api/auth/login` looks up the user, then uses `bcrypt.compare` to check the password against the stored hash. On success it issues a fresh 24-hour JWT, which the frontend stores and attaches to every future request as `Authorization: Bearer <token>`.

**🗂 Tables updated:** none (read-only)

**The query:**
```sql
SELECT * FROM "user" WHERE username = $1;
```
Then in code: `bcrypt.compare(password, user.password)`.

**Notice:** Whether the username is missing *or* the password is wrong, the reply is the same generic *"Invalid credentials"* — this stops attackers from discovering which usernames exist. 🔒

---

## Chapter 3 · Exploring the market

**What you do:** After login, Rajesh lands on the **Market Overview** (`/`) and the **Auctions** page — grids of live auction cards showing the current top bid, shares remaining, and a countdown.

**How it works:** `GET /api/auctions` runs one rich query that stitches together the auction, its underlying stock *or* IPO, the company, and live bid statistics. This is the trickiest read in the app because an auction points to **either** a stock **or** an IPO (a *polymorphic* link), so we join both and pick the right side with `CASE`.

**🗂 Tables read:** `auction` + `stock` + `ipo` + `company` + `bid` (no writes)

**The query (simplified):**
```sql
SELECT a.*, c.company_name, c.ticker, c.sector,
  CASE WHEN a.type = 'stock' THEN s.total_shares ELSE i.total_shares END AS total_shares,
  (SELECT MAX(b.bid_price) FROM bid b WHERE b.auction_id = a.auction_id) AS current_highest_bid,
  (SELECT COUNT(*)         FROM bid b WHERE b.auction_id = a.auction_id) AS bid_count
FROM auction a
LEFT JOIN stock   s ON a.type = 'stock' AND a.reference_id = s.stock_id
LEFT JOIN ipo     i ON a.type = 'ipo'   AND a.reference_id = i.ipo_id
LEFT JOIN company c ON (a.type = 'stock' AND s.company_id = c.company_id)
                    OR (a.type = 'ipo'   AND i.company_id = c.company_id)
ORDER BY a.start_time DESC;
```

You can also filter — the UI's tabs add `WHERE a.type = $1` or `WHERE a.status = $1`, always as bound parameters (never string-glued) to prevent SQL injection. 🔒

---

## Chapter 4 · Inspecting an auction

**What you do:** Rajesh clicks the **NovaTech** card and opens `/auction/3`. He sees the company details, the **bid book** (a live leaderboard of all bids), a countdown timer, and a **Place Bid** panel.

**How it works:** Two requests fire together: `GET /api/auctions/:id` (the same join as Chapter 3, narrowed to one auction) and `GET /api/bids?auctionId=3` (the bid book). The detail page re-fetches both every 3 seconds, so the leaderboard updates live (polling pauses when the browser tab is hidden).

**🗂 Tables read:** `auction`, `bid`, `user` (no writes)

**The bid-book query:**
```sql
SELECT b.*, u.username AS bidder, u.name AS bidder_name
FROM bid b
JOIN "user" u ON b.user_id = u.user_id
WHERE b.auction_id = $1
ORDER BY b.bid_price DESC, b.bid_time ASC;
```

**Notice:** `ORDER BY bid_price DESC, bid_time ASC` is the golden rule — **highest price wins, earliest bid breaks ties**. The exact order you see in the bid book is the exact order shares will be allocated in later.

---

## Chapter 5 · Placing a bid ⭐

**What you do:** Rajesh bids **₹1,785 per share × 1,000 shares** on NovaTech and clicks **Place Bid**.

**How it works:** `POST /api/bids` runs a careful gauntlet of checks before inserting:

1. **Valid numbers?** price and quantity must be positive.
2. **Auction open?** `SELECT … WHERE auction_id = $1 AND status = 'open'`.
3. **Enough shares?** quantity can't exceed the pool.
4. **Can he afford it?** `price × quantity` must fit inside his `balance`.
5. **High enough?** the bid must beat the current highest by at least ₹0.50 — and this check happens **inside the INSERT itself** so two simultaneous bids can't both sneak past.

**🗂 Tables updated:** `bid` (one new row) — reads `auction`, `stock`/`ipo`, `user` first

**The affordability check:**
```sql
SELECT balance FROM "user" WHERE user_id = $1;
-- rejected in code if  bidPrice * bidQty > balance
```

**The atomic guarded insert:**
```sql
INSERT INTO bid (auction_id, user_id, bid_price, quantity)
SELECT $1, $2, $3, $4
WHERE $3 >= COALESCE((SELECT MAX(bid_price) FROM bid WHERE auction_id = $1), $5) + 0.50
RETURNING bid_id;
```

**Notice:** If two investors both read "highest = ₹1,785" and both try ₹1,785.50 at the same instant, only the *first* INSERT satisfies the `WHERE` against the now-updated max. The second inserts **zero rows** and gets a friendly `409 — "Another bid was placed first, refresh and bid higher."` The database — not the app — settles the race. This is a textbook fix for a **time-of-check/time-of-use** bug. ⚙️

> Bids are **immutable**: once placed, there's no edit or cancel. The bid book is the permanent record of intent.

---

# Part 2 — The Admin Journey 👑

## Chapter 6 · Creating an auction

**What you do:** The Admin opens `/admin`, fills the **Create Auction** form (company, ticker, type, shares, base price, time window), and submits.

**How it works:** `POST /api/auctions` (admin-only) must create up to **three** related rows — a `company`, its `stock` or `ipo`, and the `auction` itself. These must all succeed together, so they run inside a **transaction**. If any step fails, the whole thing rolls back — no orphan company left behind.

**🗂 Tables updated:** `company` + (`stock` *or* `ipo`) + `auction`

**The transaction:**
```sql
BEGIN;

-- 1. Company (insert, or update if the ticker already exists)
INSERT INTO company (company_name, ticker, sector, description, logo_letter)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (ticker) DO UPDATE SET company_name = EXCLUDED.company_name, ...
RETURNING company_id;

-- 2a. For a STOCK auction
INSERT INTO stock (company_id, total_shares, available_shares, base_price)
VALUES ($1, $2, $3, $4)
ON CONFLICT (company_id) DO UPDATE SET total_shares = EXCLUDED.total_shares, ...
RETURNING stock_id;

-- 2b. (or) For an IPO auction
INSERT INTO ipo (company_id, total_shares, price_band_min, price_band_max,
                 start_date, end_date, status)
VALUES ($1, $2, $3, $4, $5, $6, 'upcoming')
RETURNING ipo_id;

-- 3. The auction, pointing at whichever instrument we just made
INSERT INTO auction (type, reference_id, start_time, end_time, base_price, status)
VALUES ($1, $2, $3, $4, $5, 'upcoming')
RETURNING auction_id;

COMMIT;   -- or ROLLBACK if anything above failed
```

**Notice:** `ON CONFLICT … DO UPDATE` is PostgreSQL's atomic **"insert-or-update."** `ON CONFLICT (company_id)` on `stock` enforces the rule **one stock record per company**. The new auction starts in the `upcoming` state — nobody can bid yet.

---

## Chapter 7 · Opening an auction

**What you do:** Admin clicks **Open** on an upcoming auction. Bidding goes live.

**How it works:** `PATCH /api/auctions/:id/open` flips the state — but only from the legal previous state.

**🗂 Tables updated:** `auction` (status → `open`)

**The query:**
```sql
UPDATE auction SET status = 'open'
WHERE auction_id = $1 AND status = 'upcoming'
RETURNING auction_id;
```

**Notice:** The `AND status = 'upcoming'` means an already-open or already-closed auction can't be re-opened — if it's not in the right state, **zero rows change** and the API returns an error. The state machine `UPCOMING → OPEN → CLOSED` is enforced *inside the WHERE clause*.

---

## Chapter 8 · Closing an auction — the allocation engine ⭐⭐⭐

This is the heart of the whole project.

**What you do:** When NovaTech's timer runs out, the Admin clicks **Close Auction**.

**How it works:** `PATCH /api/auctions/:id/close` runs the **entire allocation as one atomic transaction**. It locks the auction, ranks the bids by price-time priority, and for each winner (in order): records their rank, writes a transaction, updates their portfolio, and debits their balance — capping each award at what they can afford and what's left in supply. If *anything* fails, the whole allocation rolls back and nobody gets shares.

**🗂 Tables updated:** `auction`, `ipo` (if IPO), `bid_ranking`, `transaction`, `portfolio`, `user`, `stock` — **seven tables in one transaction**

**Step 1 — Lock & close (prevents double-allocation):**
```sql
UPDATE auction SET status = 'closed'
WHERE auction_id = $1 AND status = 'open'
RETURNING *;
-- zero rows? → already closed → ROLLBACK and stop
```

**Step 2 — Pull bids in winning order:**
```sql
SELECT * FROM bid WHERE auction_id = $1
ORDER BY bid_price DESC, bid_time ASC;
```

**Step 3 — For each bid, in rank order:**
```sql
-- how many can this bidder afford?
SELECT balance FROM "user" WHERE user_id = $bidder;
--   affordable = FLOOR(balance / bid_price)
--   allocated  = MIN(bid.quantity, shares_remaining, affordable)
--   if allocated <= 0 → skip this bidder, move on

-- record the rank + how much they won
INSERT INTO bid_ranking (auction_id, bid_id, rank_position, allocated_quantity)
VALUES ($1, $2, $3, $4);

-- write the immutable receipt
INSERT INTO "transaction" (user_id, auction_id, quantity, price, total_amount)
VALUES ($1, $2, $3, $4, $5);

-- add to their holdings (merge with weighted-average price if they already own it)
INSERT INTO portfolio (user_id, stock_id, quantity_owned, avg_price)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id, stock_id) DO UPDATE SET
  quantity_owned = portfolio.quantity_owned + EXCLUDED.quantity_owned,
  avg_price = ((portfolio.avg_price * portfolio.quantity_owned)
             + (EXCLUDED.avg_price  * EXCLUDED.quantity_owned))
            / (portfolio.quantity_owned + EXCLUDED.quantity_owned);

-- charge their account
UPDATE "user" SET balance = balance - $totalCost WHERE user_id = $bidder;
```

**Step 4 — Save leftover supply:**
```sql
UPDATE stock SET available_shares = $remaining WHERE stock_id = $settledStockId;
```

**Notice — this one transaction shows off most of a DBMS course:**
- **Atomicity (ACID):** all seven tables commit together, or none do. No half-finished auctions, no shares awarded without a matching balance debit.
- **Fairness:** highest price wins first; ties go to whoever bid earliest. A bid can be **partially filled** when supply runs low.
- **Weighted-average merge:** win the same stock twice and you get *one* portfolio row with a blended cost basis (enforced by `UNIQUE(user_id, stock_id)`), not two rows.
- **Read-your-own-writes:** because the balance reads/writes happen inside the transaction, a bidder's *second* win sees the balance already reduced by the *first*.
- **IPO promotion:** closing an IPO also "lists" the company — it creates the company's first `stock` row at the **clearing price** (the lowest winning bid).

---

# Part 3 — Seeing the results

## Chapter 9 · Your portfolio

**What you do:** Rajesh opens `/portfolio` and sees his NovaTech holding with quantity, average price, current value, and profit/loss.

**How it works:** `GET /api/portfolio` joins his holdings to the stock and company for display names, and simulates a "current price" as `base_price × 1.05` so P&L has something to show.

**🗂 Tables read:** `portfolio` + `stock` + `company` (no writes). Identity comes from his **JWT**, so the URL needs no user id. 🔒

**The query (core):**
```sql
SELECT p.*, s.base_price, c.company_name, c.ticker, c.sector, c.logo_letter
FROM portfolio p
JOIN stock   s ON p.stock_id  = s.stock_id
JOIN company c ON s.company_id = c.company_id
WHERE p.user_id = $1;
```

---

## Chapter 10 · Transaction history

**What you do:** Rajesh opens `/transactions` — an audit trail of every allocation he's ever received, with totals.

**How it works:** `GET /api/transactions` reads the immutable `transaction` log and resolves the company name through the polymorphic auction link.

**🗂 Tables read:** `transaction` + `auction` + `stock`/`ipo` + `company` (no writes)

**The query:**
```sql
SELECT t.*, c.company_name, c.ticker
FROM "transaction" t
JOIN auction a ON t.auction_id = a.auction_id
LEFT JOIN stock   s ON a.type = 'stock' AND a.reference_id = s.stock_id
LEFT JOIN ipo     i ON a.type = 'ipo'   AND a.reference_id = i.ipo_id
LEFT JOIN company c ON (s.company_id = c.company_id OR i.company_id = c.company_id)
WHERE t.user_id = $1
ORDER BY t.transaction_date DESC;
```

**Notice:** The system only ever **inserts** into `transaction` (during close) — never updates or deletes. It's the permanent ledger of "what I received and what I paid."

---

## Chapter 11 · Watchlist

**What you do:** Rajesh stars a stock to follow it; later he removes one.

**How it works:** `watchlist` is a simple many-to-many link between `user` and `stock`.

**🗂 Tables updated:** `watchlist`

**The queries:**
```sql
-- add (duplicates blocked by the database)
INSERT INTO watchlist (user_id, stock_id) VALUES ($1, $2);   -- 23505 → "Already in watchlist"

-- remove
DELETE FROM watchlist WHERE user_id = $1 AND stock_id = $2;

-- read (enriched with company info)
SELECT w.*, s.base_price, c.company_name, c.ticker
FROM watchlist w
JOIN stock s   ON w.stock_id = s.stock_id
JOIN company c ON s.company_id = c.company_id
WHERE w.user_id = $1;
```

**Notice:** `UNIQUE(user_id, stock_id)` means you can't star the same stock twice — the database rejects the duplicate.

---

# Part 4 — Managing your account ⚙️

Every logged-in user (investor *or* admin) gets a **Settings** page at `/settings` to manage their own profile. All three endpoints are protected and always act on **the user identified by the JWT** — never an id from the URL or body.

## Chapter 12 · Viewing & updating your profile

**What you do:** Rajesh opens **Settings**, sees his name, username, email, role, live balance, and join date, edits a field, and clicks **Save Changes**.

**How it works:** The page first loads a fresh profile with `GET /api/auth/me` (the JWT doesn't carry the balance, so we read it live). Saving sends `PATCH /api/auth/me`, which updates the row and — because the login token embeds name/email/username — **re-issues a new JWT** so the session stays accurate after a rename.

**🗂 Tables updated:** `user` (one row)

**The read:**
```sql
SELECT user_id, name, email, username, role, balance, created_at
FROM "user" WHERE user_id = $1;
```

**The update:**
```sql
UPDATE "user" SET name = $1, email = $2, username = $3
WHERE user_id = $4
RETURNING user_id, name, email, username, role;
-- server then signs a fresh JWT from the returned row
```

**Notice:** `email` and `username` are still `UNIQUE`, so trying to take a name that's already in use is rejected by the database (`23505` → *"Username or email already taken"*). 🔒

---

## Chapter 13 · Changing your password

**What you do:** In the **Change Password** section, Rajesh enters his current password, a new one, and a confirmation.

**How it works:** The same `PATCH /api/auth/me` endpoint handles it, but when a `newPassword` is present the server **first verifies the current password** with `bcrypt.compare`. Only then does it hash and store the new one. The new password column is appended to the same UPDATE.

**🗂 Tables updated:** `user` (the `password` column)

**The flow:**
```sql
-- 1. verify the current password
SELECT password FROM "user" WHERE user_id = $1;
--    bcrypt.compare(currentPassword, stored)  → must be true

-- 2. update with the freshly bcrypt-hashed new password
UPDATE "user" SET name = $1, email = $2, username = $3, password = $4
WHERE user_id = $5
RETURNING user_id, name, email, username, role;
```

**Notice:** You can never overwrite a password without proving you know the old one. The plaintext is hashed (bcrypt, cost 10) before it ever touches the database. 🔒

---

## Chapter 14 · Deleting your account 🗑️

**What you do:** In the red **Danger Zone**, Rajesh clicks **Delete Account** and confirms in the dialog.

**How it works:** `DELETE /api/auth/me` runs two checks before removing the row:

1. **Last-admin guard** — if the user is an admin, the server counts how many admins exist. If only one remains, the delete is rejected. This prevents the system from being permanently locked out.
2. **Cascade delete** — after the guard passes, a single `DELETE` on `user` fans out through every dependent table via `ON DELETE CASCADE`.

**🗂 Tables updated:** `user` — **and, by cascade,** `bid`, `bid_ranking`, `portfolio`, `transaction`, `watchlist`

**The last-admin guard:**
```sql
-- Only runs when the deleting user is an admin
SELECT COUNT(*) FROM "user" WHERE role = 'admin';
-- if COUNT <= 1  →  400 "Cannot delete the last admin account"
```

**The delete:**
```sql
DELETE FROM "user" WHERE user_id = $1 RETURNING user_id;
```

**What cascades (this is the important part):** every table that references a user was defined with `ON DELETE CASCADE`, so that single delete fans out automatically:

```
DELETE user (user_id = 2)
   │  ON DELETE CASCADE
   ├──► bid          (all of user 2's bids)
   │       │  ON DELETE CASCADE
   │       └──► bid_ranking   (rankings that pointed at those bids — removed transitively)
   ├──► portfolio    (user 2's holdings)
   ├──► transaction  (user 2's allocation history)
   └──► watchlist    (user 2's followed stocks)
```

**Not touched:** `company`, `stock`, `ipo`, `auction` — none reference `user`, so the marketplace itself is unaffected.

**Notice:** This is **referential integrity** in action — the database keeps itself consistent so you can never have an orphaned bid pointing at a user who no longer exists. ⚠️ One trade-off to be aware of: deleting a user who already won shares also erases their `transaction`/`bid_ranking` history, and `stock.available_shares` is **not** refunded. A production system would usually *soft-delete* (mark the account inactive) to preserve the audit ledger; this project hard-deletes to demonstrate cascading behavior clearly.

---

# Cheat-sheet — action → endpoint → tables → operation

| # | Action | Endpoint | Tables written | Key operation |
|---|--------|----------|----------------|---------------|
| 1 | Register | `POST /auth/register` | `user` | INSERT (+ bcrypt, JWT) |
| 2 | Login | `POST /auth/login` | — | SELECT + bcrypt compare |
| 3 | Browse auctions | `GET /auctions` | — | polymorphic JOIN + subqueries |
| 4 | View one auction | `GET /auctions/:id`, `GET /bids` | — | JOIN, price-time ORDER BY |
| 5 | Place a bid | `POST /bids` | `bid` | guarded atomic INSERT + balance check |
| 6 | Create auction | `POST /auctions` | `company`, `stock`/`ipo`, `auction` | transaction + UPSERT |
| 7 | Open auction | `PATCH /auctions/:id/open` | `auction` | guarded state UPDATE |
| 8 | Close auction | `PATCH /auctions/:id/close` | `auction`, `ipo`, `bid_ranking`, `transaction`, `portfolio`, `user`, `stock` | **atomic allocation transaction** |
| 9 | View portfolio | `GET /portfolio` | — | 3-table JOIN |
| 10 | Transaction history | `GET /transactions` | — | polymorphic JOIN |
| 11 | Watchlist add/remove | `POST` / `DELETE /watchlist` | `watchlist` | INSERT / DELETE |
| 12 | View / update profile | `GET` / `PATCH /auth/me` | `user` | SELECT / UPDATE + re-issue JWT |
| 13 | Change password | `PATCH /auth/me` | `user` | bcrypt verify + UPDATE |
| 14 | Delete account | `DELETE /auth/me` | `user` (+ cascade: `bid`, `bid_ranking`, `portfolio`, `transaction`, `watchlist`) | last-admin guard → DELETE + ON DELETE CASCADE |

---

# The big ideas this project demonstrates

| Concept | Where to see it |
|---------|-----------------|
| **ACID transactions** | Chapters 6 & 8 (`BEGIN … COMMIT/ROLLBACK`) |
| **Race-condition safety** | Chapter 5 (guarded bid INSERT), Chapter 8 (close lock) |
| **State machines in SQL** | Chapters 7 & 8 (`WHERE status = '<previous>'`) |
| **UPSERT / weighted averages** | Chapters 6 & 8 (`ON CONFLICT DO UPDATE`) |
| **Polymorphic relationships** | Chapters 3, 8, 10 (`auction.reference_id` + `type`) |
| **Referential integrity** | Foreign keys with `ON DELETE CASCADE` everywhere |
| **Constraints as guardrails** | `UNIQUE`, `CHECK (balance ≥ 0)`, enumerated `status`/`role` |
| **SQL-injection defense** | Every query uses `$1, $2 …` bound parameters |
| **Token-based identity** | "My portfolio/bids" use the JWT's `user_id`, never a URL param |
| **Application-level guards** | Chapter 14 (last-admin check before DELETE) |
| **Live polling with Page Visibility API** | Chapters 3, 4 — polling pauses when the tab is hidden and restarts on focus |
| **Error propagation** | Login/Register surface the exact server validation message, not a generic JS error |

---

*Ready to try it yourself? Follow the setup steps in `README.md`, log in as `rajesh / pass123`, place a bid on a live auction, then log in as `admin / admin123` and close it — watch your shares appear in the Portfolio page.*
