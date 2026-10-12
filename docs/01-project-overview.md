# 01 — Project Overview

## What is it?

**StockAuction** is a full-stack web application that runs **live auctions for company shares**.
It supports two instrument types:

| Type | Meaning | Where its share pool comes from |
|------|---------|----------------------------------|
| `stock` | Secondary-market stock of a company that is already listed | `stock.available_shares` |
| `ipo` | A brand-new Initial Public Offering | `ipo.total_shares` |

Investors place competitive bids (price × quantity). An admin opens and closes auctions. When an
auction is closed, the system **allocates shares to bidders by price-time priority** and, in the same
database transaction, writes the ranking, the receipts, the portfolio holdings and the balance
debits.

It was built as a **Database Management Systems course project**, so the emphasis is on relational
design, ACID transactions, constraints, concurrency safety and SQL — not on ML or market data.

## Why this project? (the "why did you pick it" answer)

- Auctions + allocation is a *natural* fit for DBMS concepts: it needs **multi-table atomic updates**
  (a classic reason transactions exist), **race conditions** (two people bidding at the same instant),
  **referential integrity** (bids belong to users and auctions), and **derived data** (rankings,
  weighted-average cost).
- It is domain-rich enough to be interesting (IPO price discovery, partial allocation) but small
  enough to build and fully explain.
- Existing IPO-allocation systems are opaque; the project makes the whole lifecycle inspectable.

## Who uses it? (roles)

| Role | Created how | Can do |
|------|-------------|--------|
| **Investor** | Self-registers (`POST /api/auth/register`; role is hard-coded to `investor` server-side) | Browse auctions, place bids, see portfolio / transactions / watchlist, manage own account |
| **Admin** | Seeded in `schema.sql` (`admin / admin123`) | Create auctions, open them, close them (runs allocation), monitor all bids |

Admins do **not** bid: `AuctionDetail` only renders `BidForm` when `user && !isAdmin`
(`pages/AuctionDetail.js:481`).

## Feature list (what actually exists)

**Authentication & account**
- Register, login (JWT, 24 h), view profile + live balance, edit profile, change password (requires current password), delete account (guarded: last admin can't delete themselves).

**Investor**
- Market overview dashboard (stats, live auction grid, "market pulse").
- Auctions list with search / status filter / sort; IPO list with price-band visual.
- Auction detail: live **bid book** (ranked ladder with depth bars), countdown timer, bid form with quick-fill buttons, "you're leading / outbid" banner.
- Portfolio (cards/table), P&L, composition bar. Transactions (audit trail). Watchlist.

**Admin**
- Admin panel with three tabs: **Live Monitor** (all live auctions + top bids), **Manage** (table, open/close), **Create** (new auction form).

**System behaviour**
- Server-enforced bid rules: positive numbers, auction must be `open`, ≥ ₹0.50 above current highest, quantity ≤ available, `price × qty ≤ balance`.
- Atomic allocation on close with affordability cap and weighted-average portfolio merge.
- IPO close "promotes" the company: creates its first `stock` row at the clearing price.
- 3-second polling with the Page Visibility API (pauses in background tabs).
- Offline demo mode (`REACT_APP_USE_DUMMY=true`) that serves mock data with no backend.

## What is real vs. simulated (be upfront about this)

| Item | Status |
|------|--------|
| Bids, allocation, balances, portfolio, transactions | **Real** — stored in Postgres, computed by the server |
| Portfolio "current price" | **Simulated**: `base_price × 1.05` (`server.js:646`) — not market data |
| Dashboard "Total Volume" | **Approximation**: `highestBid × (totalShares − remainingShares)` summed over auctions — not true traded volume |
| "Subscription %" progress bar | **Really "allocated %"**: `(total − remaining)/total`. `remaining` only changes at close, so for an open auction it reflects *previous* allocations |
| Login-page stats ("12+ auctions", "₹240 Cr", "3,400+ investors") | **Hard-coded marketing text** |
| Landing-page price chart / candlesticks | **Decorative fake data** (`PRICE_DATA`, `candles` constants) |
| Company photos | Unsplash URLs chosen by sector (`utils/images.js`) |
| Auction opening/closing | **Manual, admin-triggered**. There is no scheduler; reaching `end_time` does *not* close an auction (the UI shows "Awaiting close") |

## Scope & size

| Part | Size |
|------|------|
| `auction-backend/server.js` | 723 lines, 18 route handlers, 2 middleware |
| `auction-backend/schema.sql` | ~220 lines: 10 tables, 9 indexes, seed data |
| `auction-frontend/src` | 12 pages, 5 components, `AppContext`, `api.js`, `images.js`, `dummyData.js`, CSS design tokens |
| Docs already in repo | `README.md` (report), `WALKTHROUGH.md` (guided tour), `er-diagram.html` + PNG |

## How the project evolved (git history — useful for "how did you build it?")

```
5b93902  Initial commit: Stock & IPO Auction System
89b847b  docs(frontend): anti-slop UI pass + comprehensive project report README
5c6b33a  feat: UI overhaul, account settings, and bug fixes
9b6908b  fix: show "Awaiting close" when end time has passed but auction still open
59df177  feat: add Watchlist page with full add/remove support
a67b148  feat: add Watch/Unwatch button to AuctionDetail
fec6861  feat: add star/watch button directly on auction cards and fix admin restriction
dde0c3d  feat: add animated landing page for unauthenticated visitors
e21c2c4  feat: enhance landing page with photos, animated SVG charts, and candlesticks
766176c  feat: redesign landing page with 5-image slideshow and colorful layout
8f9fbb7  final
```

The numbered "Fix #n" comments in `server.js` (Fix #1, #2, #3, #4, #14 …) are hardening passes you made
after the first version: atomic company+stock+auction creation (#3), balance-capped allocation (#2),
race-proof bid insert (#4), leftover-share write-back for IPOs (#1), server-side ₹0.50 increment (#14),
batch endpoint `/bids/all` (#12), 401 interceptor (#7). Good material for the question
*"what bugs did you find and fix?"* — see [10-interview-qa.md](10-interview-qa.md).

## Explicitly **not** in the project

- No machine learning, prediction, recommendation or analytics models.
- No real market data feed; no real payments; no escrow of funds at bid time.
- No WebSockets (polling only), no email, no notifications, no 2FA.
- No automated tests that work (the one test file is the untouched Create-React-App template and fails — see doc 11).
- No ORM, no migrations tool, no Docker, no CI.

Being clear about these is a *strength* in an interview — it shows you understand the boundary of
what you built. Each has a "future scope" answer in [10-interview-qa.md](10-interview-qa.md).
