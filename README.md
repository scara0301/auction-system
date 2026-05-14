# Stock & IPO Auction System

A full-stack web application simulating a **real-time, auction-based securities allocation platform**. Built as a DBMS project, the system models the complete lifecycle of a securities auction: from company listing and open bidding through share allocation, portfolio tracking, and transaction history.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 18+ |
| Backend framework | Express 4 |
| Database | PostgreSQL 15 |
| Query layer | `pg` (node-postgres), raw parameterized SQL |
| Authentication | JWT (`jsonwebtoken`) + `bcryptjs` (cost 10) |
| Frontend | React 18 (Create React App) |
| HTTP client | Axios |
| Fonts | Inter + JetBrains Mono (Google Fonts) |

---

## System Architecture

```
┌──────────────────────────────────────────────────────┐
│                    React Frontend                     │
│  Home · Auctions · AuctionDetail · Portfolio         │
│  AdminPanel · IPOPage · Login · Register             │
└─────────────────────────┬────────────────────────────┘
                          │ Axios + JWT Bearer Token
                          │ REST API (port 5000)
┌─────────────────────────▼────────────────────────────┐
│              Express Backend (Node.js)                │
│  Auth · Auction · Bid · Portfolio · Transaction      │
│  Watchlist routes                                    │
└─────────────────────────┬────────────────────────────┘
                          │ pg Pool · parameterized SQL
┌─────────────────────────▼────────────────────────────┐
│                PostgreSQL Database                    │
│  10 entities · full referential integrity            │
└──────────────────────────────────────────────────────┘
```

---

## Database Schema

The system uses **10 normalized entities** enforcing referential integrity at the database level.

| # | Table | Description |
|---|-------|-------------|
| 1 | `user` | Investor and admin accounts with balance |
| 2 | `company` | Listed companies with unique ticker symbols |
| 3 | `stock` | Share inventory: total/available shares and base price |
| 4 | `ipo` | IPO offerings with price band and subscription window |
| 5 | `auction` | Auction event linking to a stock or IPO via polymorphic `reference_id` |
| 6 | `bid` | Individual bids placed by investors during open auctions |
| 7 | `bid_ranking` | Post-close allocation table, ranked by bid price descending |
| 8 | `portfolio` | Shares owned by investors after auction close and allocation |
| 9 | `transaction` | Immutable audit log of all share transfers |
| 10 | `watchlist` | Investor-maintained list of tracked stocks |

### Key Relationships

```
company ──┬── stock ──── auction (type = 'stock')
          └── ipo   ──── auction (type = 'ipo')

auction ──┬── bid ──── bid_ranking
          └── transaction

user ──┬── bid
       ├── portfolio ──── stock
       ├── transaction
       └── watchlist ──── stock
```

> **Polymorphic FK**: `auction.reference_id` points to either `stock.stock_id` or `ipo.ipo_id` depending on `auction.type`. Enforced at the application layer; documented with a `NOT NULL` comment in `schema.sql`.

---

## Auction Lifecycle

```
UPCOMING ──► OPEN ──► CLOSED
```

| Phase | Description |
|-------|-------------|
| **UPCOMING** | Auction created; bidding not yet started |
| **OPEN** | Admin opens the auction; investors can place bids |
| **CLOSED** | Admin closes; system runs atomic share allocation |

### Allocation Algorithm

When admin closes an auction, all of the following run inside a **single PostgreSQL transaction** (BEGIN / COMMIT / ROLLBACK on error):

1. Mark `auction.status = 'closed'`
2. Read `available_shares` (stock) or `total_shares` (IPO)
3. Rank all bids by `bid_price DESC, bid_time ASC` (price-time priority)
4. For each bid, allocate `MIN(bid.quantity, remaining_shares)` and decrement remaining
5. Write rows to `bid_ranking`, `transaction`, and `portfolio` (upsert with weighted avg price)
6. Update `stock.available_shares` to reflect unsold shares
7. For IPO close: create a `stock` row at the clearing price for secondary tracking

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | Create investor account (role fixed to `investor`) |
| `POST` | `/api/auth/login` | — | Authenticate; receive signed JWT |

### Auctions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/auctions` | — | List auctions (filter: `?type=stock\|ipo`, `?status=open\|upcoming\|closed`) |
| `GET` | `/api/auctions/:id` | — | Single auction with full details |
| `POST` | `/api/auctions` | Admin | Create auction + company |
| `PATCH` | `/api/auctions/:id/open` | Admin | Transition `upcoming → open` |
| `PATCH` | `/api/auctions/:id/close` | Admin | Close + run allocation atomically |

### Bids

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/bids?auctionId=` | Investor | Get ranked bid list for an auction |
| `POST` | `/api/bids` | Investor | Place a bid (price must exceed current highest) |

### Portfolio & Transactions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/portfolio` | Investor | Holdings with simulated current price (+5% of base) |
| `GET` | `/api/transactions` | Investor | Full transaction history |

### Watchlist

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/watchlist` | Investor | Get watchlist |
| `POST` | `/api/watchlist` | Investor | Add stock |
| `DELETE` | `/api/watchlist/:stockId` | Investor | Remove stock |

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm

### Backend

```bash
cd auction-backend
npm install
```

Create `auction-backend/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=auction_system
DB_PORT=5432
JWT_SECRET=replace-with-a-strong-random-secret
ALLOWED_ORIGIN=http://localhost:3000
```

Initialize the database and seed data:

```bash
psql -U postgres -c "CREATE DATABASE auction_system;"
psql -U postgres -d auction_system -f schema.sql
```

Start the server:

```bash
node server.js
```

### Frontend

```bash
cd auction-frontend
npm install
```

Create `auction-frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
# Uncomment the line below to use local mock data instead of the real backend:
# REACT_APP_USE_DUMMY=true
```

Start the dev server:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Investor | `rajesh` | `pass123` |
| Investor | `priya` | `pass123` |
| Investor | `amit` | `pass123` |

---

## Project Structure

```
dbms/
├── auction-backend/
│   ├── server.js          # Express app — all route handlers
│   ├── schema.sql         # DDL (10 tables) + seed data (hashed passwords)
│   ├── .env               # DB credentials + secrets (not committed)
│   ├── .gitignore
│   └── package.json
│
└── auction-frontend/
    ├── public/
    └── src/
        ├── pages/
        │   ├── Home.js            # Market overview table (sortable)
        │   ├── Auctions.js        # Stock auctions filtered view
        │   ├── IPOPage.js         # IPO auctions filtered view
        │   ├── AuctionDetail.js   # Bid ladder + order entry
        │   ├── Portfolio.js       # Holdings + P&L
        │   ├── AdminPanel.js      # Auction management + live monitor
        │   ├── Login.js
        │   └── Register.js
        ├── components/
        │   ├── Navbar.js
        │   ├── AuctionCard.js
        │   ├── BidForm.js         # Order entry panel
        │   ├── BidHistoryTable.js
        │   └── Timer.js           # Countdown with urgent state
        ├── services/
        │   └── api.js             # Axios client + dummy data layer
        ├── context/
        │   └── AppContext.js      # AuthProvider + ToastProvider
        ├── data/
        │   └── dummyData.js       # Local mock data (opt-in via .env)
        └── index.css              # Design tokens + utility classes
```

---

## Security Notes

- Passwords hashed with `bcryptjs` at cost factor 10; no plain-text fallback
- All SQL via `$1, $2, ...` parameterized queries — no string interpolation
- `role` field is ignored from registration requests; server always assigns `investor`
- JWT signed with `JWT_SECRET` env var; startup warning emitted if unset
- CORS restricted to `ALLOWED_ORIGIN` (defaults to `localhost:3000`)
- `GET /api/bids` requires a valid JWT

---

## Known Limitations

- `auction.reference_id` is a polymorphic FK without DB-level constraint enforcement
- `currentPrice` in portfolio is a static simulation: `base_price × 1.05`
- No bid cancellation — once placed, a bid stands for the duration
- No real-time WebSocket push; clients poll every 3 seconds (paused when tab is hidden)
- No user balance deduction at bid time; balance field exists but is not decremented
