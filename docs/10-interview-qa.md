# 10 — Interview Q&A (150+ questions with model answers)

Answers are written in the first person so you can say them aloud. Every factual claim matches the code and
the verified runs. Where an answer depends on a weakness, it points to [doc 11](11-known-issues-and-honest-answers.md).
**Tip:** keep answers to 20–40 seconds, then let them pull the thread.

**Sections:** [A Intro](#a-introduction--motivation) · [B Architecture](#b-architecture--design) ·
[C Database & modelling](#c-database--data-modelling) · [D SQL](#d-sql--queries) ·
[E Transactions & concurrency](#e-transactions--concurrency) · [F The algorithm](#f-the-allocation-algorithm) ·
[G Security](#g-security--authentication) · [H Backend/API](#h-backend--api-design) ·
[I Frontend](#i-frontend--react) · [J Testing/DevOps/scale](#j-testing-devops--scaling) ·
[K Weaknesses & improvements](#k-weaknesses--improvements) · [L ML & "dataset" questions](#l-ml--dataset--feature-engineering-questions) ·
[M Behavioural](#m-behavioural--wrap-up)

---

## A. Introduction & motivation

**A1. Tell me about your project.**
It's StockAuction, a full-stack app for live auctions of stocks and IPOs. Investors bid; an admin opens and
closes auctions. On close, shares are allocated by price-time priority, capped by remaining supply and each
bidder's balance, all inside one PostgreSQL transaction. Stack: React, Node/Express with raw SQL, PostgreSQL.
(See the 60-second pitch in the README of this folder.)

**A2. Why did you choose this project?**
Auctions are a natural showcase for DBMS ideas: atomic multi-table updates, race conditions between bidders,
referential integrity, derived data like weighted-average cost. It's rich enough to be interesting but small
enough to explain end to end.

**A3. What problem does it solve?**
IPO/stock allocation is usually opaque. This models the whole lifecycle — listing, bidding, price discovery,
allocation, holdings, audit trail — so it's inspectable and teachable.

**A4. Who are the users?**
Investors (self-register, bid, track holdings) and admins (create/open/close auctions, monitor bids). Role is
assigned server-side; nobody can register as admin.

**A5. What was *your* contribution / what's the hardest part you built?**
The close-auction allocation transaction — ranking, affordability caps, receipts, weighted-average portfolio
merge, IPO-to-stock promotion — all atomic. Also the server-side bid validation and the hardening passes
(the "Fix #n" comments).

**A6. What's the scale? How big is it?**
Backend is one 723-line `server.js` with 18 routes; PostgreSQL schema of 10 tables; React frontend with 12
pages and 5 reusable components.

**A7. What's real and what's simulated?**
Real: bids, allocation, balances, portfolio, transactions. Simulated: portfolio "current price" (`base_price × 1.05`),
landing-page charts and login-page stats. There's no market data feed and no real payments.

**A8. What would you demo?**
Login as investor → bid on the QuantumPay IPO → login as admin → close it → show the ranking, per-bidder
allocation (capped by balance), the weighted-average portfolio, and the new `stock` row. Script in
[03-getting-started.md](03-getting-started.md).

**A9. How long did it take / how did it evolve?**
Initial system, then a UI pass, then account settings, watchlist, and a landing page (11 commits). Later hardening
fixed allocation, balance and concurrency issues.

**A10. What technologies did you use and why?** → See [04](04-tech-stack-and-why.md). Short: Postgres for ACID +
constraints, Express for a minimal pipeline, raw SQL because SQL was the learning goal, React for a live UI, JWT
for stateless auth.

---

## B. Architecture & design

**B1. Describe the architecture.**
Three tiers: React SPA → Express REST API → PostgreSQL. The browser is untrusted, so all rules (min bid,
balance, role, state transitions) are enforced on the server and in DB constraints; the frontend repeats some
checks only for UX.

**B2. Walk me through placing a bid, end to end.**
`BidForm` validates locally → `api.placeBid` → axios adds the JWT → `POST /api/bids` → `authMiddleware`
verifies it → server validates numbers, checks the auction is open, checks price ≥ max+0.50, quantity ≤ pool,
price×qty ≤ balance → guarded `INSERT` → `{id, message}`; the form clears and the parent reloads the bid book.

**B3. Walk me through closing an auction.**
Admin clicks Close → confirm → `PATCH /auctions/:id/close` → `authMiddleware` + `adminOnly` → `BEGIN` →
`UPDATE auction SET status='closed' WHERE … status='open'` (0 rows ⇒ already closed) → read the share pool →
fetch bids by price desc, time asc → (IPO) create the stock row at the clearing price → per bid compute
`min(qty, remaining, ⌊balance/price⌋)`, insert ranking + transaction, upsert portfolio, debit balance →
write back unsold shares → `COMMIT`; any error ⇒ `ROLLBACK`.

**B4. Why a single `server.js`?** Speed for a course project; it's grouped in clear sections. In production I'd
split into routers/controllers/services and extract shared SQL.

**B5. Why no ORM?** SQL was the point of the course; raw parameterised SQL makes joins, upserts and
transactions explicit. Trade-off: boilerplate and no migrations/type safety.

**B6. How does the frontend talk to the backend?** All HTTP goes through `services/api.js`, an axios instance
with a request interceptor (attach JWT) and a response interceptor (401 ⇒ clear storage, go to `/login`).

**B7. How do you handle real-time updates?** Polling every 3 s with `setInterval`, paused via the Page
Visibility API when the tab is hidden; effects clean up their timers/listeners.

**B8. Why polling instead of WebSockets?** Simplicity and statelessness; self-healing. Cost: ≤3 s latency and
extra requests. WebSockets/SSE are listed future scope.

**B9. How is configuration managed?** Environment variables via `dotenv` (`DB_*`, `JWT_SECRET`, `PORT`,
`ALLOWED_ORIGIN`; frontend `REACT_APP_API_URL`, `REACT_APP_USE_DUMMY`). `.env` is git-ignored.

**B10. What is "dummy mode"?** `REACT_APP_USE_DUMMY=true` makes `api.js` return in-memory mock data so the UI
runs with no backend — handy for UI demos or as a fallback.

**B11. Is the API RESTful?** Mostly: resources (`/auctions`, `/bids`, `/watchlist`), verbs map to HTTP methods,
JSON, status codes. The state changes `PATCH …/open` and `…/close` are action-style sub-resources — pragmatic,
not purist.

**B12. How do you structure error handling?** Every handler is `try/catch`; business errors return 4xx with
`{error}`; unexpected ones log server-side and return a generic 500 so internals don't leak.

---

## C. Database & data modelling

**C1. Describe your schema.**
10 tables: `user`, `company`, `stock`, `ipo`, `auction`, `bid`, `bid_ranking`, `portfolio`, `transaction`,
`watchlist`, with 12 foreign keys (all `ON DELETE CASCADE`), many CHECK/UNIQUE constraints and 9 indexes.
ER diagram in [05](05-database-and-data-modelling.md).

**C2. What are the relationships?**
company 1—0..1 stock (UNIQUE) and 1—N ipo; user 1—N bid/portfolio/transaction/watchlist; auction 1—N
bid/bid_ranking/transaction; stock 1—N portfolio/watchlist; auction → stock|ipo polymorphically.

**C3. What's a polymorphic association and why did you use it?**
`auction.reference_id` points at `stock.stock_id` or `ipo.ipo_id` depending on `type`. It lets one auction table
and one list query serve both kinds. The cost: no database FK on that column, so integrity is app-enforced. Better
alternatives: two nullable FKs with a CHECK that exactly one is set, or a supertype `instrument` table.

**C4. Is the schema normalised?** 1NF and 2NF yes; 3NF mostly, with deliberate denormalisation: stored
`transaction.total_amount`, maintained `portfolio.avg_price`, `stock.available_shares`, and a duplicate
`ipo.status`. The first three are performance/audit choices maintained transactionally; the last one is
redundant and goes stale (known).

**C5. Why `UNIQUE(company_id)` on `stock`?** To guarantee one share record per company — also what lets
`ON CONFLICT (company_id)` upsert the stock when an IPO closes.

**C6. Why `UNIQUE(user_id, stock_id)` on portfolio and watchlist?** One holding row per investor per stock
(additional wins merge via UPSERT) and duplicate watchlist entries are impossible at the DB level.

**C7. Why DECIMAL for money?** Exact arithmetic; FLOAT introduces rounding errors. (node-pg returns DECIMAL as
strings, hence `parseFloat` in the API layer.)

**C8. Why `TIMESTAMPTZ`?** Time-zone-aware instants; auctions are time-critical and users may be anywhere.

**C9. Why `SERIAL` primary keys?** Simple, compact, stable surrogate keys; natural keys (email, ticker) can change.
(`GENERATED … AS IDENTITY` is the modern equivalent.)

**C10. Why is the table called `"user"` with quotes?** `user` is a reserved word in PostgreSQL; quoting
lets me use it. (Same for `"transaction"`.) Renaming to `users` avoids the quoting.

**C11. What constraints protect data integrity?** `CHECK (balance >= 0)`, positive prices/quantities,
enumerations for `role`/`status`/`type`, UNIQUE on email/username/ticker, FKs. Even a bug in my JS can't make a
balance negative or insert a zero-quantity bid.

**C12. What does `ON DELETE CASCADE` do here, and what's the downside?** Deleting a user removes their bids,
rankings (via bid), portfolio, transactions and watchlist. Downside: it erases the audit ledger and doesn't
return shares to inventory — production would soft-delete.

**C13. Why both `bid_ranking` and `transaction`?** `bid_ranking` is the auction-centric result (rank and
allocated quantity per bid); `transaction` is the user-centric financial receipt (price paid, total, date). They
overlap but serve different consumers. A leaner design could derive one from the other.

**C14. Which indexes did you create and why?** On `bid(auction_id)` (hottest path: bid book and MAX/COUNT,
polled every 3 s), `bid(user_id)`, `auction(status)`, `auction(type)`, per-user indexes on portfolio/transaction/
watchlist, and per-auction on transaction/bid_ranking. Missing ones I'd add: composite `bid(auction_id, bid_price DESC)`
and `auction(type, reference_id)`.

**C15. Would indexes on `status`/`type` help?** With 6 rows, no — the planner would seq-scan. They're for growth;
low-cardinality columns benefit less than selective ones.

**C16. How do you model the IPO → stock transition?** On close, an `INSERT … ON CONFLICT (company_id) DO UPDATE`
creates the company's `stock` row at the clearing price with `available_shares=0`, then the final UPDATE sets
`available_shares` to the unsold remainder.

**C17. Where does the "current highest bid" live?** It's not stored; it's `MAX(bid_price)` over the auction's bids
(falling back to `base_price`). A single source of truth — no counter to keep in sync.

**C18. How is the balance modelled? Is there a ledger?** `user.balance` is a mutable column debited at
allocation; the `transaction` table is an append-only record of each charge. A stricter design would make the
ledger the source of truth and derive the balance.

**C19. How do you seed data and why?** `schema.sql` inserts 4 users, 6 companies, 6 auctions, 15 bids, etc.,
with times relative to `NOW()`. The seed bypasses API validation, which is why e.g. Priya's seeded bid exceeds her
balance — a handy demo of the affordability cap. Re-running the file isn't idempotent.

**C20. How would you evolve the schema safely?** Introduce a migrations tool (node-pg-migrate/Flyway/Prisma Migrate),
add constraints with `NOT VALID` then validate, and add indexes `CONCURRENTLY`.

**C21. What's a junction table? Example?** A table that resolves an M:N relationship. `portfolio` and `watchlist`
link users and stocks; `portfolio` also stores relationship attributes (`quantity_owned`, `avg_price`).

**C22. What is referential integrity and where do you rely on it?** Child rows can't reference non-existent parents
(FKs). Everything except `auction.reference_id`.

---

## D. SQL & queries

**D1. Explain the main list query.** One `SELECT` over `auction` with `LEFT JOIN stock`, `LEFT JOIN ipo`, and
`LEFT JOIN company` where the `ON` clauses include `a.type = '…'` so only the matching side joins; `CASE WHEN a.type…`
picks `total_shares`/`remaining_shares`; correlated subqueries compute highest bid, highest bidder and bid count.

**D2. What is a correlated subquery and what's the cost?** A subquery that references the outer row, re-evaluated per
row. With few auctions it's fine; at scale I'd pre-aggregate with a view/materialised view or `LATERAL` join and
cache.

**D3. What does `COALESCE` do in your code?** Returns the first non-NULL: `COALESCE(SUM(allocated_quantity),0)` so IPOs
with no allocations show 0, and `COALESCE(MAX(bid_price), base_price)` so an auction with no bids uses the base price.

**D4. What is `RETURNING`?** Returns columns from the inserted/updated/deleted row in the same statement, saving a
round-trip: `INSERT … RETURNING user_id`, `UPDATE auction … RETURNING *`.

**D5. What is an UPSERT? Where used?** `INSERT … ON CONFLICT … DO UPDATE`: insert, or update if a unique constraint
conflicts, atomically. Used for company (by ticker), stock (by company_id) and portfolio (by user_id, stock_id).

**D6. Explain the portfolio UPSERT formula.** On conflict:
`quantity = old + new`; `avg = (old_avg·old_qty + new_price·new_qty) / (old_qty + new_qty)`. E.g. 100@713 then
1000@645 → 1100 shares at ₹651.18. (`EXCLUDED` is the row I tried to insert.)

**D7. How do you prevent SQL injection?** Every query is parameterised (`$1…`) so user input is never concatenated.
The only dynamic SQL builds placeholder *numbers* (`$${idx}`), not user text.

**D8. What's the N+1 problem and did you avoid it?** Running one query per item. The admin panel would have needed one
`/bids` request per auction; I added `GET /bids/all` which returns everything grouped in one round-trip (Fix #12).
(The close loop is itself O(n) round-trips — a known optimisation.)

**D9. Why `ORDER BY bid_price DESC, bid_time ASC`?** It's the allocation order: highest price first, earliest wins
ties. The bid book the user sees uses the same ordering.

**D10. How does the "won at" date in the portfolio work?** A subquery takes `MIN(transaction_date)` over the user's
transactions for any auction linked to that stock — either a `stock` auction on it or an `ipo` of the same company.

**D11. What's the difference between `LEFT JOIN` and `INNER JOIN`, and why LEFT here?** INNER keeps only matches; LEFT
keeps all left rows. I LEFT JOIN both `stock` and `ipo` because each auction matches exactly one of them.

**D12. How would you speed up `MAX(bid_price)` per auction?** A composite index on `(auction_id, bid_price DESC)` makes it
an index-only lookup.

---

## E. Transactions & concurrency

**E1. What is a transaction? What is ACID?** A unit of work that is Atomic (all or nothing), Consistent (constraints
hold), Isolated (concurrent work doesn't interfere improperly), Durable (committed data survives crashes).

**E2. Where do you use transactions and why?** Creating an auction (company + stock/ipo + auction) and closing one
(7 tables). Both are multi-statement operations where a partial result would corrupt data.

**E3. Why `pool.connect()` instead of `pool.query` for them?** A transaction must run on one connection; `pool.query`
may use different ones. I check out a `client`, `BEGIN`, run statements, `COMMIT`/`ROLLBACK`, and `release()` in
`finally` so the pool doesn't leak.

**E4. What happens if the server crashes in the middle of a close?** The transaction was never committed, so Postgres
rolls it back on connection loss; no partial allocation. Committed work is durable via the WAL.

**E5. What isolation level do you use? What does it mean?** The default READ COMMITTED: each statement sees only
committed data as of statement start. It prevents dirty reads but allows non-repeatable reads and phantoms.

**E6. How do you prevent two admins closing the same auction?** `UPDATE auction SET status='closed' WHERE id=$1 AND
status='open' RETURNING *`. The second request blocks on the row lock until the first commits, re-checks the WHERE,
updates 0 rows and gets a 400. I tested 5 concurrent closes: exactly one succeeded and there was one allocation.

**E7. How do you handle two people bidding at the same instant?** I fold the price check into the INSERT
(`INSERT … SELECT … WHERE price >= MAX+0.50`) so there's no gap between JS check and write; 0 rows ⇒ 409. **Honest follow-up:**
under READ COMMITTED that narrows but doesn't eliminate the race — concurrent equal-price bids can both insert (I tested
it). The proper fix is `SELECT … FOR UPDATE` on the auction row (also tested). Allocation stays deterministic via the time
tie-break. *(Doc 11 §A3.)*

**E8. What's TOCTOU?** Time-of-check/time-of-use: state changes between checking a condition and acting on it. The balance
and quantity pre-checks in `POST /bids` are TOCTOU-prone; the allocation re-checks balance authoritatively at close.

**E9. How do you handle overspending (balance)?** Bid time: reject if price×qty > balance. Allocation: cap
`alloc ≤ ⌊balance/price⌋` using the balance read *inside* the transaction, then debit it. `CHECK (balance >= 0)` is the final
backstop. No escrow, so many outstanding bids can exceed a balance until close.

**E10. What is "read-your-own-writes" in your close loop?** If one user has two winning bids, the second iteration reads
the balance already debited by the first (same transaction), so the cap is correct.

**E11. What is a deadlock; could it happen here?** Two transactions each waiting on a lock the other holds. The close
transaction locks rows in a consistent flow (auction → stock → users in bid order); two *different* auctions closing
simultaneously could contend on the same user rows in different orders, so deadlock is theoretically possible; Postgres
detects it and aborts one (which would roll back and return 500). Low probability at this scale.

**E12. What is optimistic vs pessimistic locking?** Optimistic: detect conflicts at commit (version columns/serializable
retry). Pessimistic: lock up front (`FOR UPDATE`). My close uses a pessimistic row lock via the conditional UPDATE;
I'd use a pessimistic lock for bids too.

**E13. Is `DELETE /watchlist/:id` idempotent? What about bids?** DELETE is idempotent (second call removes nothing, still
200). `POST /bids` isn't (each call creates a bid). `PATCH open/close` are safe to repeat but the repeat returns 400.

---

## F. The allocation algorithm

**F1. Explain the allocation algorithm.**
Sort bids by price desc, time asc. Walk down the list with `remaining` shares. For each bid allocate
`min(requested, remaining, ⌊balance/price⌋)`; skip if ≤ 0; record rank, receipt, portfolio and debit; decrement remaining.
Each winner pays their own bid price. All in one transaction.

**F2. What's its complexity?** Sorting O(n log n) in the DB, then O(n) iterations — each doing a constant number of
queries, so O(n) round-trips. Fine for hundreds of bids; batchable for thousands.

**F3. What type of algorithm is it?** Greedy. For divisible quantities it's the fractional-knapsack solution, which is
provably optimal for seller revenue: always take the highest price-per-share first.

**F4. Why price-time priority?** It's the standard fair-order rule in exchanges: best price first, earliest first on ties.
Deterministic and easy to audit.

**F5. Why pay-as-bid rather than a uniform clearing price?** Simplicity and transparency: the price on your bid is what
you pay, and the audit table records it. Uniform price would need a second pass to find the cut-off, then re-price and
re-check affordability. Uniform pricing is arguably fairer and discourages bid-shading, and many real book-built IPOs use
a single cut-off price — I'd name that as the natural upgrade.

**F6. What is the "clearing price" in your system?** The lowest bid in the auction (last in the sorted list; base price if
no bids). It only sets the new `stock.base_price` after an IPO. It does not change what winners paid. *(Slight caveat: it's the
lowest bid, not necessarily the lowest winning bid — doc 11 §A5.)*

**F7. Why not pro-rata allocation?** It ignores price, so there's no price discovery — it isn't an auction. Pro-rata or
lottery are more typical for oversubscribed *retail* IPO categories.

**F8. Why not Vickrey / second-price?** Incentive-compatible for one item, but the multi-unit generalisation (VCG) is complex
to compute and explain; users would find it confusing.

**F9. Why not all-or-nothing bids?** That makes allocation a 0/1 knapsack (NP-hard). Partial fills keep it a simple greedy.

**F10. What if two bids have the same price?** Earliest `bid_time` wins. In practice the ₹0.50 minimum increment makes prices
strictly increasing, so ties shouldn't occur through the API; the rule is a deterministic safety net (and covers seed data or
the concurrency gap).

**F11. What if a winning bidder can't afford their bid?** They get a partial fill (⌊balance/price⌋) or are skipped if that's 0;
the next bidder still wins — skip, don't block. Example: Priya bid 5,000 but received 2,807.

**F12. What if supply runs out mid-list?** The bid that crosses the boundary gets a partial fill; later bids get nothing and no
ranking row. Leftover supply (if any) is written back to `stock.available_shares`.

**F13. Does "outbid" mean "lost"?** No. Outbid bids still get shares if supply remains after higher bids. In the worked example
all four bids won.

**F14. Why is the minimum increment ₹0.50?** It prevents penny-increment spam and gives a meaningful price ladder. It's enforced on
the server (and mirrored in the UI).

**F15. How are IPO leftover shares handled?** Fix #1: after allocation the remainder is written to the new stock row, so unsold IPO
shares aren't lost.

**F16. Is the algorithm fair / can it be gamed?** Considerations: pay-as-bid encourages bid shading; with ascending-only bids a
bidder can't place a low "sleeper" bid; no escrow means a bidder can bid big and get capped; no price-band enforcement. Real
systems add escrow, bands and anti-shill rules.

**F17. Walk me through a numeric example.** QuantumPay IPO, 1,000,000 shares. Bids: rajesh ₹713×100, priya ₹712.50×5000, amit
₹680×2500, rajesh ₹645×1000. Balances 15L/20L/12L. Allocations: 100; ⌊20,00,000/712.5⌋=2,807; ⌊12,00,000/680⌋=1,764; 1,000. Rajesh's
portfolio: 1,100 @ ₹651.18. Remaining 994,329; stock base price ₹645. *(All verified by running it.)*

---

## G. Security & authentication

**G1. How does authentication work?** Login verifies the password with `bcrypt.compare`, then signs a JWT
`{user_id, name, email, username, role}` with `JWT_SECRET`, expiring in 24 h. The frontend stores it and sends
`Authorization: Bearer <token>`; `authMiddleware` verifies it on protected routes.

**G2. Why bcrypt and why cost 10?** It's a slow, salted, adaptive hash so brute force and rainbow tables are impractical.
Cost 10 means 2¹⁰ = 1,024 rounds of key setup — deliberately on the order of ~100 ms per hash. Argon2 would be a modern alternative.

**G3. JWT vs sessions?** JWT is stateless — no session store, the token carries identity/role. Downsides: can't revoke before
expiry, and claims (like role) are stale until re-login. Sessions give instant revocation but need server state.

**G4. Where do you store the token and is that safe?** `localStorage` — persists across refresh but is readable by injected
JS (XSS). An httpOnly SameSite cookie is the hardened alternative (with CSRF protection). I'd call that out as a trade-off.

**G5. How do you prevent a user registering as admin?** The server hard-codes `'investor'` and ignores any `role` in the body
(I tested a `role:"admin"` payload).

**G6. How do you stop users seeing others' data?** Identity always comes from the verified JWT (`req.user.user_id`), never from
the URL or body, so "my portfolio" can't be pointed at someone else (no IDOR).

**G7. What do the frontend route guards protect?** UX only. The real enforcement is `authMiddleware` + `adminOnly` on the API
(an investor calling an admin route gets 403).

**G8. How do you prevent SQL injection / XSS?** Parameterised queries; React escapes rendered text by default.

**G9. What is CORS and how did you configure it?** A browser rule restricting cross-origin requests. I allow only
`ALLOWED_ORIGIN` (default `http://localhost:3000`). It doesn't stop curl — authentication does.

**G10. Why the same "Invalid credentials" for unknown user and bad password?** To avoid username enumeration. (Residual
leak: unknown users skip the bcrypt compare, so timing differs — fix with a dummy compare.)

**G11. What security gaps remain?** Default fallback JWT secret, no rate limiting/lockout, no `helmet`, token in localStorage,
bidder masking is client-side only, email/username change doesn't re-ask for a password, no email verification. Full list in
doc 11 §B.

**G12. What is the last-admin guard?** Before an admin deletes their account the server counts admins and refuses if they're
the only one — otherwise the system could be locked out.

**G13. What does the 401 interceptor do?** On a 401 from a non-`/auth/` URL it clears storage and redirects to `/login`. It
excludes `/auth/` so a wrong password shows an error instead of redirecting.

---

## H. Backend & API design

**H1. List your endpoints.** See [07](07-backend-function-reference.md): auth (register, login, me ×3), auctions (list,
get, create, open, close), bids (all, by auction, place), portfolio, transactions, watchlist (get, add, remove).

**H2. Which are admin-only?** `POST /auctions`, `PATCH /auctions/:id/open`, `PATCH /auctions/:id/close`, `GET /bids/all`.

**H3. How do you validate input?** Manual checks per route (required fields, positivity, ranges, email regex, date order).
A schema validator (Joi/Zod) would reduce repetition.

**H4. What status codes do you use?** 200 success (never 201 — the README is wrong on that), 400 validation/business rule, 401
unauthenticated, 403 forbidden, 404 not found, 409 bid conflict, 500 unexpected.

**H5. What's the middleware order?** `cors → express.json(100kb) → route → authMiddleware → adminOnly → handler`.

**H6. Why a connection pool with max 10?** Reuse connections (opening one per request is slow) and cap load on Postgres.

**H7. What if the DB is down?** Queries throw; handlers log and return 500 `Internal server error`. There's no retry or health
endpoint — would add `/health` and retry/backoff.

**H8. How do you shape responses?** Convert snake_case to camelCase and `parseFloat` DECIMALs in the auction/bid/portfolio
handlers; transactions/watchlist return raw rows (the frontend parses).

**H9. How would you version the API?** Prefix `/api/v1`, keep old versions until clients migrate.

**H10. How would you paginate?** Add `limit`/`offset` (or keyset on `(start_time, auction_id)`) to list endpoints; currently they
return everything.

**H11. Why does `GET /auctions` allow anonymous access?** Public listings. Side effect: it exposes `highestBidder` usernames to
unauthenticated callers (masking is client-side only) — I'd mask server-side or require auth.

---

## I. Frontend & React

**I1. How is state managed?** Local `useState` per page plus two contexts: `AuthContext` (user/login/logout/isAdmin) and
`ToastContext` (addToast). No Redux — there's little cross-page shared server state.

**I2. Why does `AuthProvider` have a `loading` flag?** On refresh it reads `localStorage` in an effect; without `loading` the
guards would see "no user" for one render and redirect.

**I3. Explain `useEffect` cleanup in your polling code.** The effect starts an interval and a `visibilitychange` listener; the
cleanup clears the interval and removes the listener on unmount or dependency change, preventing leaks and duplicate timers.

**I4. What's the Page Visibility API for?** Pausing polling in hidden tabs (saves requests) and refreshing immediately when the
tab becomes visible.

**I5. Why `useCallback` for `loadData`?** It's an effect dependency; a stable identity prevents the effect (and its interval)
re-running every render. `addToast` is also `useCallback`ed for that reason.

**I6. Why `useMemo` in `BidForm`?** The quick-fill list depends only on `minBid` and the highest bid, so it's memoised. Minor
optimisation, mostly clarity.

**I7. How does the countdown timer work, and why not decrement a counter?** It recomputes `⌊(endTime − Date.now())/1000⌋` every
second. Counters drift when tabs are throttled; recomputing from an absolute time is always right.

**I8. How do route guards work?** `PrivateRoute` renders children if `user` exists else `<Navigate to="/">`; `AdminRoute` also
requires `isAdmin`. `SmartRoot` shows Landing to guests and Home to users.

**I9. What are controlled inputs?** Inputs whose value is held in React state and updated via `onChange` (all forms here).

**I10. Why `key` props in lists?** So React can reconcile list items efficiently and keep state aligned (e.g. `key={bid.id}`).

**I11. Why are there inline styles everywhere?** Quick and co-located; design tokens live in CSS variables. Trade-off: no pseudo-classes
(hover implemented via mouse handlers), more verbose JSX. Tailwind is installed but unused.

**I12. How do you show errors to users?** Form-level `error` state plus toasts; API errors surface `err.response.data.error`.

**I13. How does the "you're leading / outbid" banner work?** It finds my bid (`bids.find(b => b.bidder === myUsername)`) — the first
(highest) of mine — and checks its `status === "highest"`.

**I14. What does `React.StrictMode` do?** In dev it double-invokes certain lifecycles/effects to expose side-effect bugs — one reason
cleanups matter.

**I15. Why CRA, and is it still recommended?** Zero-config at the time. CRA is no longer actively recommended; Vite or Next.js would be
the modern choice.

**I16. How do you handle images failing?** `onError` sets `imgError` and falls back to a gradient.

**I17. How would you test the frontend?** React Testing Library: render pages inside `MemoryRouter` with mocked `api.js`, assert on
validation messages and role-based nav. (The repo's one test is the CRA template and fails.)

**I18. Why does the admin sidebar lack Portfolio/Watchlist?** Admins don't bid; `AuctionDetail` hides `BidForm` for admins.

---

## J. Testing, DevOps & scaling

**J1. How did you test it?** Manually through the UI, and I verified behaviours with scripts against a real Postgres (allocation, caps,
double-close, auth, cascade, concurrency). There's no committed automated suite; the CRA test is a leftover template. Next step:
Jest + Supertest against a test database.

**J2. What would you unit-test first?** The allocation function (extracted from the handler) with table-driven cases: supply exhausted,
partial fills, unaffordable bidder, repeat bidder, ties, empty book, IPO leftover.

**J3. How would you deploy it?** Build the React bundle (`npm run build`) served by a CDN/nginx, run the Node API with a process manager
behind HTTPS, managed Postgres, env-based secrets. Docker Compose for local parity.

**J4. How would you scale to 100k users?** Replace polling with WebSockets/SSE or a cache; pre-aggregate auction stats; add composite
indexes; read replicas; horizontally scale stateless API nodes (JWT makes that easy); batch the close loop; move auto-close to a job
queue.

**J5. What's the bottleneck?** `GET /auctions` (correlated subqueries per row × polling) and the close loop's per-bid round-trips.

**J6. How would you auto-close auctions?** A scheduler (cron/`pg_cron`/BullMQ) selecting `status='open' AND end_time <= NOW()` and calling
the same close routine; use the existing conditional UPDATE so it's safe to run from multiple workers.

**J7. How would you add monitoring?** Structured logs (pino), request IDs, metrics (Prometheus), health endpoint, error tracking (Sentry).

**J8. Why does `npm ci` fail in the frontend?** The lockfile is out of sync with `package.json` (missing `yaml@2.9.1`); `npm install`
works. Fix by committing the regenerated lockfile.

---

## K. Weaknesses & improvements

**K1. What are the biggest weaknesses?** (1) No deadline enforcement on bids; (2) the bid race is narrowed not closed; (3) no escrow;
(4) watchlist ★ on cards sends an undefined id; (5) no automated tests; (6) client-only masking of bidder names. Full list in doc 11.

**K2. What would you fix first?** The deadline check and the `FOR UPDATE` bid lock (both tiny), then the `referenceId` in the API, then
tests.

**K3. What would you add with more time?** Escrow, bid cancellation window, WebSocket push, uniform-price option, price-band enforcement,
auto-close, notifications, 2FA for admins, audit-log triggers, Docker/CI.

**K4. What design decision would you revisit?** The polymorphic `reference_id` (no FK) and the duplicated `ipo.status`.

**K5. What did you learn?** That "atomic in one statement" isn't the same as "serialised" — isolation levels matter — and that
transactions plus constraints are the real safety net, not app code.

**K6. How would you add a "sell" flow?** Add ask orders and matching (an order book), a `lots` table for FIFO cost basis, and a
settlement transaction that moves shares and cash.

**K7. How would you support partial refunds or cancellations?** Escrow table with holds released on outbid/cancel; transactions record
captures/refunds.

---

## L. ML / "dataset" / "feature engineering" questions

**L1. Did you use machine learning in this project?**
No. It's a DBMS-focused full-stack project. Its core "algorithm" is the deterministic greedy allocation, not a learned model.

**L2. How did you model the dataset?**
Relationally: I identified entities (user, company, stock, IPO, auction, bid, ranking, portfolio, transaction, watchlist), drew the ER
diagram, resolved M:N with junction tables, normalised to ~3NF with deliberate, documented denormalisations, and added constraints and
indexes. The data is the database plus a synthetic seed (4 users, 6 companies, 6 auctions, 15 bids).

**L3. What feature engineering did you do?**
The derived/computed attributes: current highest bid (`MAX(bid_price)`), highest bidder, bid count, remaining shares (pool minus allocated),
subscription %, change vs base price, total investment, weighted-average cost, P&L and allocation %, clearing price. Some are computed in
SQL, some in the API and some in the browser — [doc 05 §6](05-database-and-data-modelling.md#6-feature-engineering--every-derived-value-in-the-project) lists each with its formula.

**L4. Which algorithm did you choose and why?**
Greedy price-time-priority allocation, because it's revenue-optimal for divisible quantities, deterministic, auditable, and easy to run in
a single transaction. Alternatives (uniform price, pro-rata, lottery, Vickrey) are compared in doc 06.

**L5. How did you split train/test? What's the accuracy?**
Not applicable — nothing is trained. If I added ML (e.g. anomaly detection on bids) I'd use a time-based split and report precision/recall.

**L6. Could you add ML here?**
Plausibly: shill-bid/anomaly detection from bid-stream features (bids per bidder per minute, increment size, time-to-close), or clearing-price
forecasting from subscription ratio and position in the price band. The immutable `bid` table already stores the event stream. The seed is far
too small, so I'd simulate auctions. This is future scope, not implemented.

**L7. Where could bias or leakage creep in if you did add ML?**
Using post-close fields (allocations, clearing price) as features for a pre-close prediction would leak the target; random splits would leak
time. Use time-based splits and only pre-close features.

**L8. Is the "current price" in the portfolio from a model?**
No — it's a fixed `base_price × 1.05` simulation to give P&L something to display. Real market data would come from an exchange feed.

---

## M. Behavioural & wrap-up

**M1. Describe a bug you found and fixed.** The IPO leftover shares were lost after close (only stock auctions wrote back
`available_shares`) — Fix #1. Another: a bidder could be allocated more than they could afford — Fix #2 added the affordability cap and
debit; Fix #3 made auction creation atomic to avoid orphan company rows.

**M2. What was the hardest technical challenge?** Making the close step correct under failure and repetition: atomic across 7 tables,
guarded against double-close, with read-your-own-writes for repeat bidders and IPO-to-stock promotion.

**M3. How did you verify correctness?** Manually and with scripted runs against Postgres (balances, allocations, weighted average, concurrency). I'd
formalise those as automated tests.

**M4. What would you do differently?** Design the bid lock and deadline check from the start, add tests early, make the schema use real FKs for the
polymorphic link, and keep docs in sync with code.

**M5. Why should we hire you based on this?** It shows I can take a feature from schema design through transactional backend logic to a live UI,
reason about concurrency and security trade-offs, and be honest about the gaps and how to close them.

**M6. Any questions for us?** (Prepare two: how do you test financial/transactional code? how do you handle idempotency/concurrency in your order or
payment flows?)
