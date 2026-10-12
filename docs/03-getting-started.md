# 03 — Getting Started (how to run & demo the project)

Every command here was run on a clean checkout (Postgres 16, Node 22) on 2026-10-12.
✅ = verified working.

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 18+ (tested on 22) | `node -v` |
| npm | 9+ | `npm -v` |
| PostgreSQL | 15+ (tested on 16) | `psql --version` |

## Step 1 — Database ✅

```bash
# create the database
psql -U postgres -c "CREATE DATABASE auction_system;"

# create the 10 tables, constraints, indexes AND load seed data
psql -U postgres -d auction_system -f auction-backend/schema.sql
```

Sanity check — you should get 4 users, 6 auctions, 15 bids:

```bash
psql -U postgres -d auction_system -c 'select count(*) from "user"; select count(*) from auction; select count(*) from bid;'
```

> **Re-running `schema.sql` is NOT safe.** The `CREATE TABLE IF NOT EXISTS` lines are idempotent but the
> `INSERT` seed lines are not (unique violations on email/ticker, duplicate auctions). To reset to a
> clean demo state, drop and recreate:
>
> ```bash
> psql -U postgres -c "DROP DATABASE auction_system WITH (FORCE);"
> psql -U postgres -c "CREATE DATABASE auction_system;"
> psql -U postgres -d auction_system -f auction-backend/schema.sql
> ```
>
> Seed timestamps are `NOW() - INTERVAL …`, i.e. relative to **when you load the file**. Reload right
> before a demo so the countdowns look healthy (the seeded IPO auction ends 45 min after load).

## Step 2 — Backend ✅

```bash
cd auction-backend
npm install            # npm ci also works here
```

Create `auction-backend/.env` (it is git-ignored):

```env
PORT=5000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=auction_system
DB_PORT=5432
JWT_SECRET=replace-with-a-long-random-string
ALLOWED_ORIGIN=http://localhost:3000
```

Start it:

```bash
npm start              # = node server.js   (npm run dev is identical — there is no nodemon)
# → Auction backend running on http://localhost:5000
```

If `JWT_SECRET` is missing you'll see a `[WARN] JWT_SECRET not set — using insecure default` line.
Quick smoke test:

```bash
curl -s localhost:5000/api/auctions | head -c 300      # JSON array of 6 auctions
```

## Step 3 — Frontend ✅

```bash
cd auction-frontend
npm install            # ⚠ use `npm install`, NOT `npm ci` (see below)
```

> **Gotcha (verified):** `npm ci` **fails** in `auction-frontend` with
> *"Missing: yaml@2.9.1 from lock file"* — `package-lock.json` is out of sync with `package.json`.
> `npm install` works and regenerates it. If asked, say: "the lockfile fell out of sync with
> `package.json`; `npm install` repairs it and the fix is to commit the regenerated lockfile" —
> don't speculate about the cause (I didn't determine which dependency change triggered it).

Create `auction-frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
# Optional: run the UI with NO backend using mock data
# REACT_APP_USE_DUMMY=true
```

Start it:

```bash
npm start              # opens http://localhost:3000
```

Production build (✅ compiles: ~125 kB JS gzipped):

```bash
npm run build          # output in auction-frontend/build
```

### Three terminals, summarised

```bash
# T1 — DB (once)
psql -U postgres -c "CREATE DATABASE auction_system;" && psql -U postgres -d auction_system -f auction-backend/schema.sql
# T2 — API
cd auction-backend  && npm install && npm start
# T3 — UI
cd auction-frontend && npm install && npm start
```

## Demo accounts

| Role | Username | Password | Balance |
|------|----------|----------|---------|
| Admin | `admin` | `admin123` | ₹50,00,000 |
| Investor | `rajesh` | `pass123` | ₹15,00,000 |
| Investor | `priya` | `pass123` | ₹20,00,000 |
| Investor | `amit` | `pass123` | ₹12,00,000 |

The Login page has **Investor** / **Admin** quick-fill buttons (fill `rajesh` and `admin`).
(The seed bcrypt hashes were generated at cost 10; the plaintext passwords are not stored anywhere.)

## Live demo script (5 minutes) ✅ numbers verified

Use the **QuantumPay Financial IPO** (auction #3) — its seed bids are big enough to show every rule.

1. **Login as `rajesh`** → Market Overview. Point out the live grid + 3-second refresh.
2. Open **QuantumPay** (IPO). The Bid Book shows 3 seeded bids: `priya ₹712.50 ×5000`, `amit ₹680 ×2500`, `rajesh ₹645 ×1000`.
3. **Place a bid: ₹713 × 100.** (Minimum is ₹713.00 = 712.50 + 0.50.) Banner turns green: *"You're leading"*. Try ₹712.60 first to show the server/UI reject it.
4. **Logout → login as `admin`** → Admin Panel → *Live Monitor* shows the bids → click **Close** → confirm.
5. Back to Admin/Auction page: auction is CLOSED. Then explain what the single transaction just did:

| Rank | Bidder | Price | Requested | **Allocated** | Why |
|------|--------|-------|-----------|---------------|-----|
| 1 | rajesh | ₹713 | 100 | **100** | Highest price |
| 2 | priya | ₹712.50 | 5,000 | **2,807** | Balance cap: ⌊₹20,00,000 / 712.50⌋ = 2,807 |
| 3 | amit | ₹680 | 2,500 | **1,764** | Balance cap: ⌊₹12,00,000 / 680⌋ = 1,764 |
| 4 | rajesh | ₹645 | 1,000 | **1,000** | Second bid, still affordable |

   - **Pay-as-bid:** each winner pays *their own* price (rajesh paid ₹713 and ₹645).
   - **Rajesh's portfolio** merges the two wins into one row: qty **1,100**, avg **₹651.18** = (100×713 + 1000×645) / 1100.
   - **Balances:** rajesh ₹15,00,000 → **₹7,83,700**; priya → **₹12.50**; amit → **₹480**.
   - **IPO promotion:** a new `stock` row for QPFL was created at ₹645 (the lowest bid), `available_shares` = 1,000,000 − 5,671 = **994,329**.
6. **Login as `rajesh` → Portfolio / Transactions** to show the holding and the immutable receipts.

> Seeded bids bypass API validation (they're inserted by SQL), which is exactly why Priya's ₹35 lakh
> bid exceeds her ₹20 lakh balance — a neat way to demonstrate the affordability cap.

## Useful SQL while demoing

```sql
SELECT * FROM bid WHERE auction_id = 3 ORDER BY bid_price DESC, bid_time ASC;   -- the exact allocation order
SELECT * FROM bid_ranking WHERE auction_id = 3 ORDER BY rank_position;
SELECT * FROM "transaction" WHERE auction_id = 3;
SELECT user_id, quantity_owned, avg_price FROM portfolio;
SELECT username, balance FROM "user";
SELECT status FROM auction WHERE auction_id = 3;                                -- upcoming → open → closed
```

## Offline / dummy mode

`REACT_APP_USE_DUMMY=true npm start` serves `src/data/dummyData.js` through the same `api.js` functions —
no backend or DB needed. Limits: login only knows `admin / rajesh / priya`; transactions and watchlist
are always empty; data resets on refresh. Useful as a fallback if the DB breaks mid-interview.

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `password authentication failed for user "postgres"` | `DB_PASSWORD` in `.env` doesn't match your Postgres password |
| `relation "user" does not exist` | Schema not loaded — run Step 1 against the same `DB_NAME` |
| Frontend loads, API calls fail with a CORS error | `ALLOWED_ORIGIN` must exactly match the frontend origin (scheme+host+port) |
| `EADDRINUSE :5000` | Another process owns 5000 (on macOS, AirPlay Receiver does). Set `PORT=5001` in backend `.env` **and** `REACT_APP_API_URL=http://localhost:5001/api`, then restart the frontend |
| Changed `REACT_APP_*` but nothing changed | CRA reads env at start/build time — restart `npm start` |
| Redirected to `/login` unexpectedly | JWT expired (24 h) or was invalid → the axios 401 interceptor logged you out. Log in again |
| Logged in as admin but no Portfolio/Watchlist links | By design: the admin sidebar has Dashboard, Auctions, IPO, Admin Panel, Settings only |
| Company photos missing | Unsplash needs internet; `AuctionCard` falls back to a dark gradient on image error |
| `npm ci` fails in the frontend | Lockfile drift — use `npm install` |
| `npm test` fails | The only test is the unmodified CRA template (and Jest can't resolve `react-router-dom`) — see [doc 11](11-known-issues-and-honest-answers.md) |

## Exercising the API with curl

```bash
# login → token
TOKEN=$(curl -s -X POST localhost:5000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"rajesh","password":"pass123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

# place a bid
curl -s -X POST localhost:5000/api/bids -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"auctionId":3,"price":713,"quantity":100}'
# → {"id":16,"message":"Bid placed successfully"}

# admin closes an auction
ADMIN=$(curl -s -X POST localhost:5000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s -X PATCH localhost:5000/api/auctions/3/close -H "Authorization: Bearer $ADMIN"
# → {"message":"Auction closed and shares allocated","allocations":4}
```
