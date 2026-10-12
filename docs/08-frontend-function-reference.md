# 08 — Frontend Function Reference (`auction-frontend/src`)

For every file: **purpose → props/state → functions → what it calls → what it outputs (renders / returns)**.
All network access goes through `services/api.js`. All pages are default-exported React function components.

## Contents
1. [Entry & routing](#1-entry--routing) — `index.js`, `App.js`
2. [Context](#2-context--contextappcontextjs)
3. [API service](#3-services--apijs)
4. [Utils & data](#4-utils--data)
5. [Components](#5-components)
6. [Pages](#6-pages)
7. [CSS / design system](#7-styling)
8. [Boilerplate / tests](#8-boilerplate)

---

## 1. Entry & routing

### `index.js`
Creates the React root and renders `<React.StrictMode><App/></React.StrictMode>`; calls `reportWebVitals()`.
**Output:** the app mounted into `#root`. (StrictMode double-invokes effects in dev — one reason polling code must clean up properly.)

### `App.js`
| Function | Input | Does | Output |
|----------|-------|------|--------|
| `Spinner` | – | Full-height centred CSS spinner | JSX |
| `SmartRoot` | – (reads `useAuth`) | `loading` → spinner; `user ? <Home/> : <Landing/>` | the right page for `/` |
| `PrivateRoute({children})` | children | `loading` → spinner; no user → `<Navigate to="/" replace/>` | children or redirect |
| `AdminRoute({children})` | children | not logged in or `!isAdmin` → redirect `/`; else children | children or redirect |
| `AppRoutes` | – | Layout: `<div class="layout">{user && <Sidebar/>}<div class="main-area"><Routes>…` | the routed page |
| `App` (default) | – | `BrowserRouter > AuthProvider > ToastProvider > AppRoutes` | whole app |

**Route table**

| Path | Element | Guard |
|------|---------|-------|
| `/login`, `/register` | Login, Register | public |
| `/` | SmartRoot (Landing / Home) | public / adaptive |
| `/auctions` | Auctions | PrivateRoute |
| `/auction/:id` | AuctionDetail | PrivateRoute |
| `/portfolio` | Portfolio | PrivateRoute |
| `/ipo` | IPOPage | PrivateRoute |
| `/transactions` | Transactions | PrivateRoute |
| `/watchlist` | Watchlist | PrivateRoute |
| `/settings` | Settings | PrivateRoute |
| `/admin` | AdminPanel | AdminRoute |
| `*` | `<Navigate to="/"/>` | – |

---

## 2. Context — `context/AppContext.js`

Two contexts in one file.

### `AuthProvider({children})` / `useAuth()`
- **State:** `user` (object|null), `loading` (true until localStorage is read).
- **On mount (`useEffect`)**: reads `localStorage["user"]`, `JSON.parse` in try/catch → `setUser`; then `setLoading(false)`.
- `login(userData, token)`: `setUser`, writes `localStorage["user"]` (JSON) and `localStorage["authToken"]`.
- `logout()`: `setUser(null)`, removes both keys.
- **Provides:** `{ user, login, logout, loading, isAdmin: user?.role === "admin" }`.
- **Why `loading`:** without it, a refresh would briefly look logged-out and `PrivateRoute` would bounce the user to `/`.

### `ToastProvider({children})` / `useToast()`
- **State:** `toasts: [{id, message, type}]`.
- `addToast(message, type="info", duration=4000)` (`useCallback`): pushes a toast with `id = Date.now()+Math.random()` and schedules removal with `setTimeout`.
- `removeToast(id)` (`useCallback`): manual dismiss (×).
- **Renders:** children + a `.toast-container` with coloured toasts (`success/error/info/warning`).
- **Provides:** `{ addToast }`.
- **Why a context:** any component can raise a notification without prop drilling.

---

## 3. Services — `api.js`

**Setup:** `BASE_URL = REACT_APP_API_URL || "http://localhost:5000/api"`; `USE_DUMMY = REACT_APP_USE_DUMMY === "true"`;
`axios.create({ baseURL, headers: JSON, timeout: 5000 })`.

- **Request interceptor:** adds `Authorization: Bearer <localStorage.authToken>` if present.
- **Response interceptor (Fix #7):** on `401` whose URL doesn't contain `/auth/` → remove `user` + `authToken`, `window.location.href = "/login"`. The `/auth/` exclusion lets a wrong password surface as an error message rather than a redirect.
- **Dummy mode:** every function first checks `USE_DUMMY` and serves from in-memory copies of `dummyData.js` after a fake `delay()`.

| Function | HTTP call (real mode) | Returns (axios response → `res.data`) |
|----------|-----------------------|---------------------------------------|
| `fetchAuctions(filter={})` | `GET /auctions` (`params: filter`) | auction array |
| `fetchAuctionById(id)` | `GET /auctions/:id` | auction object |
| `createAuction(data)` | `POST /auctions` | `{id, message}` |
| `closeAuction(id)` | `PATCH /auctions/:id/close` | `{message, allocations}` |
| `openAuction(id)` | `PATCH /auctions/:id/open` | `{message}` |
| `fetchTransactions()` | `GET /transactions` | transaction rows |
| `fetchAllBids()` | `GET /bids/all` | `{auctionId: [bids]}` |
| `fetchBids(auctionId)` | `GET /bids?auctionId=` | bid array |
| `placeBid(auctionId, bidData)` | `POST /bids` body `{auctionId, ...bidData}` | `{id, message}` |
| `fetchPortfolio()` | `GET /portfolio` | holdings array |
| `loginUser(credentials)` | `POST /auth/login` | `{user, token}` |
| `registerUser(userData)` | `POST /auth/register` | `{user, token}` |
| `fetchMe()` | `GET /auth/me` | profile incl. `balance` |
| `updateProfile(payload)` | `PATCH /auth/me` | `{user, token}` |
| `deleteAccount()` | `DELETE /auth/me` | `{message}` |
| `fetchWatchlist()` | `GET /watchlist` | rows |
| `addToWatchlist(stockId)` | `POST /watchlist` `{stockId}` | `{message}` |
| `removeFromWatchlist(stockId)` | `DELETE /watchlist/:stockId` | `{message}` |
| `delay(ms)` (private) | – | Promise resolving after `ms` (simulated latency) |
| default export `api` | – | the configured axios instance |

Dummy-mode quirks: `placeBid` re-implements validation in JS (`price <= highest` ⇒ error; note it does **not** apply the ₹0.50 rule), `loginUser` looks up `DUMMY_USERS` (admin/rajesh/priya), `fetchTransactions`/`fetchWatchlist` return `[]`.

---

## 4. Utils & data

### `utils/images.js`
- `PHOTOS`: map sector name → Unsplash photo id (generic names like *Technology* **and** the seeded names like *Information Technology*, *Fintech*, *Cybersecurity* map to images). `FALLBACK` for unknown sectors.
- `sectorImage(sector, w=600, h=200)` → URL `https://images.unsplash.com/<id>?w=…&h=…&fit=crop&q=75&auto=format`.
- `LOGIN_BG` — constant URL for the login hero.

### `data/dummyData.js`
Exports `DUMMY_AUCTIONS` (6, timestamps relative to `Date.now()`), `DUMMY_BIDS` (keyed by auction id), `DUMMY_PORTFOLIO` (3 holdings), `DUMMY_USERS` (admin/rajesh/priya with plaintext demo passwords — **mock only**).

---

## 5. Components

### `AuctionCard({ auction })` — `components/AuctionCard.js`
- **State:** `imgError`, `watched`, `watchLoading`. Uses `useNavigate`, `useToast`.
- **Derived:** `isLive/isClosed/isStock`; `progress = (total − remaining)/total × 100`; `chg = (highest − base)/base × 100`; `imgUrl = sectorImage(sector,600,200)`.
- `handleWatch(e)`: `stopPropagation`; toggles via `removeFromWatchlist` / `addToWatchlist(auction.referenceId || auction.reference_id)`; toasts; treats the error `"Already in watchlist"` as success.
  - ⚠️ **Bug:** the API never returns `referenceId`/`reference_id`, so the argument is `undefined` → server `400 "stockId is required"` (✅ verified). See doc 11.
- **Renders:** clickable card (→ `/auction/:id`): photo banner with gradient, status badge (LIVE/CLOSED/UPCOMING), ★ button (stock auctions only), logo letter/company/ticker, price row, subscription bar, footer with `<Timer compact/>` (or "Awaiting close" if past end time but still open; or bid count) and a "Bid Now"/"View" button.
- **Calls:** `Timer`, `sectorImage`, `addToWatchlist`, `removeFromWatchlist`, `useToast`.

### `BidForm({ auction, currentUser, onBidPlaced })` — `components/BidForm.js`
- **State:** `price`, `quantity`, `loading`, `error`, `submitted`.
- **Derived:** `minBid = highest + 0.50`; `isOpen`; `maxShares = remainingShares`; `total = price×qty` (if both valid); `quickPrices = useMemo([+₹0.50 → minBid, +1% → highest×1.01, +5% → highest×1.05])`.
- `handleSubmit(e)`: client validation (valid price/qty, `≥ minBid`, `≤ maxShares`) → `await placeBid(auction.id, {price, quantity, bidder})` → success toast, clear fields, flash "✓ Bid submitted", call `onBidPlaced()` (parent reloads); on failure show `err.response.data.error` in the form and as an error toast.
- **Renders:** header with min bid; closed-state alert; price input with quick-fill chips; quantity input with MAX chip; animated "Total Investment"; inline error; PLACE BID button with spinner.
- **Why the client checks exist:** instant feedback only — the server re-validates everything.
- **Note:** `maxShares` is the pool remaining (not "what I can afford"), so a user can enter a total above their balance and get the server's *Insufficient balance* error.

### `Timer({ endTime, compact=false })` — `components/Timer.js`
- `parseTime(totalSeconds)` (module fn) → `{h,m,s,total}` zero-padded (all `"00"` if ≤ 0).
- **State/effect:** `remaining`; `useEffect([endTime])` computes `Math.max(0, ⌊(endTime − now)/1000⌋)` immediately and every 1 s; clears the interval on cleanup.
- **Flags:** `isUrgent` (<600 s), `isCritical` (<60 s), `isExpired` (=0).
- **Renders:** `compact` → inline `HH:MM:SS` (or "Ended") coloured by urgency; full → three digit blocks with labels "Time Remaining" / "Closing Soon" / "Closing Now" (pulse + red) or an "Auction Closed" panel when expired.
- **Why recompute from `Date.now()`:** immune to drift/throttling vs decrementing a counter.

### `Sidebar()` — `components/Sidebar.js`
- Inline SVG icon components (`IconDashboard`, `IconAuctions`, `IconIPO`, `IconPortfolio`, `IconTransactions`, `IconAdmin`, `IconLogout`, `IconWatchlist`, `IconSettings`).
- `investorLinks` (Dashboard, Auctions, IPO, Portfolio, Transactions, Watchlist, Settings) vs `adminLinks` (Dashboard, Auctions, IPO, Admin Panel, Settings).
- `handleLogout()`: `logout()` then `navigate("/login")`. Returns `null` if there is no user.
- **Renders:** logo, `NavLink` list with active styling (`end` for the `/` link), user card (initial, name, role) and logout button.

### `ConfirmDialog({ message, onConfirm, onCancel, confirmLabel="Confirm", danger=false })`
Fixed full-screen overlay with a modal box; Cancel / confirm (red `btn-danger` when `danger`). Used for closing auctions, removing a watchlist item, deleting an account. **Output:** JSX only; the parent decides what confirm does.

---

## 6. Pages

### `Landing` — `/` for guests
Sub-components: `Slideshow` (5 Unsplash slides, auto-advance 3.8 s, fade via `cur/prev/fading` state, dots + arrows), `AnimatedChart` (SVG line of fake `PRICE_DATA`, Bézier smoothing via `smooth()`, stroke-dash draw-in, hover tooltip), `CandlestickChart` (12 hard-coded candles, `IntersectionObserver` reveal), `Counter` (eased count-up when scrolled into view). Main `Landing`: animated background orbs, nav bar (scroll listener toggles a "scrolled" style), hero (copy + mini stats on the left, slideshow + chart strip on the right), coloured stats band (`Counter`s), photo banner, How-It-Works (3 steps), Features + candlestick chart, Perks, final CTA, footer. **Calls:** only `navigate("/login" | "/register")`. **No API calls**; all numbers are decorative.

### `Login`
- State `form`, `loading`, `error`. `handleSubmit`: `loginUser(form)` → `login(user, token)` → toast `Welcome back, <name>` → `navigate(role==="admin" ? "/admin" : "/")`; on error shows `err.response.data.error`. `fillDemo(role)` pre-fills `admin/admin123` or `rajesh/pass123`.
- **Renders:** 58/42 split — hero photo with hard-coded stat strip; form with demo buttons.

### `Register`
- State `form` (name, username, email, password, confirmPassword). `field(key,e)` helper. `handleSubmit`: password mismatch error → strips `confirmPassword` → `registerUser(payload)` → `login()` → `navigate("/")`.
- **Renders:** feature list left, form right.

### `Home` — dashboard (`/`, logged in)
- `loadAuctions` (`useCallback`) → `fetchAuctions()`; polling + visibility pattern (3 s).
- **Derived:** `liveAuctions`, `totalBids = Σ bidCount`, `volume = Σ highest×(total−remaining)` (shown ÷1e7 as "Cr"), `filtered` (All/Live/Upcoming/Closed), `topBidders` (open, bidCount>0, sort by highest desc, top 5).
- **Renders:** 4 stat cards, filter tabs, grid of `AuctionCard`, side panels *Market Pulse* (status percentage bars), *Top Active*, *Quick Stats* (avg bid, highest single bid, most active).

### `Auctions`
- `fetchAuctions()` on a 3 s poll. State `search`, `sortBy`, `filter`. **Filter** = (company|ticker|sector contains search) ∧ (status match); **sort** by `price_desc|price_asc|time_asc|bids_desc|company`.
- **Renders:** header with live count, controls bar, grid of `AuctionCard`, empty state with "Clear search".

### `IPOPage`
- `IPOCard({ipo,onClick})`: banner, status badge, **price-band slider** (position = `clamp((highest−min)/(max−min))`), stats (total/available/bids), subscription bar, footer (countdown / opens-at / ended). Its "Place Bid" button only calls `stopPropagation()` (does nothing itself — clicking the card navigates).
- `IPOPage`: `load` → `fetchAuctions({type:"ipo"})` on 3 s poll; filter tabs with counts.

### `AuctionDetail` — `/auction/:id`
- **State:** `auction`, `bids`, `loading`, `closingAuction`, `confirm`, `watched`, `watchLoading`. **Derived:** `myBid` (first bid by my username), `isHighestBidder`, `fillPct`, `chg`, `maxBidPrice`.
- `maskName(name)`: `name[0]` + up to 3 `*` (cosmetic).
- `loadData` (`useCallback`): `Promise.all([fetchAuctionById(id), fetchBids(id)])`; 3 s poll + visibility pattern.
- Watch `useEffect`: for stock auctions, `fetchWatchlist()` and checks `w.stock_id === auction.referenceId||reference_id` (⚠ undefined → always "not watched").
- `handleToggleWatch`, `handleCloseAuction` (opens `ConfirmDialog`, then `closeAuction(id)` and `loadData()`; admin only sees the Close button when open).
- **Renders:** hero header (price, % vs base, Watch, Close), "you're leading / outbid" banner, 5-stat strip, **Bid Book** table (rank trophy, masked bidder or "YOU", price, qty, total, depth bar), About panel (description, IPO band, fill bar), right column: `Timer`, `BidForm` (investors only), Current Leader, Auction Details.

### `Portfolio`
- `fetchPortfolio()` once (`useEffect([user])`). State `view` = `cards|table`.
- **Totals:** `totalInvested = Σ totalInvestment`, `totalCurrentValue = Σ currentPrice×quantity`, `totalGain`, `gainPercent`.
- **Renders:** empty state; 4 summary cards; composition bar (value share per holding, 8-colour palette); cards view (avg price, current price, qty, value, P&L bar, % of portfolio, acquired date) or table view.

### `Transactions`
- `fetchTransactions()` once. `total = Σ parseFloat(total_amount)`, `uniqueCompanies = new Set(tickers).size`. Formats with `toLocaleDateString/TimeString("en-IN")`.
- **Renders:** empty state or 3 summary cards + table (company, shares, price, total, date) + total footer.

### `Watchlist`
- `WatchlistCard({item,onRemove})`: banner, base price, total shares, **Unwatch** button, "View Auctions" (→ `/auctions`).
- `Watchlist`: `load` → `fetchWatchlist()`; `handleRemove(stockId)` → `removeFromWatchlist` then removes it from local state; remove is gated by a `ConfirmDialog` (`confirm` holds the stock id).

### `Settings`
- `Card` helper. State `me` (live profile), `profile`, `pwd`, saving/deleting flags, `confirm`.
- `useEffect([user])`: fill `profile` from context; `fetchMe()` for balance/created_at.
- `onSaveProfile`: `updateProfile({...profile})` → `login(res.data.user, res.data.token)` (new token) → toast.
- `onChangePassword`: client checks (both present, ≥6, match) → `updateProfile({name,email,username,currentPassword,newPassword})` → `login(...)`, reset fields.
- `onDelete`: `deleteAccount()` → toast → `logout()` → `navigate("/login")`.
- **Renders:** account overview (role, balance, member since), profile form, password form, red danger zone + `ConfirmDialog`.

### `AdminPanel`
- **State:** `auctions`, `allBids`, `tab` (`monitor|manage|create`), `form`, `creating`, `closingId`, `openingId`, `confirm`.
- `loadData`: `Promise.all([fetchAuctions(), fetchAllBids()])` (errors swallowed — stale data stays); 3 s poll + visibility.
- `handleCreate(e)`: `createAuction({...form, totalShares: parseInt, basePrice: parseFloat})` → toast → reset form → go to Monitor tab.
- `handleClose(id, company)`: `ConfirmDialog` → `closeAuction(id)` → toast + reload. `handleOpen(id, company)`: `openAuction(id)` → toast + reload.
- **Derived:** `totalBids`, `liveCount`, `totalVol`, `liveAuctions`.
- **Renders:** header with live badge, 4 stat cards, tab bar, then: **Monitor** (per-live-auction card: logo, price, change %, compact timer, Close/View, top-6 bid table), **Manage** (all auctions table with Open/Close/View), **Create** (form: company, ticker, sector, type, base price, total shares, description, start/end datetime).

---

## 7. Styling

- `index.css` (472 lines): **design tokens** as CSS variables (`--bg-*`, `--accent`, `--green/red/yellow/purple/cyan` + `-dim` variants, `--border`, `--shadow-*`, fonts, radii, `--sidebar-width`), plus utility/component classes (`.sidebar*`, `.auction-card*`, `.stat-card`, `.terminal-panel`, `.data-table`, `.badge-open/closed/upcoming`, `.btn-primary/outline/danger/success`, `.spinner`, `.toast*`, `.progress-bar*`, animations, gradient-text helpers).
- `App.css` (38 lines): leftover CRA styles. `postcss.config.js` references Tailwind, but Tailwind is **not imported** anywhere — an unused dependency.

## 8. Boilerplate

| File | What it is |
|------|------------|
| `reportWebVitals.js`, `setupTests.js`, `logo.svg` | Create-React-App boilerplate |
| `App.test.js` | Untouched CRA template test (`getByText(/learn react/i)`) — **fails** (Jest can't resolve `react-router-dom`, and the text doesn't exist). There are no working tests. |
| `public/index.html`, `manifest.json`, `robots.txt`, icons | CRA static assets |
