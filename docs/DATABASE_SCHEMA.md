> Phạm vi: tài liệu thiết kế mục tiêu và ví dụ tham khảo, chưa phải mô tả đầy đủ của bản đang chạy. Hiện trạng: [PROJECT_STATUS](PROJECT_STATUS.md); hành vi đã triển khai: [backend](../backend/README.md), [frontend](../frontend/README.md); cách chạy hiện hành: [QUICK_START](../QUICK_START.md).

# Database Schema

## 1. PostgreSQL Database Structure

```sql
-- Create Database
CREATE DATABASE stock_analyst_db;

-- Connect to database
\c stock_analyst_db;

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    
    -- Investment Profile
    risk_tolerance VARCHAR(20) CHECK (risk_tolerance IN ('low', 'medium', 'high')),
    initial_investment_amount DECIMAL(15, 2) DEFAULT 0,
    investment_experience VARCHAR(20) CHECK (investment_experience IN ('beginner', 'intermediate', 'advanced')),
    
    -- Preferences
    preferred_sectors TEXT[], -- JSON array stored as text
    notification_email BOOLEAN DEFAULT TRUE,
    theme VARCHAR(10) DEFAULT 'light',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================================
-- 2. PORTFOLIOS TABLE
-- ============================================================
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Portfolio Summary
    total_cost DECIMAL(15, 2) DEFAULT 0,
    current_value DECIMAL(15, 2) DEFAULT 0,
    total_gain DECIMAL(15, 2) DEFAULT 0,
    total_gain_percent DECIMAL(5, 4) DEFAULT 0,
    risk_level VARCHAR(20),
    
    -- Allocation
    cash_amount DECIMAL(15, 2) DEFAULT 0,
    allocation_json JSONB, -- JSON object with sector allocations
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolios_created_at ON portfolios(created_at);

-- ============================================================
-- 3. PORTFOLIO_HOLDINGS TABLE
-- ============================================================
CREATE TABLE portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL,
    
    -- Transaction Details
    quantity DECIMAL(10, 4) NOT NULL,
    purchase_price DECIMAL(10, 4) NOT NULL,
    purchase_date DATE NOT NULL,
    purchase_value DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * purchase_price) STORED,
    
    -- Current Status
    current_price DECIMAL(10, 4),
    current_value DECIMAL(15, 2),
    gain_loss DECIMAL(15, 2),
    gain_loss_percent DECIMAL(5, 4),
    
    -- Portfolio Allocation
    allocation_percent DECIMAL(5, 4),
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sold_date DATE
);

CREATE INDEX idx_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id);
CREATE INDEX idx_portfolio_holdings_stock_id ON portfolio_holdings(stock_id);
CREATE INDEX idx_portfolio_holdings_purchase_date ON portfolio_holdings(purchase_date);

-- ============================================================
-- 4. STOCKS TABLE
-- ============================================================
CREATE TABLE stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    company_name VARCHAR(255),
    
    -- Classification
    sector VARCHAR(50),
    industry VARCHAR(50),
    market_cap DECIMAL(20, 0),
    
    -- Fundamental Data
    pe_ratio DECIMAL(8, 2),
    pb_ratio DECIMAL(8, 2),
    dividend_yield DECIMAL(5, 4),
    eps DECIMAL(10, 4),
    roe DECIMAL(5, 4),
    roa DECIMAL(5, 4),
    debt_to_equity DECIMAL(8, 4),
    
    -- Price Info
    current_price DECIMAL(10, 4),
    price_52_week_high DECIMAL(10, 4),
    price_52_week_low DECIMAL(10, 4),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_watched BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Description
    description TEXT
);

CREATE INDEX idx_stocks_symbol ON stocks(symbol);
CREATE INDEX idx_stocks_sector ON stocks(sector);
CREATE INDEX idx_stocks_market_cap ON stocks(market_cap DESC);
CREATE INDEX idx_stocks_pe_ratio ON stocks(pe_ratio);

-- ============================================================
-- 5. STOCK_PRICE_HISTORY TABLE
-- ============================================================
CREATE TABLE stock_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    
    -- Price Data
    date DATE NOT NULL,
    open_price DECIMAL(10, 4),
    high_price DECIMAL(10, 4),
    low_price DECIMAL(10, 4),
    close_price DECIMAL(10, 4),
    volume BIGINT,
    
    -- Technical Indicators (stored as JSON)
    technical_indicators JSONB, -- {ma_20, ma_50, ma_200, rsi, macd, etc.}
    
    -- Change
    price_change DECIMAL(8, 4),
    percent_change DECIMAL(5, 4),
    
    UNIQUE(stock_id, date)
);

CREATE INDEX idx_stock_price_history_stock_id ON stock_price_history(stock_id);
CREATE INDEX idx_stock_price_history_date ON stock_price_history(date DESC);
CREATE INDEX idx_stock_price_history_stock_date ON stock_price_history(stock_id, date DESC);

-- ============================================================
-- 6. NEWS TABLE
-- ============================================================
CREATE TABLE news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
    
    -- Content
    title VARCHAR(500) NOT NULL,
    content TEXT,
    summary TEXT,
    source VARCHAR(100),
    url VARCHAR(500),
    
    -- Sentiment
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    sentiment_score DECIMAL(3, 2), -- 0.0 to 1.0
    
    -- Keywords & Tags
    keywords TEXT[], -- Array of keywords
    tags TEXT[],
    
    -- Status
    is_relevant_to_market BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    published_at TIMESTAMP,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_news_stock_id ON news(stock_id);
CREATE INDEX idx_news_published_at ON news(published_at DESC);
CREATE INDEX idx_news_sentiment ON news(sentiment);
CREATE INDEX idx_news_created_at ON news(created_at DESC);

-- ============================================================
-- 7. ANALYSIS_RESULTS TABLE
-- ============================================================
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Analysis Details
    analysis_type VARCHAR(50) CHECK (analysis_type IN ('technical', 'fundamental', 'comprehensive')),
    timeframe VARCHAR(20),
    
    -- Results (stored as JSON)
    technical_analysis JSONB, -- {trend, signals, support, resistance, etc.}
    fundamental_analysis JSONB, -- {valuation, scores, ratios}
    sentiment_analysis JSONB, -- {sentiment, keywords, score}
    risk_assessment JSONB, -- {risk_level, volatility, var}
    
    -- Recommendation
    recommendation VARCHAR(20) CHECK (recommendation IN ('strong_buy', 'buy', 'hold', 'sell', 'strong_sell')),
    recommendation_confidence DECIMAL(3, 2),
    target_price DECIMAL(10, 4),
    stop_loss DECIMAL(10, 4),
    expected_return DECIMAL(5, 4),
    
    -- Metadata
    model_version VARCHAR(20),
    execution_time_ms INTEGER,
    
    -- TTL for caching
    expires_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analysis_results_stock_id ON analysis_results(stock_id);
CREATE INDEX idx_analysis_results_user_id ON analysis_results(user_id);
CREATE INDEX idx_analysis_results_created_at ON analysis_results(created_at DESC);
CREATE INDEX idx_analysis_results_expires_at ON analysis_results(expires_at);

-- ============================================================
-- 8. PRICE_PREDICTIONS TABLE
-- ============================================================
CREATE TABLE price_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    
    -- Prediction Details
    prediction_date DATE NOT NULL,
    predicted_price DECIMAL(10, 4),
    confidence_interval JSONB, -- {lower, upper, probability}
    trend VARCHAR(20), -- UPTREND, DOWNTREND, NEUTRAL
    
    -- Model Info
    model_used VARCHAR(50),
    model_accuracy DECIMAL(3, 2),
    lookahead_days INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(stock_id, prediction_date)
);

CREATE INDEX idx_price_predictions_stock_id ON price_predictions(stock_id);
CREATE INDEX idx_price_predictions_prediction_date ON price_predictions(prediction_date);

-- ============================================================
-- 9. CONVERSATIONS TABLE (AI Chat)
-- ============================================================
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Metadata
    title VARCHAR(255),
    context JSONB, -- {portfolioId, stocks mentioned, etc.}
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- ============================================================
-- 10. CONVERSATION_MESSAGES TABLE
-- ============================================================
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Message
    role VARCHAR(20) CHECK (role IN ('user', 'assistant')),
    message TEXT NOT NULL,
    
    -- AI Response Metadata
    related_stocks UUID[] DEFAULT ARRAY[]::UUID[],
    sentiment VARCHAR(20),
    intent VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX idx_conversation_messages_created_at ON conversation_messages(created_at);

-- ============================================================
-- 11. RECOMMENDATIONS TABLE
-- ============================================================
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    
    -- Recommendation Details
    action VARCHAR(20) CHECK (action IN ('strong_buy', 'buy', 'hold', 'sell', 'strong_sell')),
    score DECIMAL(3, 2),
    rationale TEXT,
    
    -- Suggested Allocation
    target_price DECIMAL(10, 4),
    stop_loss DECIMAL(10, 4),
    expected_return DECIMAL(5, 4),
    risk_level VARCHAR(20),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    user_accepted BOOLEAN,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    UNIQUE(user_id, stock_id)
);

CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_recommendations_stock_id ON recommendations(stock_id);
CREATE INDEX idx_recommendations_created_at ON recommendations(created_at DESC);

-- ============================================================
-- 12. TRANSACTIONS TABLE (Audit Trail)
-- ============================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    
    -- Transaction Details
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('buy', 'sell', 'dividend')),
    quantity DECIMAL(10, 4),
    price DECIMAL(10, 4),
    total_amount DECIMAL(15, 2),
    commission DECIMAL(10, 2) DEFAULT 0,
    
    -- Date
    transaction_date DATE NOT NULL,
    settlement_date DATE,
    
    -- Status
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'cancelled')),
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_portfolio_id ON transactions(portfolio_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_stock_id ON transactions(stock_id);
CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);

-- ============================================================
-- 13. AUDIT_LOG TABLE
-- ============================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Action Details
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    
    -- Changes
    old_values JSONB,
    new_values JSONB,
    
    -- IP & User Agent
    ip_address INET,
    user_agent VARCHAR(500),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- ============================================================
-- 14. SYSTEM_CACHE TABLE (PostgreSQL-based Cache)
-- ============================================================
CREATE TABLE system_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Cache Key & Value
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    cache_value JSONB NOT NULL,
    
    -- Metadata
    cache_type VARCHAR(50), -- 'stock_price', 'analysis', 'user_session', 'fundamentals'
    
    -- TTL (automated expiration)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    -- Description
    description TEXT
);

CREATE INDEX idx_system_cache_key ON system_cache(cache_key);
CREATE INDEX idx_system_cache_expires ON system_cache(expires_at);
CREATE INDEX idx_system_cache_type ON system_cache(cache_type);

-- Auto-cleanup record: DELETE FROM system_cache WHERE expires_at < NOW();

-- ============================================================
-- 15. SECTOR_PERFORMANCE TABLE
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_name VARCHAR(50) UNIQUE NOT NULL,
    
    -- Performance Metrics
    current_index DECIMAL(10, 2),
    index_change DECIMAL(8, 4),
    percent_change DECIMAL(5, 4),
    
    -- Statistics
    avg_pe_ratio DECIMAL(8, 2),
    avg_roe DECIMAL(5, 4),
    total_market_cap DECIMAL(20, 0),
    
    -- Trend
    trend VARCHAR(20),
    momentum_score DECIMAL(3, 2),
    
    -- Timestamps
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sector_performance_sector_name ON sector_performance(sector_name);

-- ============================================================
-- 15. MARKET_INDICES TABLE
-- ============================================================
CREATE TABLE market_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) UNIQUE NOT NULL, -- VNIndex, HNXIndex, etc.
    
    -- Current Value
    current_value DECIMAL(10, 2),
    value_change DECIMAL(8, 4),
    percent_change DECIMAL(5, 4),
    
    -- Trading Info
    volume BIGINT,
    advancing_stocks INTEGER,
    declining_stocks INTEGER,
    unchanged_stocks INTEGER,
    
    -- Historical
    day_open DECIMAL(10, 2),
    day_high DECIMAL(10, 2),
    day_low DECIMAL(10, 2),
    year_52_high DECIMAL(10, 2),
    year_52_low DECIMAL(10, 2),
    
    -- Timestamps
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_market_indices_symbol ON market_indices(symbol);

-- ============================================================
-- VIEWS
-- ============================================================

-- View: User Portfolio Summary
CREATE VIEW user_portfolio_summary AS
SELECT 
    u.id AS user_id,
    u.username,
    COUNT(p.id) AS total_portfolios,
    SUM(p.current_value) AS total_portfolio_value,
    AVG(p.total_gain_percent) AS avg_gain_percent,
    COUNT(ph.id) AS total_holdings
FROM users u
LEFT JOIN portfolios p ON u.id = p.user_id AND p.is_active = TRUE
LEFT JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
GROUP BY u.id, u.username;

-- View: Top Performing Stocks
CREATE VIEW top_performing_stocks AS
SELECT 
    s.id,
    s.symbol,
    s.name,
    sph.close_price AS current_price,
    ((sph.close_price - sph_prev.close_price) / sph_prev.close_price * 100) AS percent_change_1d,
    s.sector
FROM stocks s
LEFT JOIN stock_price_history sph ON s.id = sph.stock_id AND sph.date = CURRENT_DATE
LEFT JOIN stock_price_history sph_prev ON s.id = sph_prev.stock_id AND sph_prev.date = CURRENT_DATE - 1
ORDER BY percent_change_1d DESC;

-- ============================================================
-- TRIGGER: Update timestamp on modification
-- ============================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_update_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER portfolios_update_timestamp
BEFORE UPDATE ON portfolios
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER portfolio_holdings_update_timestamp
BEFORE UPDATE ON portfolio_holdings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- INITIAL DATA (Seeds)
-- ============================================================

-- Insert sectors
INSERT INTO stocks (symbol, name, sector, industry, current_price, is_active) VALUES
('VNM', 'Vinamilk', 'Consumer Discretionary', 'Beverages', 85.50, TRUE),
('FPT', 'FPT Corporation', 'Technology', 'Software & Services', 64.80, TRUE),
('TPB', 'TPBank', 'Finance', 'Banking', 27.45, TRUE),
('VJC', 'Vietjet Air', 'Industrials', 'Airlines', 18.90, TRUE),
('MWG', 'Mobile World', 'Consumer Discretionary', 'Specialty Retail', 42.30, TRUE);

COMMIT;
```

---

## 2. Database Indexing Strategy

- Primary keys: AUTO indexed
- Foreign keys: Should be indexed for JOINs
- Frequently filtered fields: INDEXED
- Timestamp fields used in ORDER BY: INDEXED
- Large tables may need COMPOSITE indexes

---

## 3. Partitioning Strategy (for large tables)

```sql
-- Partition stock_price_history by month
ALTER TABLE stock_price_history PARTITION BY RANGE (EXTRACT(YEAR_MONTH FROM date));

-- Partition news by quarter  
ALTER TABLE news PARTITION BY RANGE (EXTRACT(YEAR_QUARTER FROM published_at));
```

---

## 4. Backup Strategy

- Daily automated backups
- Retention: 30 days
- Remote backup storage (AWS S3, etc.)
- Test restore monthly

---

## 5. Connection Pooling

```javascript
// Backend configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,  // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

---

*Schema có thể được điều chỉnh dựa trên yêu cầu cụ thể của dự án*

