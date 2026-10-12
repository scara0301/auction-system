# 12 — One-Page Cheatsheet (read this last, right before the interview)

## The project in one breath
**StockAuction** — React + Node/Express + PostgreSQL. Investors bid on stock/IPO auctions; admin opens/closes;
on close, shares are allocated **highest price first, earliest bid breaks ties**, capped by remaining supply
and the bidder's balance, **pay-as-bid**, in **one ACID transaction**. DBMS course project — **no ML**.

## Say-this-not-that
| ❌ Don't say | ✅ Say |
|--------------|--------|
| "I used a machine-learning model / feature engineering" | "It's relational modelling — ER → 10 tables → ~3NF; the 'features' are derived fields like highest bid, subscription %, weighted-average cost" |
| "The bid insert is race-proof" | "Narrowed with a guarded insert; a `FOR UPDATE` lock fully serialises it — I tested both. Close *is* race-safe." |
| "Everyone pays the clearing price" | "Pay-as-bid. The clearing price (lowest bid) only sets the new stock's base price." |
| "Auctions close automatically" | "Admin-driven; the gap is the API doesn't reject bids after `end_time`" |
| "I used Tailwind" | "CSS variables + inline styles (Tailwind is installed but unused)" |
| "The API returns `{data, message}` / 201s" | "Plain JSON, 200 for success" |

## Numbers
- 10 tables · 12 FKs (all CASCADE) · 9 indexes · 18 API routes · 12 pages · 5 components
- JWT 24 h · bcrypt cost 10 · min increment ₹0.50 · polling 3 s · pool max 10 · body limit 100 kb
- Ports 5000 (API) / 3000 (UI) / 5432 (DB) · seed users `admin/admin123`, `rajesh|priya|amit / pass123`

## Tables (one line each)
`user` accounts+balance · `company` catalogue · `stock` share inventory (UNIQUE company) · `ipo` offering+price band ·
`auction` event+status (polymorphic `reference_id`) · `bid` immutable bids · `bid_ranking` result per bid ·
`portfolio` holdings (UNIQUE user+stock) · `transaction` immutable receipts · `watchlist` follows (UNIQUE user+stock)

## Auction lifecycle
`UPCOMING --admin open--> OPEN --admin close (transaction)--> CLOSED` — each step is `UPDATE … WHERE status='<prev>'`.

## Place-a-bid checks (server)
positive price/qty → auction `open` → price ≥ max+0.50 → qty ≤ pool → price×qty ≤ balance → guarded `INSERT` (0 rows ⇒ 409).

## Close algorithm (memorise)
```
lock: UPDATE auction → closed WHERE status='open'     (0 rows ⇒ stop)
bids = ORDER BY price DESC, time ASC
(IPO) stock row @ clearing price (= lowest bid)
for bid: alloc = min(qty, remaining, ⌊balance/price⌋); skip if ≤0
         insert ranking + transaction; upsert portfolio (weighted avg); debit balance
write back remaining to stock.available_shares ; COMMIT (error ⇒ ROLLBACK)
```
Why: greedy by price = optimal revenue for divisible quantities (fractional knapsack) · deterministic · atomic · O(n log n).

## Worked example (verified)
Pool 1,000,000. Bids: rajesh 713×100 · priya 712.50×5000 · amit 680×2500 · rajesh 645×1000.
Allocated: **100 · 2,807 · 1,764 · 1,000** (priya/amit capped by balance). Rajesh avg = (100·713+1000·645)/1100 = **₹651.18**.
Remaining **994,329**; new stock base price **₹645**.

## 8 ideas to drop into answers
1. **Atomicity** — 7 tables change together or not at all.
2. **Constraints as guard-rails** — `CHECK (balance>=0)` etc. protect data even if my JS has a bug.
3. **UPSERT** — `ON CONFLICT` for company/stock/portfolio.
4. **Conditional UPDATE = state machine + lock** (double-close safe — tested 5 concurrent closes).
5. **Polymorphic association** — trade-off: one list query vs no DB FK.
6. **Parameterised SQL** everywhere → no injection.
7. **JWT** stateless; identity from token, never from URL → no IDOR; role hard-coded on register.
8. **Polling + Visibility API** instead of WebSockets (simplicity; push is future scope).

## Known issues to volunteer (full list: doc 11)
Watchlist ★ on cards sends undefined id · no deadline check on bids · bid race narrowed not closed · no escrow ·
`ipo.status` stale · clearing price = lowest bid · no price-band enforcement · client-only name masking ·
no working automated tests · frontend `npm ci` fails (use `npm install`) · Tailwind unused.

## Start commands
```bash
psql -U postgres -c "CREATE DATABASE auction_system;" && psql -U postgres -d auction_system -f auction-backend/schema.sql
cd auction-backend  && npm install && npm start          # :5000   (.env: DB_*, JWT_SECRET, ALLOWED_ORIGIN)
cd auction-frontend && npm install && npm start          # :3000   (.env: REACT_APP_API_URL)  ← npm install, not npm ci
```
Reset demo data: `DROP DATABASE auction_system WITH (FORCE);` then recreate + reload schema.

## If asked "any questions for us?"
"How do you test transactional/financial code?" · "How do you handle idempotency and concurrency in order or payment flows?"
