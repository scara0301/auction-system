require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000" }));
app.use(express.json({ limit: "100kb" }));

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "auction_secret";
if (!process.env.JWT_SECRET) {
  console.warn("[WARN] JWT_SECRET not set — using insecure default. Set JWT_SECRET in .env before deploying.");
}

// ── PostgreSQL Connection Pool ─────────────────────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "auction_system",
  port: process.env.DB_PORT || 5432,
  max: 10,
});

// ── Auth Middleware ─────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token provided" });
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access required" });
  next();
}

// ── Auth Routes ─────────────────────────────────────────────────────────────────

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, username, password } = req.body;

    // Input validation
    if (!name?.trim() || !email?.trim() || !username?.trim() || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: "Username must be 3–50 characters" });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO "user" (name, email, username, password, role) VALUES ($1, $2, $3, $4, 'investor') RETURNING user_id`,
      [name.trim(), email.trim(), username.trim(), hashed]
    );
    const user = { user_id: result.rows[0].user_id, name: name.trim(), email: email.trim(), username: username.trim(), role: "investor" };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "24h" });
    res.json({ user, token });
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ error: "Username or email already exists" });
    console.error("[register]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username?.trim() || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    const result = await pool.query(`SELECT * FROM "user" WHERE username = $1`, [username.trim()]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    const payload = { user_id: user.user_id, name: user.name, email: user.email, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
    res.json({ user: payload, token });
  } catch (err) {
    console.error("[login]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Auction Routes ──────────────────────────────────────────────────────────────

app.get("/api/auctions", async (req, res) => {
  try {
    const { type, status } = req.query;
    let sql = `
      SELECT a.*, c.company_name, c.ticker, c.sector, c.description, c.logo_letter,
        CASE WHEN a.type = 'stock' THEN s.total_shares
             WHEN a.type = 'ipo' THEN i.total_shares END AS total_shares,
        CASE WHEN a.type = 'stock' THEN s.available_shares
             WHEN a.type = 'ipo' THEN i.total_shares - COALESCE((SELECT SUM(br.allocated_quantity) FROM bid_ranking br WHERE br.auction_id = a.auction_id), 0) END AS remaining_shares,
        CASE WHEN a.type = 'ipo' THEN i.price_band_min END AS price_band_min,
        CASE WHEN a.type = 'ipo' THEN i.price_band_max END AS price_band_max,
        (SELECT MAX(b.bid_price) FROM bid b WHERE b.auction_id = a.auction_id) AS current_highest_bid,
        (SELECT u.username FROM bid b JOIN "user" u ON b.user_id = u.user_id
         WHERE b.auction_id = a.auction_id ORDER BY b.bid_price DESC LIMIT 1) AS highest_bidder,
        (SELECT COUNT(*) FROM bid b WHERE b.auction_id = a.auction_id) AS bid_count
      FROM auction a
      LEFT JOIN stock s ON a.type = 'stock' AND a.reference_id = s.stock_id
      LEFT JOIN ipo i ON a.type = 'ipo' AND a.reference_id = i.ipo_id
      LEFT JOIN company c ON (a.type = 'stock' AND s.company_id = c.company_id)
                           OR (a.type = 'ipo' AND i.company_id = c.company_id)
    `;
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    if (type) { conditions.push(`a.type = $${paramIndex++}`); params.push(type); }
    if (status) { conditions.push(`a.status = $${paramIndex++}`); params.push(status); }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY a.start_time DESC";
    const result = await pool.query(sql, params);
    const auctions = result.rows.map((r) => ({
      id: r.auction_id,
      company: r.company_name,
      ticker: r.ticker,
      sector: r.sector,
      description: r.description,
      totalShares: r.total_shares,
      remainingShares: r.remaining_shares,
      basePrice: parseFloat(r.base_price),
      currentHighestBid: r.current_highest_bid ? parseFloat(r.current_highest_bid) : parseFloat(r.base_price),
      highestBidder: r.highest_bidder,
      startTime: r.start_time,
      endTime: r.end_time,
      status: r.status,
      type: r.type,
      logo: r.logo_letter,
      bidCount: parseInt(r.bid_count),
      priceBand: r.price_band_min ? { min: parseFloat(r.price_band_min), max: parseFloat(r.price_band_max) } : null,
    }));
    res.json(auctions);
  } catch (err) {
    console.error("[GET /api/auctions]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/auctions/:id", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, c.company_name, c.ticker, c.sector, c.description, c.logo_letter,
        CASE WHEN a.type = 'stock' THEN s.total_shares
             WHEN a.type = 'ipo' THEN i.total_shares END AS total_shares,
        CASE WHEN a.type = 'stock' THEN s.available_shares
             WHEN a.type = 'ipo' THEN i.total_shares - COALESCE((SELECT SUM(br.allocated_quantity) FROM bid_ranking br WHERE br.auction_id = a.auction_id), 0) END AS remaining_shares,
        CASE WHEN a.type = 'ipo' THEN i.price_band_min END AS price_band_min,
        CASE WHEN a.type = 'ipo' THEN i.price_band_max END AS price_band_max,
        (SELECT MAX(b.bid_price) FROM bid b WHERE b.auction_id = a.auction_id) AS current_highest_bid,
        (SELECT u.username FROM bid b JOIN "user" u ON b.user_id = u.user_id
         WHERE b.auction_id = a.auction_id ORDER BY b.bid_price DESC LIMIT 1) AS highest_bidder
      FROM auction a
      LEFT JOIN stock s ON a.type = 'stock' AND a.reference_id = s.stock_id
      LEFT JOIN ipo i ON a.type = 'ipo' AND a.reference_id = i.ipo_id
      LEFT JOIN company c ON (a.type = 'stock' AND s.company_id = c.company_id)
                           OR (a.type = 'ipo' AND i.company_id = c.company_id)
      WHERE a.auction_id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Auction not found" });
    const r = result.rows[0];
    res.json({
      id: r.auction_id,
      company: r.company_name,
      ticker: r.ticker,
      sector: r.sector,
      description: r.description,
      totalShares: r.total_shares,
      remainingShares: r.remaining_shares,
      basePrice: parseFloat(r.base_price),
      currentHighestBid: r.current_highest_bid ? parseFloat(r.current_highest_bid) : parseFloat(r.base_price),
      highestBidder: r.highest_bidder,
      startTime: r.start_time,
      endTime: r.end_time,
      status: r.status,
      type: r.type,
      logo: r.logo_letter,
      priceBand: r.price_band_min ? { min: parseFloat(r.price_band_min), max: parseFloat(r.price_band_max) } : null,
    });
  } catch (err) {
    console.error("[GET /api/auctions/:id]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auctions", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { type, company, ticker, sector, description, totalShares, basePrice, startTime, endTime, priceBandMin, priceBandMax } = req.body;

    // Input validation
    if (!type || !company?.trim() || !ticker?.trim() || !totalShares || !basePrice || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!["stock", "ipo"].includes(type)) {
      return res.status(400).json({ error: "Type must be stock or ipo" });
    }
    if (parseFloat(basePrice) <= 0) {
      return res.status(400).json({ error: "Base price must be positive" });
    }
    if (parseInt(totalShares) < 1) {
      return res.status(400).json({ error: "Total shares must be at least 1" });
    }
    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ error: "End time must be after start time" });
    }

    const compResult = await pool.query(
      `INSERT INTO company (company_name, ticker, sector, description, logo_letter) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ticker) DO UPDATE SET company_name = EXCLUDED.company_name, sector = EXCLUDED.sector, description = EXCLUDED.description
       RETURNING company_id`,
      [company.trim(), ticker.trim().toUpperCase(), sector || "General", description || "", company.trim()[0].toUpperCase()]
    );
    const companyId = compResult.rows[0].company_id;

    let refId;
    if (type === "ipo") {
      const ipoResult = await pool.query(
        `INSERT INTO ipo (company_id, total_shares, price_band_min, price_band_max, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ipo_id`,
        [companyId, parseInt(totalShares), priceBandMin || basePrice, priceBandMax || parseFloat(basePrice) * 1.2, startTime, endTime, "upcoming"]
      );
      refId = ipoResult.rows[0].ipo_id;
    } else {
      // ON CONFLICT on company_id so re-creating an auction for the same company reuses/updates the stock
      const stockResult = await pool.query(
        `INSERT INTO stock (company_id, total_shares, available_shares, base_price) VALUES ($1, $2, $3, $4)
         ON CONFLICT (company_id) DO UPDATE SET
           total_shares = EXCLUDED.total_shares,
           available_shares = EXCLUDED.available_shares,
           base_price = EXCLUDED.base_price
         RETURNING stock_id`,
        [companyId, parseInt(totalShares), parseInt(totalShares), parseFloat(basePrice)]
      );
      refId = stockResult.rows[0].stock_id;
    }

    const auctionResult = await pool.query(
      `INSERT INTO auction (type, reference_id, start_time, end_time, base_price, status) VALUES ($1, $2, $3, $4, $5, 'upcoming') RETURNING auction_id`,
      [type, refId, startTime, endTime, parseFloat(basePrice)]
    );
    res.json({ id: auctionResult.rows[0].auction_id, message: "Auction created" });
  } catch (err) {
    console.error("[POST /api/auctions]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Close auction (admin) — atomic allocation inside a single transaction
app.patch("/api/auctions/:id/close", authMiddleware, adminOnly, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fix #1: guard against double-close — only transition open → closed
    const lockResult = await client.query(
      `UPDATE auction SET status = 'closed' WHERE auction_id = $1 AND status = 'open' RETURNING *`,
      [req.params.id]
    );
    if (lockResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Auction not found or already closed" });
    }
    const a = lockResult.rows[0];

    let availableShares;
    if (a.type === "stock") {
      const stockResult = await client.query(`SELECT * FROM stock WHERE stock_id = $1`, [a.reference_id]);
      availableShares = stockResult.rows[0].available_shares;
    } else {
      const ipoResult = await client.query(`SELECT * FROM ipo WHERE ipo_id = $1`, [a.reference_id]);
      availableShares = ipoResult.rows[0].total_shares;
      await client.query(`UPDATE ipo SET status = 'closed' WHERE ipo_id = $1`, [a.reference_id]);
    }

    const bidsResult = await client.query(
      `SELECT * FROM bid WHERE auction_id = $1 ORDER BY bid_price DESC, bid_time ASC`, [req.params.id]
    );

    // For IPO: create or resolve the stock row once before the allocation loop
    let ipoStockId;
    if (a.type === "ipo") {
      const ipoComp = await client.query(`SELECT company_id FROM ipo WHERE ipo_id = $1`, [a.reference_id]);
      const companyId = ipoComp.rows[0].company_id;
      const clearingPrice = bidsResult.rows.length > 0
        ? bidsResult.rows[bidsResult.rows.length - 1].bid_price
        : a.base_price;
      // ON CONFLICT handles the case where the stock already exists
      const stockRow = await client.query(
        `INSERT INTO stock (company_id, total_shares, available_shares, base_price) VALUES ($1, $2, $3, $4)
         ON CONFLICT (company_id) DO UPDATE SET base_price = EXCLUDED.base_price
         RETURNING stock_id`,
        [companyId, availableShares, 0, clearingPrice]
      );
      ipoStockId = stockRow.rows[0].stock_id;
    }

    let remaining = availableShares;
    let rank = 1;
    for (const bid of bidsResult.rows) {
      const alloc = Math.min(bid.quantity, remaining);
      if (alloc <= 0) break;
      await client.query(
        `INSERT INTO bid_ranking (auction_id, bid_id, rank_position, allocated_quantity) VALUES ($1, $2, $3, $4)`,
        [req.params.id, bid.bid_id, rank, alloc]
      );
      await client.query(
        `INSERT INTO "transaction" (user_id, auction_id, quantity, price, total_amount) VALUES ($1, $2, $3, $4, $5)`,
        [bid.user_id, req.params.id, alloc, bid.bid_price, alloc * bid.bid_price]
      );
      const stockId = a.type === "stock" ? a.reference_id : ipoStockId;
      await client.query(`
        INSERT INTO portfolio (user_id, stock_id, quantity_owned, avg_price)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, stock_id) DO UPDATE SET
          quantity_owned = portfolio.quantity_owned + EXCLUDED.quantity_owned,
          avg_price = ((portfolio.avg_price * portfolio.quantity_owned) + (EXCLUDED.avg_price * EXCLUDED.quantity_owned)) / (portfolio.quantity_owned + EXCLUDED.quantity_owned)
      `, [bid.user_id, stockId, alloc, bid.bid_price]);
      remaining -= alloc;
      rank++;
    }

    if (a.type === "stock") {
      await client.query(`UPDATE stock SET available_shares = $1 WHERE stock_id = $2`, [remaining, a.reference_id]);
    }

    await client.query("COMMIT");
    res.json({ message: "Auction closed and shares allocated", allocations: rank - 1 });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[PATCH /api/auctions/:id/close]", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// Open auction (admin) — upcoming → open
app.patch("/api/auctions/:id/open", authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE auction SET status = 'open' WHERE auction_id = $1 AND status = 'upcoming' RETURNING auction_id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: "Auction not found or not in upcoming status" });
    res.json({ message: "Auction opened" });
  } catch (err) {
    console.error("[PATCH /api/auctions/:id/open]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Bid Routes ──────────────────────────────────────────────────────────────────

// All bids grouped by auction — single round-trip for AdminPanel
app.get("/api/bids/all", authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.bid_id, b.auction_id, b.bid_price, b.quantity, b.bid_time, u.username AS bidder
      FROM bid b JOIN "user" u ON b.user_id = u.user_id
      ORDER BY b.auction_id, b.bid_price DESC, b.bid_time ASC
    `);
    const grouped = {};
    result.rows.forEach((r) => {
      if (!grouped[r.auction_id]) grouped[r.auction_id] = [];
      const idx = grouped[r.auction_id].length;
      grouped[r.auction_id].push({
        id: r.bid_id,
        auctionId: r.auction_id,
        bidder: r.bidder,
        price: parseFloat(r.bid_price),
        quantity: r.quantity,
        time: r.bid_time,
        status: idx === 0 ? "highest" : "outbid",
      });
    });
    res.json(grouped);
  } catch (err) {
    console.error("[GET /api/bids/all]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/bids", authMiddleware, async (req, res) => {
  try {
    const { auctionId } = req.query;
    if (!auctionId) return res.status(400).json({ error: "auctionId is required" });
    const result = await pool.query(`
      SELECT b.*, u.username AS bidder, u.name AS bidder_name
      FROM bid b JOIN "user" u ON b.user_id = u.user_id
      WHERE b.auction_id = $1
      ORDER BY b.bid_price DESC, b.bid_time ASC
    `, [auctionId]);
    const bids = result.rows.map((r, i) => ({
      id: r.bid_id,
      auctionId: r.auction_id,
      bidder: r.bidder,
      bidderName: r.bidder_name,
      userId: r.user_id,
      price: parseFloat(r.bid_price),
      quantity: r.quantity,
      time: r.bid_time,
      status: i === 0 ? "highest" : "outbid",
    }));
    res.json(bids);
  } catch (err) {
    console.error("[GET /api/bids]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/bids", authMiddleware, async (req, res) => {
  try {
    const { auctionId, price, quantity } = req.body;

    // Input validation
    if (!auctionId || price == null || quantity == null) {
      return res.status(400).json({ error: "auctionId, price, and quantity are required" });
    }
    const bidPrice = parseFloat(price);
    const bidQty = parseInt(quantity);
    if (isNaN(bidPrice) || bidPrice <= 0) {
      return res.status(400).json({ error: "Price must be a positive number" });
    }
    if (isNaN(bidQty) || bidQty < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    const userId = req.user.user_id;
    const auctionResult = await pool.query(`SELECT * FROM auction WHERE auction_id = $1 AND status = 'open'`, [auctionId]);
    if (auctionResult.rows.length === 0) return res.status(400).json({ error: "Auction is not open" });

    const maxBidResult = await pool.query(`SELECT MAX(bid_price) AS max_price FROM bid WHERE auction_id = $1`, [auctionId]);
    const currentMax = maxBidResult.rows[0].max_price
      ? parseFloat(maxBidResult.rows[0].max_price)
      : parseFloat(auctionResult.rows[0].base_price);

    // Fix #14: enforce 0.50 minimum increment on the server (matches frontend)
    const minBid = parseFloat((currentMax + 0.50).toFixed(2));
    if (bidPrice < minBid) {
      return res.status(400).json({ error: `Bid must be at least ₹${minBid.toFixed(2)} (₹0.50 above current highest)` });
    }

    const a = auctionResult.rows[0];
    let available;
    if (a.type === "stock") {
      const stockResult = await pool.query(`SELECT available_shares FROM stock WHERE stock_id = $1`, [a.reference_id]);
      available = stockResult.rows[0].available_shares;
    } else {
      const ipoResult = await pool.query(`SELECT total_shares FROM ipo WHERE ipo_id = $1`, [a.reference_id]);
      available = ipoResult.rows[0].total_shares;
    }
    if (bidQty > available) {
      return res.status(400).json({ error: `Quantity exceeds available shares (${available})` });
    }

    const result = await pool.query(
      `INSERT INTO bid (auction_id, user_id, bid_price, quantity) VALUES ($1, $2, $3, $4) RETURNING bid_id`,
      [auctionId, userId, bidPrice, bidQty]
    );
    res.json({ id: result.rows[0].bid_id, message: "Bid placed successfully" });
  } catch (err) {
    console.error("[POST /api/bids]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Portfolio Routes ────────────────────────────────────────────────────────────

app.get("/api/portfolio", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await pool.query(`
      SELECT p.*, s.base_price, c.company_name, c.ticker, c.sector, c.logo_letter,
        (SELECT MIN(t.transaction_date) FROM "transaction" t
         JOIN auction a ON t.auction_id = a.auction_id
         WHERE t.user_id = p.user_id
           AND ((a.type = 'stock' AND a.reference_id = p.stock_id)
             OR (a.type = 'ipo' AND a.reference_id IN (
                   SELECT i.ipo_id FROM ipo i
                   JOIN stock st ON i.company_id = st.company_id
                   WHERE st.stock_id = p.stock_id)))) AS won_at
      FROM portfolio p
      JOIN stock s ON p.stock_id = s.stock_id
      JOIN company c ON s.company_id = c.company_id
      WHERE p.user_id = $1
    `, [userId]);
    const portfolio = result.rows.map((r) => ({
      id: r.portfolio_id,
      company: r.company_name,
      ticker: r.ticker,
      sector: r.sector,
      logo: r.logo_letter,
      quantity: r.quantity_owned,
      avgPrice: parseFloat(r.avg_price),
      totalInvestment: r.quantity_owned * parseFloat(r.avg_price),
      currentPrice: parseFloat(r.base_price) * 1.05,
      wonAt: r.won_at || null,
    }));
    res.json(portfolio);
  } catch (err) {
    console.error("[GET /api/portfolio]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Transaction Routes ──────────────────────────────────────────────────────────

app.get("/api/transactions", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await pool.query(`
      SELECT t.*, c.company_name, c.ticker
      FROM "transaction" t
      JOIN auction a ON t.auction_id = a.auction_id
      LEFT JOIN stock s ON a.type = 'stock' AND a.reference_id = s.stock_id
      LEFT JOIN ipo i ON a.type = 'ipo' AND a.reference_id = i.ipo_id
      LEFT JOIN company c ON (s.company_id = c.company_id OR i.company_id = c.company_id)
      WHERE t.user_id = $1
      ORDER BY t.transaction_date DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("[GET /api/transactions]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Watchlist Routes ────────────────────────────────────────────────────────────

app.get("/api/watchlist", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.*, s.base_price, s.total_shares, c.company_name, c.ticker, c.sector, c.logo_letter
      FROM watchlist w
      JOIN stock s ON w.stock_id = s.stock_id
      JOIN company c ON s.company_id = c.company_id
      WHERE w.user_id = $1
    `, [req.user.user_id]);
    res.json(result.rows);
  } catch (err) {
    console.error("[GET /api/watchlist]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/watchlist", authMiddleware, async (req, res) => {
  try {
    const { stockId } = req.body;
    if (!stockId) return res.status(400).json({ error: "stockId is required" });
    await pool.query(`INSERT INTO watchlist (user_id, stock_id) VALUES ($1, $2)`, [req.user.user_id, stockId]);
    res.json({ message: "Added to watchlist" });
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ error: "Already in watchlist" });
    console.error("[POST /api/watchlist]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/watchlist/:stockId", authMiddleware, async (req, res) => {
  try {
    await pool.query(`DELETE FROM watchlist WHERE user_id = $1 AND stock_id = $2`, [req.user.user_id, req.params.stockId]);
    res.json({ message: "Removed from watchlist" });
  } catch (err) {
    console.error("[DELETE /api/watchlist/:stockId]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Start Server ────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Auction backend running on http://localhost:${PORT}`);
});
