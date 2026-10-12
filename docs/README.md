# Interview Prep Pack — Stock & IPO Auction System

Everything you need to explain this project from A to Z. Written from a full read of every
source file, and the key behaviours were **run for real** (Postgres 16 + the actual `server.js`)
on 2026-10-12. Anything marked **✅ verified** was executed, not just read.

---

## ⚠️ Read this first — three things that change how you should answer

1. **This is a DBMS / full-stack project. There is NO machine learning in it.**
   There is no trained model, no training dataset, no feature-engineering pipeline.
   If an interviewer asks about "modelling the dataset" or "feature engineering", the honest
   and strong answer is about **relational data modelling** (ER design, normalisation,
   constraints) and **derived/computed fields**. Doc [05](05-database-and-data-modelling.md)
   gives you exactly that, plus a ready-made answer if they ask "did you use ML?".
   Do not claim an ML algorithm — you will be caught.

2. **The "algorithm" is the share-allocation algorithm** — a greedy, price-time-priority,
   multi-unit, *pay-as-bid* allocation, run inside one ACID transaction. Doc
   [06](06-algorithms-and-why.md) explains it, why it beats the alternatives, and walks through a
   real run with real numbers.

3. **The project has a few real bugs / gaps** (e.g. the watchlist ★ button on cards doesn't
   work, bids are accepted after the end time). Better that *you* know and mention them than
   an interviewer finds them. Doc [11](11-known-issues-and-honest-answers.md) lists each one
   with the exact way to phrase it.

---

## Suggested reading order for tonight (~2.5 h)

| # | Doc | Time | Why |
|---|-----|------|-----|
| 1 | [12 — One-page cheatsheet](12-cheatsheet.md) | 10 min | The whole project on one screen |
| 2 | [01 — Project overview](01-project-overview.md) | 10 min | The 60-second pitch + scope |
| 3 | [06 — Algorithms & why](06-algorithms-and-why.md) | 30 min | Most likely deep-dive topic |
| 4 | [05 — Database & data modelling](05-database-and-data-modelling.md) | 25 min | "Dataset / modelling / features" answers |
| 5 | [10 — Interview Q&A](10-interview-qa.md) | 40 min | 150+ questions with model answers |
| 6 | [11 — Known issues & honest answers](11-known-issues-and-honest-answers.md) | 15 min | Don't get caught out |
| 7 | [02 — Architecture](02-architecture.md) | 15 min | Be able to draw it on a whiteboard |
| 8 | [03 — Getting started](03-getting-started.md) | 10 min | Run it / demo it live |
| 9 | [04 — Tech stack & why](04-tech-stack-and-why.md) | 15 min | "Why X and not Y?" |
| 10 | 07 / 08 / 09 — function reference & call map | reference | Look things up; skim once |

## Index

| File | What's in it |
|------|--------------|
| [01-project-overview.md](01-project-overview.md) | What it is, who uses it, features, real-vs-simulated, scope |
| [02-architecture.md](02-architecture.md) | Layered architecture, request lifecycle, auth flow, state machine, concurrency model, diagrams |
| [03-getting-started.md](03-getting-started.md) | Exact setup + run commands (verified), env vars, reset, demo script, troubleshooting |
| [04-tech-stack-and-why.md](04-tech-stack-and-why.md) | Every technology, why chosen, the alternative, how to justify it |
| [05-database-and-data-modelling.md](05-database-and-data-modelling.md) | ER model, all 10 tables, normalisation, constraints, indexes, derived "features", the seed dataset |
| [06-algorithms-and-why.md](06-algorithms-and-why.md) | Allocation algorithm, weighted average, atomic bid insert, state machine, auth, polling — each with alternatives |
| [07-backend-function-reference.md](07-backend-function-reference.md) | Every route/middleware in `server.js`: inputs, steps, SQL, tables, output, errors, *why* |
| [08-frontend-function-reference.md](08-frontend-function-reference.md) | Every file/component/function in the React app: props, state, calls, output |
| [09-call-map.md](09-call-map.md) | File→file graph, UI→API→SQL map, endpoint×table matrix |
| [10-interview-qa.md](10-interview-qa.md) | 150+ likely questions grouped by topic, with model answers |
| [11-known-issues-and-honest-answers.md](11-known-issues-and-honest-answers.md) | Verified bugs, gaps, README drift, and how to talk about them |
| [12-cheatsheet.md](12-cheatsheet.md) | One-page revision sheet |

---

## The 60-second pitch (memorise this)

> "StockAuction is a full-stack web app that runs live auctions for company shares — both
> secondary-market stocks and brand-new IPOs. Investors place competitive bids; an admin opens
> and closes auctions. When an auction closes, the system allocates shares using
> **price-time priority** — highest price first, earliest bid breaks ties — capped by how many
> shares remain and what each bidder can afford. The whole allocation — rankings, transaction
> records, portfolio updates, balance debits — happens in **one PostgreSQL transaction**, so it's
> all-or-nothing. The stack is React on the front, Node/Express in the middle with raw
> parameterised SQL, and a 10-table PostgreSQL schema with foreign keys, CHECK constraints and
> indexes. Auth is JWT with bcrypt-hashed passwords and role-based access for admin vs investor.
> The main DBMS ideas it demonstrates are ACID transactions, race-condition safety, referential
> integrity and UPSERTs."

## Key numbers to remember

| Fact | Value |
|------|-------|
| Backend | 1 file, `server.js`, 723 lines, 18 route handlers + 2 middleware functions |
| Database | PostgreSQL, 10 tables, 12 foreign keys, 9 indexes |
| Frontend | React 19, CRA (`react-scripts` 5), 12 pages, 5 components, 1 context file, 1 API service |
| Auth | JWT (24 h expiry), bcrypt cost 10 |
| Min bid increment | ₹0.50 above current highest |
| Live update model | client polling every 3 s (paused when tab hidden) |
| Seed users | `admin/admin123`, `rajesh/pass123`, `priya/pass123`, `amit/pass123` |
| Ports | backend 5000, frontend 3000, Postgres 5432 |
| Git history | 11 commits: initial → UI overhaul → account settings → watchlist → landing page |
