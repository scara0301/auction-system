# Stock & IPO Auction System
### Database Management Systems — Project Report

> **Course:** Database Management Systems (DBMS)
> **Project Type:** Full-Stack Web Application
> **Domain:** Financial Technology — Securities Auction Platform

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Problem Statement & Objectives](#2-problem-statement--objectives)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Database Design](#5-database-design)
   - 5.1 [Entity-Relationship Overview](#51-entity-relationship-overview)
   - 5.2 [Schema — All 10 Tables](#52-schema--all-10-tables)
   - 5.3 [Normalization Analysis](#53-normalization-analysis)
   - 5.4 [Indexes & Query Optimization](#54-indexes--query-optimization)
   - 5.5 [SQL Table Definitions, Foreign Keys & How They Connect](#55-sql-table-definitions-foreign-keys--how-they-connect)
6. [Core Modules & Features](#6-core-modules--features)
7. [Auction Lifecycle & Allocation Algorithm](#7-auction-lifecycle--allocation-algorithm)
8. [API Reference](#8-api-reference)
9. [Frontend Design](#9-frontend-design)
10. [Security Design](#10-security-design)
11. [Setup & Installation](#11-setup--installation)
12. [Demo Credentials & Seed Data](#12-demo-credentials--seed-data)
13. [Project Structure](#13-project-structure)
14. [Known Limitations & Future Scope](#14-known-limitations--future-scope)

---

## 1. Abstract

This project implements a **real-time, auction-based securities allocation platform** that simulates the mechanics of Initial Public Offering (IPO) bidding and secondary stock auctions. The system models the complete lifecycle of a securities auction — from company listing and administrator-controlled auction opening, through competitive investor bidding, to atomic price-discovery-based share allocation, portfolio tracking, and immutable transaction recording.

The platform demonstrates applied DBMS concepts including relational schema design, referential integrity enforcement, ACID-compliant multi-step transactions, parameterized query security, and JWT-based role-access control — all built on a **10-entity PostgreSQL database** backed by an Express REST API and a React 18 frontend.

---

## 2. Problem Statement & Objectives

### Problem Statement

Traditional IPO allocation systems are opaque, centralized, and inaccessible for study. There is no readily available open-source system that models the full price-discovery auction lifecycle with a proper relational database backend, suitable for academic demonstration.

### Objectives

| # | Objective |
|---|-----------|
| 1 | Design a normalized relational schema (≥ 3NF) covering all entities in a securities auction lifecycle |
| 2 | Implement ACID-compliant share allocation as a single atomic PostgreSQL transaction |
| 3 | Enforce role-based access control (investor vs. admin) at both API and database level |
| 4 | Build a real-time bidding interface with live bid ranking, countdown timers, and subscription tracking |
| 5 | Maintain an immutable audit trail of all share transfers in a `transaction` table |
| 6 | Demonstrate foreign key constraints, check constraints, unique constraints, and index optimization |

---

## 3. System Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                      React 18 Frontend                        │
│                                                               │
│  Pages: Home · Auctions · IPOPage · AuctionDetail            │
│          Portfolio · Transactions · AdminPanel                │
│          Login · Register                                     │
│                                                               │
│  Components: Sidebar · AuctionCard · BidForm · Timer         │
│              BidHistoryTable · ConfirmDialog                  │
│                                                               │
│  State: AuthContext (JWT) · ToastContext                      │
│  HTTP:  Axios + Bearer Token — polls every 3 s               │
└──────────────────────────┬────────────────────────────────────┘
                           │ REST / JSON   port 3000 → 5000
                           │
┌──────────────────────────▼────────────────────────────────────┐
│                  Express 4 Backend (Node.js 18)               │
│                                                               │
│  Middleware:  CORS · JSON parser · JWT auth guard             │
│  Routes:      /api/auth · /api/auctions · /api/bids          │
│               /api/portfolio · /api/transactions              │
│               /api/watchlist                                  │
│  SQL Layer:   node-postgres (pg) · parameterized queries      │
│               Raw SQL — no ORM                                │
└──────────────────────────┬────────────────────────────────────┘
                           │ pg Pool   port 5432
                           │
┌──────────────────────────▼────────────────────────────────────┐
│                    PostgreSQL 15 Database                      │
│                                                               │
│  10 entities · full referential integrity · 9 indexes        │
│  Allocation runs inside BEGIN / COMMIT / ROLLBACK block       │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow — Bid to Allocation

```
Investor places bid
      │
      ▼
POST /api/bids  ──► Validate JWT + role
                ──► Check auction.status = 'open'
                ──► INSERT into bid
                ──► Return updated bid ladder

Admin closes auction
      │
      ▼
PATCH /api/auctions/:id/close
      │
      ▼  BEGIN TRANSACTION
      ├─ UPDATE auction SET status = 'closed'
      ├─ SELECT bids ORDER BY bid_price DESC, bid_time ASC
      ├─ FOR each bid → allocate MIN(qty, remaining)
      ├─ INSERT bid_ranking rows
      ├─ INSERT transaction rows
      ├─ UPSERT portfolio (weighted avg price)
      └─ UPDATE stock.available_shares
         COMMIT  (or ROLLBACK on any error)
```

---

## 4. Technology Stack

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| Database | PostgreSQL | 15 | Full ACID support, rich constraint system, mature JSON support |
| Query Layer | node-postgres (`pg`) | 8.13 | Raw parameterized SQL — no ORM abstraction hiding query behavior |
| Backend Runtime | Node.js | 18 LTS | Non-blocking I/O suits concurrent polling clients |
| Backend Framework | Express | 4.21 | Minimal, composable middleware pipeline |
| Authentication | `jsonwebtoken` + `bcryptjs` | 9.0 / 2.4 | Industry-standard JWT; bcrypt cost-10 prevents rainbow table attacks |
| Frontend Library | React | 19 | Component model suits dynamic, real-time auction UI |
| Routing | React Router DOM | 7 | Declarative SPA routing |
| HTTP Client | Axios | 1.15 | Interceptor support for attaching Bearer tokens globally |
| Styling | CSS Custom Properties | — | Design token system; no build-time dependency |
| Fonts | Inter + JetBrains Mono | — | Professional typographic hierarchy |
| Images | Unsplash API | — | Sector-appropriate photography without licensing overhead |

---

## 5. Database Design

### 5.1 Entity-Relationship Overview

```
┌──────────┐        ┌─────────┐        ┌─────────────┐
│  company │ 1────N │  stock  │ 1────N │  portfolio  │
│          │        │         │        │   (user,    │
│          │ 1────N │   ipo   │        │   stock)    │
└──────────┘        └────┬────┘        └─────────────┘
                         │                     │
                    1    │ N              N     │ 1
                  ┌──────▼──────┐      ┌───────▼──────┐
                  │   auction   │      │     user     │
                  │ (type,      │      │ (investor /  │
                  │  ref_id)    │      │  admin)      │
                  └──────┬──────┘      └───────┬──────┘
                    1    │ N              N     │ 1
                  ┌──────▼──────┐      ┌───────▼──────┐
                  │     bid     │◄─────│   watchlist  │
                  │             │      └──────────────┘
                  └──────┬──────┘
                    1    │ N
               ┌─────────▼──────────┐
               │    bid_ranking     │
               └────────────────────┘
                         │
               ┌─────────▼──────────┐
               │    transaction     │
               └────────────────────┘
```

### 5.2 Schema — All 10 Tables

#### Table 1 — `user`
Stores both investor and admin accounts. Role is enforced by a `CHECK` constraint.

| Column | Type | Constraints |
|--------|------|-------------|
| `user_id` | SERIAL | PRIMARY KEY |
| `name` | VARCHAR(100) | NOT NULL |
| `email` | VARCHAR(150) | UNIQUE, NOT NULL |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL |
| `password` | VARCHAR(255) | NOT NULL (bcrypt hash) |
| `role` | VARCHAR(10) | CHECK IN ('investor','admin'), DEFAULT 'investor' |
| `balance` | DECIMAL(15,2) | CHECK ≥ 0, DEFAULT 1,000,000.00 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### Table 2 — `company`
Master record for every listed entity. Referenced by both `stock` and `ipo`.

| Column | Type | Constraints |
|--------|------|-------------|
| `company_id` | SERIAL | PRIMARY KEY |
| `company_name` | VARCHAR(150) | NOT NULL |
| `ticker` | VARCHAR(20) | UNIQUE, NOT NULL |
| `sector` | VARCHAR(100) | — |
| `description` | TEXT | — |
| `logo_letter` | CHAR(1) | — |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### Table 3 — `stock`
Share inventory for secondary-market stocks. The `UNIQUE(company_id)` constraint enforces one stock record per company.

| Column | Type | Constraints |
|--------|------|-------------|
| `stock_id` | SERIAL | PRIMARY KEY |
| `company_id` | INT | FK → company, UNIQUE, NOT NULL |
| `total_shares` | INT | CHECK > 0, NOT NULL |
| `available_shares` | INT | CHECK ≥ 0, NOT NULL |
| `base_price` | DECIMAL(12,2) | CHECK > 0, NOT NULL |

#### Table 4 — `ipo`
IPO offering window with a price band. After close, a `stock` row is created at the clearing price.

| Column | Type | Constraints |
|--------|------|-------------|
| `ipo_id` | SERIAL | PRIMARY KEY |
| `company_id` | INT | FK → company, NOT NULL |
| `total_shares` | INT | CHECK > 0 |
| `price_band_min` | DECIMAL(12,2) | CHECK > 0 |
| `price_band_max` | DECIMAL(12,2) | CHECK > 0 |
| `start_date` | TIMESTAMPTZ | NOT NULL |
| `end_date` | TIMESTAMPTZ | NOT NULL |
| `status` | VARCHAR(10) | CHECK IN ('open','closed','upcoming') |

#### Table 5 — `auction`
The central scheduling entity. Uses a polymorphic `reference_id` pointing to either `stock.stock_id` or `ipo.ipo_id` depending on `type`.

| Column | Type | Constraints |
|--------|------|-------------|
| `auction_id` | SERIAL | PRIMARY KEY |
| `type` | VARCHAR(10) | CHECK IN ('stock','ipo'), NOT NULL |
| `reference_id` | INT | Polymorphic FK (application-enforced), NOT NULL |
| `start_time` | TIMESTAMPTZ | NOT NULL |
| `end_time` | TIMESTAMPTZ | NOT NULL |
| `base_price` | DECIMAL(12,2) | CHECK > 0 |
| `status` | VARCHAR(10) | CHECK IN ('open','closed','upcoming') |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### Table 6 — `bid`
Every individual bid placed by an investor. Immutable once inserted.

| Column | Type | Constraints |
|--------|------|-------------|
| `bid_id` | SERIAL | PRIMARY KEY |
| `auction_id` | INT | FK → auction (CASCADE) |
| `user_id` | INT | FK → user (CASCADE) |
| `bid_price` | DECIMAL(12,2) | CHECK > 0 |
| `quantity` | INT | CHECK > 0 |
| `bid_time` | TIMESTAMPTZ | DEFAULT NOW() |

#### Table 7 — `bid_ranking`
Post-allocation table populated atomically when an auction closes. Records each bid's rank and how many shares were actually allocated.

| Column | Type | Constraints |
|--------|------|-------------|
| `ranking_id` | SERIAL | PRIMARY KEY |
| `auction_id` | INT | FK → auction (CASCADE) |
| `bid_id` | INT | FK → bid (CASCADE) |
| `rank_position` | INT | NOT NULL |
| `allocated_quantity` | INT | CHECK ≥ 0, DEFAULT 0 |

#### Table 8 — `portfolio`
Holdings per investor per stock. Uses `UNIQUE(user_id, stock_id)` — UPSERTs merge subsequent allocations using a weighted average price formula.

| Column | Type | Constraints |
|--------|------|-------------|
| `portfolio_id` | SERIAL | PRIMARY KEY |
| `user_id` | INT | FK → user (CASCADE) |
| `stock_id` | INT | FK → stock (CASCADE) |
| `quantity_owned` | INT | CHECK ≥ 0, DEFAULT 0 |
| `avg_price` | DECIMAL(12,2) | CHECK ≥ 0, DEFAULT 0 |

#### Table 9 — `transaction`
Immutable audit log. One row per allocation event; never updated or deleted.

| Column | Type | Constraints |
|--------|------|-------------|
| `transaction_id` | SERIAL | PRIMARY KEY |
| `user_id` | INT | FK → user (CASCADE) |
| `auction_id` | INT | FK → auction (CASCADE) |
| `quantity` | INT | CHECK > 0 |
| `price` | DECIMAL(12,2) | CHECK > 0 |
| `total_amount` | DECIMAL(15,2) | CHECK > 0 |
| `transaction_date` | TIMESTAMPTZ | DEFAULT NOW() |

#### Table 10 — `watchlist`
Investor interest list. `UNIQUE(user_id, stock_id)` prevents duplicate entries.

| Column | Type | Constraints |
|--------|------|-------------|
| `watchlist_id` | SERIAL | PRIMARY KEY |
| `user_id` | INT | FK → user (CASCADE) |
| `stock_id` | INT | FK → stock (CASCADE) |
| `added_date` | TIMESTAMPTZ | DEFAULT NOW() |

---

### 5.3 Normalization Analysis

**First Normal Form (1NF):** All attributes are atomic and single-valued. No repeating groups — each bid is a separate row, each allocation is a separate `bid_ranking` row.

**Second Normal Form (2NF):** No partial dependencies. Every non-key attribute depends on the full primary key. Composite unique constraints (`user_id, stock_id` in `portfolio` and `watchlist`) are enforced without creating functional dependencies on subsets.

**Third Normal Form (3NF):** No transitive dependencies. Company information (name, ticker, sector) lives solely in `company` and is never repeated. Price information is not duplicated between `ipo` and `auction` — `auction.base_price` stores the opening price at auction creation time independently.

**BCNF consideration:** The polymorphic `auction.reference_id` is the one area where strict BCNF is relaxed for pragmatism. A fully normalized approach would use separate `stock_auction` and `ipo_auction` tables; the `type` discriminator column is used instead, documented as an intentional design trade-off.

---

### 5.4 Indexes & Query Optimization

Nine indexes are defined to optimize the most frequent query paths:

| Index | Table.Column | Optimizes |
|-------|-------------|-----------|
| `idx_bid_auction` | `bid(auction_id)` | Bid ladder fetch per auction (high frequency) |
| `idx_bid_user` | `bid(user_id)` | User bid history |
| `idx_auction_status` | `auction(status)` | Filter live/upcoming/closed auctions |
| `idx_auction_type` | `auction(type)` | Filter stock vs. IPO auctions |
| `idx_portfolio_user` | `portfolio(user_id)` | Portfolio fetch per investor |
| `idx_transaction_user` | `transaction(user_id)` | Transaction history per investor |
| `idx_transaction_auction` | `transaction(auction_id)` | Allocation audit per auction |
| `idx_watchlist_user` | `watchlist(user_id)` | Watchlist fetch |
| `idx_bid_ranking_auction` | `bid_ranking(auction_id)` | Post-close allocation lookup |

---

### 5.5 SQL Table Definitions, Foreign Keys & How They Connect

This section presents the exact `CREATE TABLE` DDL for every entity, documents every foreign key relationship, and explains what each connection means at the application level.

---

#### Master Foreign Key Reference

| FK Column | Table | References | On Delete | What it means |
|-----------|-------|-----------|-----------|---------------|
| `company_id` | `stock` | `company(company_id)` | CASCADE | Deleting a company removes its share inventory |
| `company_id` | `ipo` | `company(company_id)` | CASCADE | Deleting a company removes its IPO record |
| `auction_id` | `bid` | `auction(auction_id)` | CASCADE | Deleting an auction removes all bids placed in it |
| `user_id` | `bid` | `user(user_id)` | CASCADE | Deleting a user removes all their bids |
| `auction_id` | `bid_ranking` | `auction(auction_id)` | CASCADE | Allocation results are tied to the auction lifetime |
| `bid_id` | `bid_ranking` | `bid(bid_id)` | CASCADE | A ranking row cannot exist without its source bid |
| `user_id` | `portfolio` | `user(user_id)` | CASCADE | Deleting a user removes their holdings |
| `stock_id` | `portfolio` | `stock(stock_id)` | CASCADE | Deleting a stock removes it from all portfolios |
| `user_id` | `transaction` | `user(user_id)` | CASCADE | Deleting a user removes their transaction history |
| `auction_id` | `transaction` | `auction(auction_id)` | CASCADE | Transactions are linked to the auction that generated them |
| `user_id` | `watchlist` | `user(user_id)` | CASCADE | Deleting a user clears their watchlist |
| `stock_id` | `watchlist` | `stock(stock_id)` | CASCADE | Deleting a stock removes it from all watchlists |
| `reference_id` | `auction` | *(polymorphic — app-enforced)* | — | Points to `stock.stock_id` OR `ipo.ipo_id` based on `type` column |

---

#### Table 1 — `user`

```sql
CREATE TABLE IF NOT EXISTS "user" (
    user_id   SERIAL PRIMARY KEY,
    name      VARCHAR(100)    NOT NULL,
    email     VARCHAR(150)    UNIQUE NOT NULL,
    username  VARCHAR(50)     UNIQUE NOT NULL,
    password  VARCHAR(255)    NOT NULL,
    role      VARCHAR(10)     DEFAULT 'investor'
                              CHECK (role IN ('investor', 'admin')),
    balance   DECIMAL(15, 2)  DEFAULT 1000000.00
                              CHECK (balance >= 0),
    created_at TIMESTAMPTZ    DEFAULT CURRENT_TIMESTAMP
);
```

**How it connects:**

```
user (user_id)
  ├──► bid.user_id          — every bid they place
  ├──► portfolio.user_id    — their share holdings
  ├──► transaction.user_id  — every share allocation received
  └──► watchlist.user_id    — stocks they are watching
```

`user` is the **root actor** in the system. All investor activity (bidding, portfolio, transactions, watchlist) traces back to a `user_id`. The `role` column (`investor` vs `admin`) determines which API routes are accessible — it is set server-side on registration and never accepted from the client. The `balance` column is validated when a bid is placed (the bid total must fit within the balance) and debited during allocation when shares are awarded; the `CHECK (balance >= 0)` constraint prevents it from ever going negative.

---

#### Table 2 — `company`

```sql
CREATE TABLE IF NOT EXISTS company (
    company_id   SERIAL PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    ticker       VARCHAR(20)  UNIQUE NOT NULL,
    sector       VARCHAR(100),
    description  TEXT,
    logo_letter  CHAR(1),
    created_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);
```

**How it connects:**

```
company (company_id)
  ├──► stock.company_id   — its secondary-market share record (max 1, enforced by UNIQUE)
  └──► ipo.company_id     — its IPO offering window (can have multiple over time)
```

`company` is the **master catalogue** for all listed entities. It is never referenced directly by `auction`, `bid`, or `portfolio` — those tables always go through `stock` or `ipo`. The `ticker` column has a `UNIQUE` constraint to prevent duplicate exchange symbols. `logo_letter` stores a single capital letter used by the frontend as a fallback avatar when no image is available.

---

#### Table 3 — `stock`

```sql
CREATE TABLE IF NOT EXISTS stock (
    stock_id         SERIAL PRIMARY KEY,
    company_id       INT            NOT NULL UNIQUE,
    total_shares     INT            NOT NULL CHECK (total_shares > 0),
    available_shares INT            NOT NULL CHECK (available_shares >= 0),
    base_price       DECIMAL(12, 2) NOT NULL CHECK (base_price > 0),
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE
);
```

**How it connects:**

```
company (company_id)
  └──► stock.company_id          (UNIQUE — enforces one stock row per company)

stock (stock_id)
  ├──► portfolio.stock_id        — investor holdings of this stock
  ├──► watchlist.stock_id        — investors watching this stock
  └──► auction.reference_id      — when auction.type = 'stock'
```

`stock` represents the **live share inventory** for a company that is already publicly traded. The `UNIQUE(company_id)` constraint is critical — it prevents two separate share records from existing for the same company. During auction close, `available_shares` is decremented by the total shares allocated. `base_price` is used as the portfolio's simulated current price (`base_price × 1.05`) in the frontend.

**IPO → Stock promotion:** When an IPO auction closes, the backend checks whether a `stock` row already exists for that company. If not, it creates one at the clearing price. This is the only moment a `stock` row is created through application logic rather than being seeded directly.

---

#### Table 4 — `ipo`

```sql
CREATE TABLE IF NOT EXISTS ipo (
    ipo_id         SERIAL PRIMARY KEY,
    company_id     INT            NOT NULL,
    total_shares   INT            NOT NULL CHECK (total_shares > 0),
    price_band_min DECIMAL(12, 2) NOT NULL CHECK (price_band_min > 0),
    price_band_max DECIMAL(12, 2) NOT NULL CHECK (price_band_max > 0),
    start_date     TIMESTAMPTZ    NOT NULL,
    end_date       TIMESTAMPTZ    NOT NULL,
    status         VARCHAR(10)    DEFAULT 'upcoming'
                                  CHECK (status IN ('open', 'closed', 'upcoming')),
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE
);
```

**How it connects:**

```
company (company_id)
  └──► ipo.company_id            (N relationship — a company can have successive IPOs)

ipo (ipo_id)
  └──► auction.reference_id      — when auction.type = 'ipo'
```

`ipo` defines the **offering window** for a company going public. Unlike `stock`, it has a price band (`price_band_min` / `price_band_max`) rather than a single price, because the clearing price is discovered through the auction. The `total_shares` column here is the offering size; after close this becomes the initial `stock.total_shares`. The `status` field mirrors the linked `auction.status` but is maintained independently for the IPO page display.

---

#### Table 5 — `auction`

```sql
CREATE TABLE IF NOT EXISTS auction (
    auction_id   SERIAL PRIMARY KEY,
    type         VARCHAR(10)    NOT NULL CHECK (type IN ('stock', 'ipo')),
    reference_id INT            NOT NULL,
    start_time   TIMESTAMPTZ    NOT NULL,
    end_time     TIMESTAMPTZ    NOT NULL,
    base_price   DECIMAL(12, 2) NOT NULL CHECK (base_price > 0),
    status       VARCHAR(10)    DEFAULT 'upcoming'
                                CHECK (status IN ('open', 'closed', 'upcoming')),
    created_at   TIMESTAMPTZ    DEFAULT CURRENT_TIMESTAMP
);
```

**How it connects:**

```
auction (reference_id + type)
  ├──► stock(stock_id)        when type = 'stock'
  └──► ipo(ipo_id)            when type = 'ipo'

auction (auction_id)
  ├──► bid.auction_id         — all bids placed in this auction
  ├──► bid_ranking.auction_id — allocation results after close
  └──► transaction.auction_id — share transfer records
```

`auction` is the **central scheduling and state-machine entity**. It uses a **polymorphic foreign key** — `reference_id` points to either `stock.stock_id` or `ipo.ipo_id` depending on the `type` discriminator. This is an intentional design trade-off: a fully normalised schema would use separate `stock_auction` and `ipo_auction` tables, but the single-table approach simplifies querying the auction list page. Referential integrity for `reference_id` is enforced in application code rather than at the database level (documented in §14 limitations).

**State transitions:**

```
UPCOMING ──► OPEN ──► CLOSED
             (admin) (admin, triggers allocation transaction)
```

---

#### Table 6 — `bid`

```sql
CREATE TABLE IF NOT EXISTS bid (
    bid_id    SERIAL PRIMARY KEY,
    auction_id INT            NOT NULL,
    user_id    INT            NOT NULL,
    bid_price  DECIMAL(12, 2) NOT NULL CHECK (bid_price > 0),
    quantity   INT            NOT NULL CHECK (quantity > 0),
    bid_time   TIMESTAMPTZ    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auction(auction_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES "user"(user_id)    ON DELETE CASCADE
);
```

**How it connects:**

```
auction (auction_id) ──► bid.auction_id   (which auction this bid belongs to)
user    (user_id)    ──► bid.user_id      (who placed the bid)

bid (bid_id)
  └──► bid_ranking.bid_id                 (the allocation result for this bid)
```

`bid` records every **individual offer** placed by an investor. Bids are **immutable** — there is no UPDATE or DELETE path in the application once a bid is inserted. The combination of `bid_price DESC, bid_time ASC` is the sort order used by the allocation algorithm: higher prices win first, with earlier submission time as a FIFO tiebreaker. `CHECK (bid_price > 0)` and `CHECK (quantity > 0)` prevent nonsensical bids at the database level.

---

#### Table 7 — `bid_ranking`

```sql
CREATE TABLE IF NOT EXISTS bid_ranking (
    ranking_id         SERIAL PRIMARY KEY,
    auction_id         INT NOT NULL,
    bid_id             INT NOT NULL,
    rank_position      INT NOT NULL,
    allocated_quantity INT DEFAULT 0 CHECK (allocated_quantity >= 0),
    FOREIGN KEY (auction_id) REFERENCES auction(auction_id) ON DELETE CASCADE,
    FOREIGN KEY (bid_id)     REFERENCES bid(bid_id)         ON DELETE CASCADE
);
```

**How it connects:**

```
auction (auction_id) ──► bid_ranking.auction_id   (which auction's results)
bid     (bid_id)     ──► bid_ranking.bid_id        (which bid was ranked)
```

`bid_ranking` is **populated atomically** during auction close — it is never written to during the open bidding phase. Each row records a bid's final rank and exactly how many shares were allocated to it. Only bids that receive at least one share get a `bid_ranking` row; bids that win nothing (supply exhausted before their turn, or the bidder cannot afford any shares) are skipped. The double FK to both `auction` and `bid` allows the Admin Panel to join directly to the ranking without re-sorting all bids.

---

#### Table 8 — `portfolio`

```sql
CREATE TABLE IF NOT EXISTS portfolio (
    portfolio_id   SERIAL PRIMARY KEY,
    user_id        INT            NOT NULL,
    stock_id       INT            NOT NULL,
    quantity_owned INT            NOT NULL DEFAULT 0 CHECK (quantity_owned >= 0),
    avg_price      DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (avg_price >= 0),
    FOREIGN KEY (user_id)  REFERENCES "user"(user_id)   ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stock(stock_id)   ON DELETE CASCADE,
    UNIQUE (user_id, stock_id)
);
```

**How it connects:**

```
user  (user_id)  ──► portfolio.user_id    (whose holdings)
stock (stock_id) ──► portfolio.stock_id   (which stock is held)
```

`portfolio` is the **holdings ledger** — one row per (investor, stock) pair, enforced by `UNIQUE(user_id, stock_id)`. When a second allocation arrives for the same stock, the backend performs an **UPSERT** (INSERT … ON CONFLICT DO UPDATE) and recalculates the weighted average price:

```
new_avg = (old_qty × old_avg + new_qty × new_price) / (old_qty + new_qty)
```

This means `portfolio` always holds the blended cost basis across multiple auction wins. The `stock_id` FK (not `auction_id`) means portfolio tracks the underlying asset, not the event that created it — allowing a single row to accumulate shares from multiple auctions of the same stock.

---

#### Table 9 — `transaction`

```sql
CREATE TABLE IF NOT EXISTS "transaction" (
    transaction_id   SERIAL PRIMARY KEY,
    user_id          INT            NOT NULL,
    auction_id       INT            NOT NULL,
    quantity         INT            NOT NULL CHECK (quantity > 0),
    price            DECIMAL(12, 2) NOT NULL CHECK (price > 0),
    total_amount     DECIMAL(15, 2) NOT NULL CHECK (total_amount > 0),
    transaction_date TIMESTAMPTZ    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES "user"(user_id)       ON DELETE CASCADE,
    FOREIGN KEY (auction_id) REFERENCES auction(auction_id)   ON DELETE CASCADE
);
```

**How it connects:**

```
user    (user_id)    ──► transaction.user_id     (who received the shares)
auction (auction_id) ──► transaction.auction_id  (which auction generated it)
```

`transaction` is the **immutable audit log** — one INSERT per allocated investor per closed auction, never updated or deleted. It stores the exact price paid (the investor's bid price, not a market price) and the `total_amount` (`quantity × price`) for accounting. The Transactions page joins `transaction` with `auction → stock/ipo → company` to display the company name and ticker alongside each allocation event. Three `CHECK` constraints (`quantity > 0`, `price > 0`, `total_amount > 0`) ensure no zero-value records can exist.

---

#### Table 10 — `watchlist`

```sql
CREATE TABLE IF NOT EXISTS watchlist (
    watchlist_id SERIAL PRIMARY KEY,
    user_id      INT         NOT NULL,
    stock_id     INT         NOT NULL,
    added_date   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES "user"(user_id)   ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stock(stock_id)   ON DELETE CASCADE,
    UNIQUE (user_id, stock_id)
);
```

**How it connects:**

```
user  (user_id)  ──► watchlist.user_id    (whose watchlist)
stock (stock_id) ──► watchlist.stock_id   (which stock is being tracked)
```

`watchlist` is a simple **interest junction table** between `user` and `stock`. The `UNIQUE(user_id, stock_id)` constraint ensures duplicate entries are impossible — adding the same stock twice is a no-op at the database level. Unlike `portfolio`, which records actual ownership, `watchlist` carries no quantity or price — it is purely informational. Because it references `stock` directly, only secondary-market stocks can be watched; companies that exist only in the IPO phase do not yet have a `stock` row.

---

#### How the Tables Work Together — Key Flows

**Flow 1 — Investor places a bid**

```
POST /api/bids
│
├─ Validate JWT → resolve user_id from token
├─ SELECT auction WHERE auction_id = $1 AND status = 'open'
│    auction ──► (reference_id + type) ──► stock or ipo
├─ INSERT INTO bid (auction_id, user_id, bid_price, quantity)
└─ SELECT bids ORDER BY bid_price DESC → return ranked list to client
```

Tables touched: `auction`, `bid`, `user`

---

**Flow 2 — Admin closes an auction (atomic allocation)**

```
PATCH /api/auctions/:id/close
│
BEGIN TRANSACTION
├─ UPDATE auction SET status = 'closed'
├─ Fetch share pool:
│    type='stock' → SELECT available_shares FROM stock WHERE stock_id = reference_id
│    type='ipo'   → SELECT total_shares      FROM ipo   WHERE ipo_id  = reference_id
├─ SELECT * FROM bid WHERE auction_id = $1 ORDER BY bid_price DESC, bid_time ASC
│
├─ IPO only: resolve settlement stock row (INSERT/UPSERT at clearing price)
│
├─ FOR each bid (price-time priority):
│    allocated = MIN(bid.quantity, remaining, FLOOR(user.balance / bid_price))
│    (skip bidder if allocated <= 0)
│    INSERT INTO bid_ranking  (auction_id, bid_id, rank_position, allocated_quantity)
│    INSERT INTO "transaction" (user_id, auction_id, quantity, price, total_amount)
│    INSERT INTO portfolio … ON CONFLICT (user_id, stock_id) DO UPDATE
│         SET quantity_owned = quantity_owned + excluded.quantity_owned,
│             avg_price      = weighted_avg_formula
│    UPDATE "user" SET balance = balance - (allocated × bid_price)
│
└─ UPDATE stock SET available_shares = remaining   (stock and IPO settlement rows)
COMMIT
```

Tables touched: `auction`, `bid`, `bid_ranking`, `transaction`, `portfolio`, `stock`, `ipo`, `user`

---

**Flow 3 — Investor views their portfolio**

```
GET /api/portfolio
│
SELECT p.*, s.base_price, s.company_id, c.company_name, c.ticker, c.sector
FROM   portfolio p
JOIN   stock   s ON s.stock_id  = p.stock_id
JOIN   company c ON c.company_id = s.company_id
WHERE  p.user_id = $1
```

Tables joined: `portfolio` → `stock` → `company`

---

**Flow 4 — Transaction history (Transactions page)**

```
GET /api/transactions
│
SELECT t.*, c.company_name, c.ticker
FROM   "transaction" t
JOIN   auction a  ON a.auction_id  = t.auction_id
JOIN   stock   s  ON s.stock_id    = a.reference_id   (when a.type = 'stock')
 (OR)  ipo     i  ON i.ipo_id      = a.reference_id   (when a.type = 'ipo')
JOIN   company c  ON c.company_id  = s.company_id (or i.company_id)
WHERE  t.user_id = $1
ORDER BY t.transaction_date DESC
```

Tables joined: `transaction` → `auction` → `stock`/`ipo` → `company`

---

#### Complete Relationship Map (All 12 FKs)

```
"user"
  user_id ─────────────────────────────────────────────────────────┐
    │                                                               │
    ├─[FK]──► bid.user_id                                          │
    ├─[FK]──► portfolio.user_id                                    │
    ├─[FK]──► transaction.user_id                                  │
    └─[FK]──► watchlist.user_id                                    │
                                                                   │
company                                                            │
  company_id                                                       │
    ├─[FK]──► stock.company_id  (UNIQUE — 1:1)                    │
    └─[FK]──► ipo.company_id                                       │
                                                                   │
stock                                                              │
  stock_id                                                         │
    ├─[FK]──► portfolio.stock_id                                   │
    ├─[FK]──► watchlist.stock_id                                   │
    └─[poly]─► auction.reference_id  (when type='stock')          │
                                                                   │
ipo                                                                │
  ipo_id                                                           │
    └─[poly]─► auction.reference_id  (when type='ipo')            │
                                                                   │
auction                                                            │
  auction_id                                                       │
    ├─[FK]──► bid.auction_id                                       │
    ├─[FK]──► bid_ranking.auction_id                               │
    └─[FK]──► transaction.auction_id                               │
                                                                   │
bid                                                                │
  bid_id                                                           │
    └─[FK]──► bid_ranking.bid_id         ◄────────────────────────┘
```

---

## 6. Core Modules & Features

### 6.1 Authentication Module
- **Registration:** Accepts `name`, `username`, `email`, `password`. Role is server-assigned as `investor`; client-supplied role is ignored.
- **Login:** Verifies password against bcrypt hash. Returns a signed JWT containing `user_id` and `role`.
- **Auth guard middleware:** All protected routes validate the `Authorization: Bearer <token>` header before processing.

### 6.2 Auction Management (Admin)
- Create auction with company details, sector, type (stock/IPO), share count, base price, and time window.
- **Open:** Transition `upcoming → open`. Investors can now bid.
- **Close:** Runs the atomic allocation transaction (see §7).
- Live Monitor view shows real-time bid ladder for all open auctions with 3-second polling.

### 6.3 Bidding System (Investor)
- Investors place bids specifying price per share and quantity.
- Bid price must exceed the current highest bid (enforced in application layer).
- Bids are immutable — no cancellation once placed.
- BidForm provides quick-fill helpers: `+₹0.50`, `+1%`, `+5%`, and MAX quantity button.
- Live bid ladder updates every 3 seconds; polling pauses when the browser tab is hidden (Page Visibility API).

### 6.4 Portfolio & P&L Tracking
- Displays all holdings allocated from closed auctions.
- **Current price** is simulated at `base_price × 1.05` (demonstrating the concept; not live market data).
- Weighted average price is computed on UPSERT: `(old_qty × old_avg + new_qty × new_price) / (old_qty + new_qty)`.
- Portfolio composition bar shows proportional allocation across all holdings.
- Cards view and Table view toggle.

### 6.5 Transaction History
- Immutable audit log showing every share allocation received.
- Displays: company, shares allocated, price per share, total amount, and timestamp.
- Summary statistics: total transactions, unique companies, total capital invested.

### 6.6 Watchlist
- Investors can add and remove stocks from a personal watch list.
- Implemented as a `UNIQUE(user_id, stock_id)` junction table to prevent duplicates.

### 6.7 Offline / Demo Mode
- The frontend supports `REACT_APP_USE_DUMMY=true` environment variable to serve mock data from `src/data/dummyData.js` without a running backend. Useful for UI-only demos.

---

## 7. Auction Lifecycle & Allocation Algorithm

### State Machine

```
  ┌──────────┐    Admin opens    ┌──────┐    Admin closes    ┌────────┐
  │ UPCOMING │ ───────────────►  │ OPEN │ ────────────────►  │ CLOSED │
  └──────────┘                   └──────┘                    └────────┘
```

### Allocation Algorithm (Price-Time Priority)

When an admin closes an auction, the following steps execute atomically within a **single PostgreSQL transaction**:

```
BEGIN;

1. UPDATE auction SET status = 'closed' WHERE auction_id = $1

2. Fetch available capacity:
   - stock auction → stock.available_shares
   - IPO auction   → ipo.total_shares  (and mark ipo.status = 'closed')

3. SELECT bids WHERE auction_id = $1
   ORDER BY bid_price DESC, bid_time ASC
   -- Price priority; time as tiebreaker (FIFO)

4. IPO only: resolve the settlement stock row once, before the loop —
   INSERT a stock row at the clearing price (or UPSERT if one exists)

5. FOR each bid (in rank order):
     IF remaining_shares <= 0: BREAK
     affordable = FLOOR(user.balance / bid.bid_price)
     allocated  = MIN(bid.quantity, remaining_shares, affordable)
     IF allocated <= 0: CONTINUE          -- can't afford any → skip this bidder
       INSERT INTO bid_ranking (rank_position, allocated_quantity)
       INSERT INTO transaction (user_id, quantity, price, total_amount)
       UPSERT  portfolio (weighted avg price merge)
       UPDATE  "user" SET balance = balance - (allocated × bid_price)
       remaining_shares -= allocated

6. UPDATE stock SET available_shares = remaining_shares
   -- applies to BOTH stock and IPO settlement rows, so leftover shares are preserved

COMMIT;  -- or ROLLBACK on any error
```

**Key properties:**
- All-or-nothing: a failure at any step rolls back the entire allocation.
- Partial allocation is supported: a bid may receive fewer shares than requested if supply runs out mid-ranking.
- Bids that win no shares (supply exhausted, or the bidder cannot afford any) are skipped — they receive no `bid_ranking` row.
- Affordability cap: each winner's allocation is limited to what their `balance` can cover, and their balance is debited by `allocated_quantity × bid_price` inside the same transaction.
- The clearing price for IPOs is the price at which the last share was allocated (highest bid that received at least one share).

---

## 8. API Reference

Base URL: `http://localhost:5000/api`

All protected endpoints require: `Authorization: Bearer <jwt_token>`

### Authentication

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| `POST` | `/auth/register` | — | `{name, username, email, password}` | Create investor account |
| `POST` | `/auth/login` | — | `{username, password}` | Returns `{user, token}` |

### Auctions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/auctions` | — | List all auctions. Query: `?type=stock\|ipo`, `?status=open\|upcoming\|closed` |
| `GET` | `/auctions/:id` | — | Single auction with full metadata and bid summary |
| `POST` | `/auctions` | Admin | Create auction + company in one request |
| `PATCH` | `/auctions/:id/open` | Admin | Transition `upcoming → open` |
| `PATCH` | `/auctions/:id/close` | Admin | Close + run atomic allocation |

### Bids

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| `GET` | `/bids?auctionId=` | Investor | — | Ranked bid list for an auction |
| `GET` | `/bids/all` | Admin | — | All bids across all auctions |
| `POST` | `/bids` | Investor | `{auctionId, price, quantity}` | Place a bid |

### Portfolio & Transactions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/portfolio` | Investor | Holdings with simulated current price |
| `GET` | `/transactions` | Investor | Full allocation history |

### Watchlist

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| `GET` | `/watchlist` | Investor | — | Get investor's watchlist |
| `POST` | `/watchlist` | Investor | `{stockId}` | Add stock to watchlist |
| `DELETE` | `/watchlist/:stockId` | Investor | — | Remove from watchlist |

### Response Envelope

All endpoints return JSON. Success:
```json
{ "data": <payload>, "message": "..." }
```
Error:
```json
{ "error": "human-readable message" }
```
HTTP status codes: `200` OK · `201` Created · `400` Bad Request · `401` Unauthorized · `403` Forbidden · `404` Not Found · `500` Internal Server Error

---

## 9. Frontend Design

### Page Map

All application routes except `/login` and `/register` are wrapped in a `PrivateRoute` guard (redirects to `/login` when unauthenticated); `/admin` additionally requires the `admin` role via `AdminRoute`.

| Route | Page | Access | Description |
|-------|------|--------|-------------|
| `/` | Home | Authenticated | Market overview — stat cards, live auction grid, market pulse sidebar |
| `/auctions` | Auctions | Authenticated | Filterable stock auction list with search and sort |
| `/ipo` | IPOPage | Authenticated | IPO-specific auction list with price band visualization |
| `/auction/:id` | AuctionDetail | Authenticated | Live bid ladder, order entry panel, countdown timer |
| `/portfolio` | Portfolio | Authenticated | Holdings grid/table with P&L and composition bar |
| `/transactions` | Transactions | Authenticated | Allocation history table with totals |
| `/admin` | AdminPanel | Admin | Live monitor, manage table, create auction form |
| `/login` | Login | Public | Photography split-screen with demo account quick-fill |
| `/register` | Register | Public | Split-screen registration form |

### Design System

The UI uses a **CSS custom properties design token system** defined in `src/index.css`:

```css
--bg-primary:   #f1f5f9   /* Page background — light slate  */
--bg-card:      #ffffff   /* Card surfaces                  */
--bg-sidebar:   #0f172a   /* Sidebar — deliberately dark    */
--accent:       #2563eb   /* Primary interactive colour     */
--green:        #16a34a   /* Positive / live indicators     */
--red:          #dc2626   /* Negative / danger              */
--yellow:       #d97706   /* Warning / urgent timer         */
--font-mono:    'JetBrains Mono', monospace
```

### Key UI Components

- **AuctionCard** — sector photograph banner (Unsplash), glassmorphism company avatar, live price, subscription progress bar.
- **Timer** — three-segment HH/MM/SS display. Transitions: normal (blue) → urgent <10 min (yellow) → critical <1 min (red, pulsing).
- **BidForm** — quick-fill price buttons (`+₹0.50`, `+1%`, `+5%`), MAX quantity, animated total investment display.
- **Sidebar** — fixed dark sidebar with role-conditional navigation links and live indicator badge.
- **ConfirmDialog** — modal confirmation for destructive admin actions (auction close).

### Real-Time Strategy

The frontend uses **polling every 3 seconds** via `setInterval`. The Page Visibility API (`visibilitychange` event) pauses polling when the tab is hidden and resumes when the user returns — reducing unnecessary server load.

---

## 10. Security Design

| Concern | Implementation |
|---------|----------------|
| Password storage | `bcryptjs` hash at cost factor 10 — no plain-text fallback, no MD5/SHA1 |
| SQL injection | 100% parameterized queries (`$1`, `$2`, …) — no string interpolation in any SQL |
| Role elevation | `role` is stripped from registration payload server-side; always set to `investor` |
| API authorization | JWT middleware validates signature and expiry before every protected handler |
| Admin-only routes | `/auctions` POST/PATCH and `/bids/all` check `req.user.role === 'admin'` |
| CORS | Restricted to `ALLOWED_ORIGIN` env var (defaults `http://localhost:3000`) |
| Secrets management | `JWT_SECRET` and DB credentials loaded from `.env`; server emits a startup warning if `JWT_SECRET` is absent |
| Token storage | Frontend stores the JWT in `localStorage` (persists across refresh). An Axios response interceptor clears it and redirects to `/login` on any `401`. Note: `localStorage` is readable by JavaScript, so this trades XSS resistance for session persistence — an httpOnly cookie would be the hardened alternative |

---

## 11. Setup & Installation

### Prerequisites

- **Node.js** 18 or higher
- **PostgreSQL** 15 or higher
- **npm** 9 or higher

---

### Step 1 — Clone / Extract

```
dbms/
├── auction-backend/
└── auction-frontend/
```

---

### Step 2 — Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE auction_system;"

# Apply schema + seed data (runs all 10 CREATE TABLE statements + INSERT seed rows)
psql -U postgres -d auction_system -f auction-backend/schema.sql
```

---

### Step 3 — Backend

```bash
cd auction-backend
npm install
```

Create `auction-backend/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=auction_system
DB_PORT=5432
JWT_SECRET=replace-with-a-long-random-secret-string
ALLOWED_ORIGIN=http://localhost:3000
```

Start the server:

```bash
node server.js
# → Server running on port 5000
# → Connected to PostgreSQL: auction_system
```

---

### Step 4 — Frontend

```bash
cd auction-frontend
npm install
```

Create `auction-frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api

# Optional: run without backend using local mock data
# REACT_APP_USE_DUMMY=true
```

Start the development server:

```bash
npm start
# → Compiled successfully
# → http://localhost:3000
```

---

### Quick Reference — All Commands

```bash
# Terminal 1: Database (one-time)
psql -U postgres -c "CREATE DATABASE auction_system;"
psql -U postgres -d auction_system -f auction-backend/schema.sql

# Terminal 2: Backend
cd auction-backend && node server.js

# Terminal 3: Frontend
cd auction-frontend && npm start
```

---

## 12. Demo Credentials & Seed Data

### User Accounts

| Role | Username | Password | Starting Balance |
|------|----------|----------|-----------------|
| Admin | `admin` | `admin123` | ₹50,00,000 |
| Investor | `rajesh` | `pass123` | ₹15,00,000 |
| Investor | `priya` | `pass123` | ₹20,00,000 |
| Investor | `amit` | `pass123` | ₹12,00,000 |

> Passwords are stored as `bcrypt` hashes (cost 10) — never in plain text.

### Pre-seeded Companies

| Company | Ticker | Sector | Type |
|---------|--------|--------|------|
| NovaTech Solutions | NVTS | Information Technology | Stock (live auction) |
| GreenFuel Energy | GRFE | Clean Energy | Stock (live auction) |
| QuantumPay Financial | QPFL | Fintech | IPO (live auction) |
| MedGenix Pharma | MGPX | Pharmaceuticals | IPO (already closed — has portfolio/transaction data) |
| SpaceLogix Infra | SPLI | Infrastructure | Stock (live auction) |
| CyberShield Tech | CSHT | Cybersecurity | IPO (upcoming) |

### Pre-seeded State

- **4 live auctions** with active bids from seed investors
- **1 closed IPO** (MedGenix) with allocation data — portfolio and transaction records pre-populated for `amit` and `rajesh`
- **1 upcoming IPO** (CyberShield) — demonstrates the `upcoming` state
- **5 watchlist entries** across investors

---

## 13. Project Structure

```
dbms/
│
├── README.md                          ← This report
│
├── auction-backend/
│   ├── server.js                      ← Express app: all route handlers, middleware, DB pool
│   ├── schema.sql                     ← DDL (10 tables) + constraints + indexes + seed data
│   ├── package.json
│   ├── .env                           ← DB credentials + JWT secret (not committed)
│   └── .gitignore
│
└── auction-frontend/
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        │
        ├── index.js                   ← React entry point
        ├── index.css                  ← Design token system + all utility classes
        ├── App.js                     ← Router, layout (Sidebar + main area), protected routes
        │
        ├── pages/
        │   ├── Home.js                ← Market overview: stat cards, live auction grid, pulse panel
        │   ├── Auctions.js            ← Stock auctions: search, filter, sort
        │   ├── IPOPage.js             ← IPO auctions: price band visualizer, sector photos
        │   ├── AuctionDetail.js       ← Live bid ladder, BidForm, countdown timer
        │   ├── Portfolio.js           ← Holdings cards + table, P&L, composition bar
        │   ├── Transactions.js        ← Allocation history table with totals
        │   ├── AdminPanel.js          ← Live monitor, manage table, create auction form
        │   ├── Login.js               ← Photography split-screen, demo quick-fill
        │   └── Register.js            ← Registration form with feature highlights
        │
        ├── components/
        │   ├── Sidebar.js             ← Fixed dark sidebar, role-conditional nav
        │   ├── AuctionCard.js         ← Photo banner card with price, progress, CTA
        │   ├── BidForm.js             ← Order entry: price/qty inputs, quick-fill, total
        │   ├── Timer.js               ← HH:MM:SS countdown with urgency state transitions
        │   ├── BidHistoryTable.js     ← Ranked bid table with depth bars
        │   ├── ConfirmDialog.js       ← Modal confirmation for destructive actions
        │   └── Navbar.js              ← (Legacy — replaced by Sidebar)
        │
        ├── context/
        │   └── AppContext.js          ← AuthContext (JWT, user), ToastContext (notifications)
        │
        ├── services/
        │   └── api.js                 ← Axios instance + all API call functions + dummy data layer
        │
        ├── utils/
        │   └── images.js              ← Centralised Unsplash sector-photo URL builder
        │
        └── data/
            └── dummyData.js           ← Static mock data (opt-in via REACT_APP_USE_DUMMY)
```

---

## 14. Known Limitations & Future Scope

### Current Limitations

| Limitation | Detail |
|-----------|--------|
| Polymorphic FK | `auction.reference_id` has no DB-level constraint — referential integrity for this column is enforced in application code only |
| Simulated current price | `portfolio.currentPrice = base_price × 1.05` — a static approximation, not live market data |
| No bid cancellation | Once placed, a bid is permanent for the auction's duration |
| Long-polling only | Real-time updates use 3-second client polling. No WebSocket push — latency up to 3 s |
| Balance not escrowed | Balance is validated at bid time and debited on allocation (allocation is capped by what each winner can afford), but funds are **not reserved** when a bid is placed — a user may hold multiple outstanding bids whose combined total exceeds their balance until allocation caps them |
| Single server | No load balancing or horizontal scaling — single Node.js process |
| No email verification | User registration does not verify email address |

### Future Scope

| Enhancement | Description |
|------------|-------------|
| WebSocket push | Replace polling with `socket.io` for sub-second bid ladder updates |
| Balance escrow | Reserve `bid_price × quantity` when a bid is placed and release it automatically when the bid is outbid, rather than only debiting at allocation |
| Bid cancellation | Allow investors to cancel bids before auction close within a cooldown window |
| Live market prices | Integrate a market data feed (e.g., NSE/BSE sandbox API) for real-time P&L |
| Notifications | Email or push alerts for bid outbid, auction close, and allocation results |
| Two-factor auth | TOTP-based 2FA for admin accounts |
| Audit logging | Database-level trigger-based audit trail for schema mutations |
| Containerization | Docker Compose file for one-command local setup |
| CI/CD pipeline | GitHub Actions workflow for lint, test, and build on push |

---

*Built as a Database Management Systems course project demonstrating relational schema design, ACID transactions, role-based access control, and full-stack integration.*
