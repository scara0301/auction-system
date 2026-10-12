# 04 — Tech Stack & Why

> The justifications below come from the project's own README "Justification" column plus what the
> code actually relies on. They are *defensible* reasons; if your real motive was "it's what our course
> used", say that honestly **and** then give the technical reason — interviewers like both.

## Stack at a glance

| Layer | Choice | Version in repo | Role |
|-------|--------|-----------------|------|
| Database | PostgreSQL | 15+ (tested 16) | Relational store, ACID transactions, constraints |
| DB driver | `pg` (node-postgres) | ^8.13 | Raw parameterised SQL, connection pool |
| Runtime | Node.js | 18+ | Backend runtime |
| Web framework | Express | ^4.21 | REST API + middleware pipeline |
| Password hashing | `bcryptjs` | ^2.4.3 | Salted, slow hash |
| Tokens | `jsonwebtoken` | ^9.0.2 | Stateless auth |
| Config | `dotenv` | ^16.4.5 | `.env` → `process.env` |
| Cross-origin | `cors` | ^2.8.5 | Restrict browser origins |
| Frontend lib | React | ^19.2 | Component UI |
| Build tooling | `react-scripts` (CRA) | 5.0.1 | Dev server, bundler, Jest |
| Routing | `react-router-dom` | ^7.14 | SPA routing |
| HTTP client | `axios` | ^1.15 | API calls + interceptors |
| Styling | Plain CSS custom properties + inline styles | — | Design tokens in `index.css` |
| Fonts | Inter + JetBrains Mono (Google Fonts) | — | UI + numeric/monospace |
| Images | Unsplash CDN | — | Sector photography |

## Why each one — and what you'd say about the alternative

### PostgreSQL (vs MySQL, MongoDB, SQLite)
- **Why:** the core of the app is *multi-table atomic updates* (allocation touches 7 tables) and *integrity rules* (FKs, `CHECK (balance >= 0)`, `UNIQUE (user_id, stock_id)`). Postgres gives full ACID, rich constraints, `INSERT … ON CONFLICT` (UPSERT), `RETURNING`, `TIMESTAMPTZ`, and `DECIMAL` exact money maths.
- **vs MongoDB:** a document store would push integrity and multi-document atomicity into app code. The data is highly relational (users↔bids↔auctions↔stocks) and the project's *purpose* is showing relational design.
- **vs MySQL:** MySQL (InnoDB) would also work. Postgres' `ON CONFLICT … DO UPDATE` and `RETURNING` made the upserts and "insert and give me the id" patterns shorter.
- **vs SQLite:** no real concurrency/network access; can't demonstrate a connection pool or concurrent bidders.

### `pg` raw SQL, no ORM (vs Sequelize / Prisma / TypeORM)
- **Why:** it's a DBMS course — the SQL *is* the deliverable. Raw SQL makes the JOINs, subqueries, CTE-free guarded insert and transactions visible and explainable line by line. No ORM magic hiding what runs.
- **Safety:** every query uses `$1, $2…` placeholders → SQL-injection safe. The only dynamically-built SQL is in `GET /auctions` (the optional `WHERE a.type = $n AND a.status = $m` clause) and `PATCH /auth/me` (`${passwordClause}`, `$${idx}`) — in both, what's interpolated is **code-generated placeholder numbers**, never user text; user values always travel in the params array.
- **Trade-off (be honest):** more boilerplate, no migrations, no type safety, repeated SELECT/JOIN text (the auction query is duplicated in list and get-by-id).

### Node.js + Express (vs Spring Boot, Django, Flask)
- **Why:** one language (JS) across stack; Express is minimal and the middleware pipeline (`cors → json → auth → adminOnly → handler`) maps cleanly to the security design; Node's non-blocking I/O suits many clients polling every 3 s.
- **Trade-off:** single file and single process — fine for a demo, would be split into routers/controllers/services and run behind a process manager for production.

### JWT + bcrypt (vs server-side sessions)
- **Why JWT:** stateless — no session table or sticky sessions; the token carries `user_id` and `role`, so `authMiddleware` needs no DB hit. Works naturally with a separate SPA origin.
- **Why bcrypt (cost 10):** deliberately slow and *salted* per password, defeating rainbow tables and making brute force expensive. `bcryptjs` is pure JS (no native build) → installs everywhere.
- **Trade-offs to volunteer:** JWT can't be revoked before expiry (24 h); role changes need re-login; token in `localStorage` is readable by injected JS (XSS) — httpOnly cookie is the hardened alternative (the README says so itself).

### React (vs Angular, Vue, plain JS)
- **Why:** the UI is heavily stateful and live (bid ladder, countdown timers, polling). React's declarative state→UI model plus hooks (`useState`, `useEffect`, `useCallback`, `useMemo`) fit; huge ecosystem.
- **CRA (`react-scripts`):** zero-config dev server/bundler/test runner. (CRA is no longer actively recommended — Vite or Next would be the modern pick. Know this.)

### React Router (v7)
Declarative routes, `<Navigate>` for guards, `useParams` for `/auction/:id`, `NavLink` active styling in the Sidebar.

### Axios (vs `fetch`)
- Interceptors are the reason: one **request** interceptor attaches the JWT everywhere; one **response** interceptor handles 401 globally. With `fetch` you'd write a wrapper to get the same.
- Also: automatic JSON parsing, `params` option, timeout (`5000` ms set in `api.js`), `error.response.data.error` access.

### CSS custom properties + inline styles (vs Tailwind / MUI / Bootstrap)
- A **design-token system** in `index.css` (`--bg-card`, `--accent`, `--green`, `--radius-md` …) keeps colours/spacing consistent without a CSS framework.
- **Honest note:** `tailwindcss`, `@tailwindcss/postcss` and `autoprefixer` are installed and `postcss.config.js` references them, but `index.css` never imports Tailwind and no Tailwind utility classes are used — it's effectively an **unused dependency**. Don't claim you used Tailwind.
- Heavy use of inline `style={{…}}` objects (quick, co-located) — trade-off: no hover pseudo-classes in inline styles, so components use `onMouseEnter/onMouseLeave` handlers to fake hover.

### Polling every 3 s (vs WebSocket / Server-Sent Events)
- **Why:** trivial to implement and stateless on the server; works with plain Express; resilient (a missed poll self-heals on the next one).
- **Trade-off:** up to 3 s latency and wasted requests (N users × 1 request / 3 s). Mitigated by the **Page Visibility API** (pause in hidden tabs). The README lists WebSocket (`socket.io`) push as future scope.

### `dotenv` + `.env` (git-ignored)
Keeps DB credentials and `JWT_SECRET` out of source control (`.gitignore` lists `.env`). The server warns if `JWT_SECRET` is missing because the fallback `"auction_secret"` is insecure.

### `cors` restricted to one origin
`app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000" }))` — only the SPA's origin may call the API from a browser. (CORS is a *browser* protection; it doesn't stop curl/Postman — auth does.)

### `express.json({ limit: "100kb" })`
Caps request body size to blunt trivial memory-exhaustion payloads.

### Unsplash, Google Fonts
Free sector photography and typography with no licensing/asset-management overhead. Both are runtime network dependencies (offline = fallback gradients / system fonts).

### Mermaid in `er-diagram.html`
Text-defined ER diagram rendered in the browser from a CDN (the repo also contains `er_diagram_chen_1779436391514.png`, a Chen-notation export).

## "Why did you NOT use…?" cheat table

| Not used | One-line reason |
|----------|-----------------|
| ORM (Prisma/Sequelize) | SQL visibility was the learning goal |
| WebSockets | Polling was simpler; push is documented future scope |
| Redux / Zustand | State is local per page + two tiny contexts; no cross-page shared server cache needed |
| TypeScript | Speed of a course project; would add for production |
| Docker | Out of scope; listed as future scope |
| Redis / queue | No background jobs — allocation is synchronous and transactional |
| A scheduler (cron) for auto-close | Admin-controlled lifecycle was a design choice; auto-close is a known gap |
| ML libraries | No ML requirement in this project |
