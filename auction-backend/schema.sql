-- ============================================================
-- Stock & IPO Auction System — PostgreSQL Schema
-- 10 Entities with Full Referential Integrity
-- ============================================================

-- 1. User
CREATE TABLE IF NOT EXISTS "user" (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(10) DEFAULT 'investor' CHECK (role IN ('investor', 'admin')),
    balance DECIMAL(15, 2) DEFAULT 1000000.00 CHECK (balance >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Company
CREATE TABLE IF NOT EXISTS company (
    company_id SERIAL PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    ticker VARCHAR(20) UNIQUE NOT NULL,
    sector VARCHAR(100),
    description TEXT,
    logo_letter CHAR(1),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Stock
-- UNIQUE(company_id): one stock row per company prevents duplicate share records
CREATE TABLE IF NOT EXISTS stock (
    stock_id SERIAL PRIMARY KEY,
    company_id INT NOT NULL UNIQUE,
    total_shares INT NOT NULL CHECK (total_shares > 0),
    available_shares INT NOT NULL CHECK (available_shares >= 0),
    base_price DECIMAL(12, 2) NOT NULL CHECK (base_price > 0),
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE
);

-- 4. IPO
CREATE TABLE IF NOT EXISTS ipo (
    ipo_id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    total_shares INT NOT NULL CHECK (total_shares > 0),
    price_band_min DECIMAL(12, 2) NOT NULL CHECK (price_band_min > 0),
    price_band_max DECIMAL(12, 2) NOT NULL CHECK (price_band_max > 0),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(10) DEFAULT 'upcoming' CHECK (status IN ('open', 'closed', 'upcoming')),
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE
);

-- 5. Auction
CREATE TABLE IF NOT EXISTS auction (
    auction_id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('stock', 'ipo')),
    reference_id INT NOT NULL,  -- FK to stock.stock_id or ipo.ipo_id depending on type
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    base_price DECIMAL(12, 2) NOT NULL CHECK (base_price > 0),
    status VARCHAR(10) DEFAULT 'upcoming' CHECK (status IN ('open', 'closed', 'upcoming')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bid
CREATE TABLE IF NOT EXISTS bid (
    bid_id SERIAL PRIMARY KEY,
    auction_id INT NOT NULL,
    user_id INT NOT NULL,
    bid_price DECIMAL(12, 2) NOT NULL CHECK (bid_price > 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    bid_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auction(auction_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE
);

-- 7. Bid_Ranking
CREATE TABLE IF NOT EXISTS bid_ranking (
    ranking_id SERIAL PRIMARY KEY,
    auction_id INT NOT NULL,
    bid_id INT NOT NULL,
    rank_position INT NOT NULL,
    allocated_quantity INT DEFAULT 0 CHECK (allocated_quantity >= 0),
    FOREIGN KEY (auction_id) REFERENCES auction(auction_id) ON DELETE CASCADE,
    FOREIGN KEY (bid_id) REFERENCES bid(bid_id) ON DELETE CASCADE
);

-- 8. Portfolio
CREATE TABLE IF NOT EXISTS portfolio (
    portfolio_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    stock_id INT NOT NULL,
    quantity_owned INT NOT NULL DEFAULT 0 CHECK (quantity_owned >= 0),
    avg_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (avg_price >= 0),
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stock(stock_id) ON DELETE CASCADE,
    UNIQUE (user_id, stock_id)
);

-- 9. Transaction
CREATE TABLE IF NOT EXISTS "transaction" (
    transaction_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    auction_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price DECIMAL(12, 2) NOT NULL CHECK (price > 0),
    total_amount DECIMAL(15, 2) NOT NULL CHECK (total_amount > 0),
    transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (auction_id) REFERENCES auction(auction_id) ON DELETE CASCADE
);

-- 10. Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
    watchlist_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    stock_id INT NOT NULL,
    added_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stock(stock_id) ON DELETE CASCADE,
    UNIQUE (user_id, stock_id)
);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bid_auction ON bid(auction_id);
CREATE INDEX IF NOT EXISTS idx_bid_user ON bid(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_status ON auction(status);
CREATE INDEX IF NOT EXISTS idx_auction_type ON auction(type);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_user ON "transaction"(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_auction ON "transaction"(auction_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_bid_ranking_auction ON bid_ranking(auction_id);

-- ============================================================
-- Seed Data (INR prices)
-- ============================================================

-- Passwords are bcrypt-hashed (cost 10). Plain-text: admin→admin123, others→pass123
INSERT INTO "user" (name, email, username, password, role, balance) VALUES
('Admin User', 'admin@stockauction.in', 'admin', '$2a$10$fLMxAxpcxbd0gjbc.EWwt.qlDgWmJqY.Zxntf51Kb81dCXOnu2Jii', 'admin', 5000000.00),
('Rajesh Kumar', 'rajesh@gmail.com', 'rajesh', '$2a$10$VUPmbypnWLhEtyIR3wd.8OqH2HMrMW00PkeZlvNAY3bIxQA4tFMXi', 'investor', 1500000.00),
('Priya Sharma', 'priya@gmail.com', 'priya', '$2a$10$VUPmbypnWLhEtyIR3wd.8OqH2HMrMW00PkeZlvNAY3bIxQA4tFMXi', 'investor', 2000000.00),
('Amit Patel', 'amit@gmail.com', 'amit', '$2a$10$VUPmbypnWLhEtyIR3wd.8OqH2HMrMW00PkeZlvNAY3bIxQA4tFMXi', 'investor', 1200000.00);

-- Companies
INSERT INTO company (company_name, ticker, sector, description, logo_letter) VALUES
('NovaTech Solutions', 'NVTS', 'Information Technology', 'NovaTech Solutions provides enterprise software and cloud infrastructure services to mid-market businesses across India.', 'N'),
('GreenFuel Energy', 'GRFE', 'Clean Energy', 'GreenFuel Energy develops hydrogen fuel cell technology and solar panel manufacturing for commercial and industrial use.', 'G'),
('QuantumPay Financial', 'QPFL', 'Fintech', 'QuantumPay Financial operates a digital payments platform and offers BNPL services to over 10 million users.', 'Q'),
('MedGenix Pharma', 'MGPX', 'Pharmaceuticals', 'MedGenix Pharma specializes in generic drug manufacturing and biosimilar development for the domestic market.', 'M'),
('SpaceLogix Infra', 'SPLI', 'Infrastructure', 'SpaceLogix Infra provides logistics infrastructure including warehousing and cold-chain facilities.', 'S'),
('CyberShield Tech', 'CSHT', 'Cybersecurity', 'CyberShield Tech offers managed security services, threat detection, and compliance solutions for enterprises.', 'C');

-- Stocks (one per company — UNIQUE company_id enforced)
-- stock_id 1: NovaTech (company 1)
-- stock_id 2: GreenFuel (company 2)
-- stock_id 3: SpaceLogix (company 5)
-- stock_id 4: MedGenix (company 4) — created when IPO auction #4 was closed at clearing price ₹2600
INSERT INTO stock (company_id, total_shares, available_shares, base_price) VALUES
(1, 500000, 312000, 1450.00),
(2, 750000, 490000, 880.00),
(5, 2000000, 1400000, 320.00),
(4, 300000, 299300, 2600.00);

-- IPOs
INSERT INTO ipo (company_id, total_shares, price_band_min, price_band_max, start_date, end_date, status) VALUES
(3, 1000000, 550.00, 750.00, NOW() - INTERVAL '5 hours', NOW() + INTERVAL '45 minutes', 'open'),
(4, 300000, 2200.00, 2700.00, NOW() - INTERVAL '24 hours', NOW() - INTERVAL '2 hours', 'closed'),
(6, 600000, 1200.00, 1450.00, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '9 hours', 'upcoming');

-- Auctions
INSERT INTO auction (type, reference_id, start_time, end_time, base_price, status) VALUES
('stock', 1, NOW() - INTERVAL '3 hours', NOW() + INTERVAL '150 minutes', 1450.00, 'open'),
('stock', 2, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '4 hours', 880.00, 'open'),
('ipo', 1, NOW() - INTERVAL '5 hours', NOW() + INTERVAL '45 minutes', 550.00, 'open'),
('ipo', 2, NOW() - INTERVAL '24 hours', NOW() - INTERVAL '2 hours', 2200.00, 'closed'),
('stock', 3, NOW() - INTERVAL '2 hours', NOW() + INTERVAL '6 hours', 320.00, 'open'),
('ipo', 3, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '9 hours', 1200.00, 'upcoming');

-- Bids (all in INR)
INSERT INTO bid (auction_id, user_id, bid_price, quantity, bid_time) VALUES
(1, 2, 1785.00, 1000, NOW() - INTERVAL '5 minutes'),
(1, 3, 1720.00, 500, NOW() - INTERVAL '12 minutes'),
(1, 4, 1685.00, 2000, NOW() - INTERVAL '20 minutes'),
(1, 2, 1610.00, 750, NOW() - INTERVAL '35 minutes'),
(1, 3, 1552.50, 300, NOW() - INTERVAL '50 minutes'),
(2, 4, 1027.50, 2000, NOW() - INTERVAL '8 minutes'),
(2, 2, 980.00, 1000, NOW() - INTERVAL '22 minutes'),
(2, 3, 935.00, 3000, NOW() - INTERVAL '40 minutes'),
(3, 3, 712.50, 5000, NOW() - INTERVAL '3 minutes'),
(3, 4, 680.00, 2500, NOW() - INTERVAL '15 minutes'),
(3, 2, 645.00, 1000, NOW() - INTERVAL '30 minutes'),
(4, 4, 2678.00, 500, NOW() - INTERVAL '3 hours'),
(4, 2, 2600.00, 200, NOW() - INTERVAL '5 hours'),
(5, 2, 389.00, 10000, NOW() - INTERVAL '10 minutes'),
(5, 3, 360.00, 5000, NOW() - INTERVAL '25 minutes');

-- Bid Rankings (for closed auction #4 — MedGenix IPO)
INSERT INTO bid_ranking (auction_id, bid_id, rank_position, allocated_quantity) VALUES
(4, 12, 1, 500),
(4, 13, 2, 200);

-- Portfolio (winners of closed MedGenix IPO — correctly references stock_id=4)
INSERT INTO portfolio (user_id, stock_id, quantity_owned, avg_price) VALUES
(4, 4, 500, 2678.00),
(2, 4, 200, 2600.00);

-- Transactions (from closed auction #4)
INSERT INTO "transaction" (user_id, auction_id, quantity, price, total_amount) VALUES
(4, 4, 500, 2678.00, 1339000.00),
(2, 4, 200, 2600.00, 520000.00);

-- Watchlist
INSERT INTO watchlist (user_id, stock_id) VALUES
(2, 1), (2, 2), (3, 1), (3, 3), (4, 2);
