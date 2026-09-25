> Phạm vi: tài liệu thiết kế mục tiêu và ví dụ tham khảo, chưa phải mô tả đầy đủ của bản đang chạy. Hiện trạng: [PROJECT_STATUS](PROJECT_STATUS.md); hành vi đã triển khai: [backend](../backend/README.md), [frontend](../frontend/README.md); cách chạy hiện hành: [QUICK_START](../QUICK_START.md).

# Luồng Dữ Liệu (Data Flow)

## 1. Data Sources & Collection

```
     ┌──────────────────────────────────────────────┐
     │         EXTERNAL DATA SOURCES                 │
     └────────────┬──────────────────────────────────┘
                  │
    ┌─────────────┼──────────────────┐
    │             │                  │
    ▼             ▼                  ▼
┌─────────┐  ┌─────────┐        ┌────────────┐
│  Stock  │  │  News   │        │  External  │
│  APIs   │  │  APIs   │        │  Factors   │
│ (SSI,   │  │ (NewsAPI,│       │ (Weather,  │
│ VNIndex)│  │ RSS)    │        │ Economic)  │
└────┬────┘  └────┬────┘        └─────┬──────┘
     │            │                   │
     └────────────┼───────────────────┘
                  │
              (REST/APIs)
                  │
         ┌────────▼─────────┐
         │   Data Fetcher   │
         │   Service        │
         │ (Backend/Python) │
         └────────┬─────────┘
                  │
         ┌────────▼──────────────┐
         │ Data Validation &   │
         │ Transformation      │
         │ - Cleansing         │
         │ - Normalization     │
         │ - Enrichment        │
         └────────┬─────────────┘
                  │
         ┌────────▼──────────────┐
         │  Primary Data Layer  │
         │  (PostgreSQL)        │
         └────────┬─────────────┘
```

---

## 2. Database Schema - High Level

```
┌─────────────────────────┐
│       Users             │
├─────────────────────────┤
│ id (PK)                 │
│ username                │
│ email                   │
│ password_hash           │
│ risk_tolerance          │
│ Investment_amount       │
│ Preferred_sectors       │
│ Created_at              │
└─────────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────────┐
│     Portfolios          │
├─────────────────────────┤
│ id (PK)                 │
│ user_id (FK)            │
│ name                    │
│ total_value             │
│ created_at              │
└─────────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────────┐
│  Portfolio Items        │
├─────────────────────────┤
│ id (PK)                 │
│ portfolio_id (FK)       │
│ stock_id (FK)           │
│ quantity                │
│ purchase_price          │
│ purchase_date           │
│ current_value           │
└─────────────────────────┘
          │
          │ N:1
          ▼
┌─────────────────────────┐
│       Stocks            │
├─────────────────────────┤
│ id (PK)                 │
│ symbol (ticker)         │
│ name                    │
│ sector                  │
│ industry                │
│ market_cap              │
│ pe_ratio                │
│ ROE                     │
│ dividend_yield          │
│ last_updated_at         │
└─────────────────────────┘
          │
          │ 1:N
          ▼
┌──────────────────────────┐
│    Stock Price History   │
├──────────────────────────┤
│ id (PK)                  │
│ stock_id (FK)            │
│ open_price               │
│ high_price               │
│ low_price                │
│ close_price              │
│ volume                   │
│ date                     │
│ technical_indicators     │
│ (JSON)                   │
└──────────────────────────┘

┌──────────────────────────┐
│       News               │
├──────────────────────────┤
│ id (PK)                  │
│ stock_id (FK)            │
│ title                    │
│ content                  │
│ source                   │
│ published_at             │
│ sentiment_score          │
│ keywords                 │
│ (JSON)                   │
└──────────────────────────┘

┌──────────────────────────┐
│ Analysis Results         │
├──────────────────────────┤
│ id (PK)                  │
│ stock_id (FK)            │
│ user_id (FK)             │
│ analysis_type            │
│ scores (JSON)            │
│ recommendation           │
│ rationale                │
│ created_at               │
│ expires_at               │
└──────────────────────────┘

┌──────────────────────────┐
│  Conversations           │
├──────────────────────────┤
│ id (PK)                  │
│ user_id (FK)             │
│ conversation_messages    │
│ (JSON array)             │
│ created_at               │
│ updated_at               │
└──────────────────────────┘
```

---

## 3. Real-Time Data Flow

### 3.1 Stock Price Update Flow

```
   Scheduled Job (every 5 min)
          │
          ▼
   ┌──────────────────┐
   │ Fetch Stock      │
   │ Data from API    │
   │ (SSI, VNIndex)   │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────────┐
   │ Calculate Technical  │
   │ Indicators           │
   │ (MA, RSI, MACD, etc.)│
   └────────┬─────────────┘
            │
            ▼
   ┌──────────────────────┐
   │ Store in Database    │
   │ Stock Price History  │
   └────────┬─────────────┘
            │
            ▼
   ┌──────────────────────┐
   │ Update Redis Cache   │
   │ (for fast access)    │
   └────────┬─────────────┘
            │
            ▼
   ┌──────────────────────┐
   │ Broadcast via        │
   │ WebSocket to         │
   │ Connected Clients    │
   └──────────────────────┘
            │
            ▼
   Frontend Updates Charts/Prices in Real-Time
```

**Code Example**:
```python
# AI Service - Background Job
from celery import shared_task
from datetime import datetime

@shared_task
def update_stock_prices():
    """Cập nhật giá cổ phiếu mỗi 5 phút"""
    
    stocks = get_all_active_stocks()
    
    for stock in stocks:
        # Fetch latest price
        latest_price = fetch_stock_price(stock['symbol'])
        
        if latest_price:
            # Calculate technical indicators
            technical_indicators = calculate_indicators(
                stock['id'], 
                latest_price
            )
            
            # Store in database
            save_price_data(
                stock_id=stock['id'],
                price_data={
                    'open': latest_price['open'],
                    'high': latest_price['high'],
                    'low': latest_price['low'],
                    'close': latest_price['close'],
                    'volume': latest_price['volume'],
                    'date': datetime.now(),
                    'technical_indicators': technical_indicators
                }
            )
            
            # Update cache
            cache.set(f"stock_price:{stock['id']}", latest_price, timeout=300)
            
            # Broadcast to frontend
            emit_price_update(stock['id'], latest_price)
```

---

### 3.2 News & Sentiment Update Flow

```
   Scheduled Job (every 1 hour)
          │
          ▼
   ┌──────────────────┐
   │ Fetch News from  │
   │ Multiple Sources │
   │ (RSS, APIs)      │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────────┐
   │ Extract Keywords &   │
   │ Identify Related     │
   │ Stocks              │
   └────────┬─────────────┘
            │
            ▼
   ┌──────────────────────┐
   │ Sentiment Analysis   │
   │ (ML/NLP)            │
   └────────┬─────────────┘
            │
            ▼
   ┌──────────────────────┐
   │ Store in Database    │
   │ News Table          │
   └────────┬─────────────┘
            │
            ▼
   ┌──────────────────────┐
   │ Update Stock View    │
   │ with Related News    │
   └──────────────────────┘
```

---

### 3.3 AI Analysis Request Flow

```
User Request in Frontend
        │
        ▼
POST /api/analysis/:stockId
        │
Backend Receives Request
        │
        ├─────────────────────────┐
        │                         │
        ▼                         ▼
   Cache Hit?            Fetch Data & Analyze
        │                    ├─ Get stock data
        │ Yes               ├─ Get financial data
        ▼                  ├─ Get news/sentiment
    Return Cached      └─ Compile all data
    Response                 │
                              ▼
                        POST /api/analyze (AI Service)
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            Technical Analysis   Fundamental Analysis
                    ├─────────────────┤
                    │                 │
                    ├─ Sentiment      │
                    │ Analysis        │
                    └─────────┬───────┘
                              │
                              ▼
                        LLM Processing
                        (GPT-4 / Claude)
                              │
                              ▼
                        Generate Response
                        (Analysis + Recommendation)
                              │
                    ┌─────────┴─────────┐
                    │                   │
            Cache Result        Return to Frontend
                    │                   │
                    └─────────┬─────────┘
                              │
                              ▼
                    Frontend Displays Analysis
                    with Charts & Text
```

---

### 3.4 AI Chat Flow

```
User Message in Chat
        │
        ▼
POST /api/ai/chat
        │
Backend Receives & Validates
        │
        ├─ Get user profile
        ├─ Get conversation history
        ├─ Get current market data
        └─ Get user portfolio
            │
            ▼
    POST /api/ai/chat (AI Service)
            │
            ├─ Build prompt with context
            │  - User profile
            │  - Market trends
            │  - Portfolio holdings
            │  - Conversation history
            │
            ├─ Call LLM (GPT-4)
            │
            └─ Generate Response
                │
                ├─ Stream response back
                ├─ Store in conversation DB
                └─ Return complete response
                    │
                    ▼
        Frontend Displays Message
        in Chat Interface
```

---

## 4. Caching Strategy

```
Frontend Request for Data
        ↓
    Backend Receives
        ↓
    ┌───────────────────┐
    │ Check PostgreSQL  │
    │ Cache Table       │
    └───┬───────────┬───┘
        │           │
    Found       Not Found
    Valid       (expired)
        │           │
        │     ┌─────▼──────────┐
        │     │ Query DB/API   │
        │     │ or Compute     │
        │     └─────┬──────────┘
        │           │
        │     ┌─────▼──────────────────┐
        │     │ Store in Cache Table   │
        │     │ with TTL (expires_at)  │
        │     └─────┬──────────────────┘
        │           │
        └─────┬─────┘
              │
        Return to Client
        
Cache TTLs:
├─ Stock Price: 5 minutes
├─ Technical Indicators: 5 minutes
├─ Fundamentals: 1 hour
├─ News: 30 minutes
├─ Analysis Results: 2 hours
├─ User Session: 24 hours
└─ Market Index: 5 minutes

Database Cleanup:
├─ Scheduled Job (every hour)
└─ DELETE FROM system_cache WHERE expires_at < NOW();
```

**No Redis needed!** PostgreSQL cache table handles all caching.
See [CACHING_STRATEGY.md](CACHING_STRATEGY.md) for details.

---

## 5. Data Update Frequency

| Data Type | Frequency | Source |
|-----------|-----------|--------|
| Stock Prices | Every 5 min (during trading) | Stock APIs |
| Technical Indicators | Every 5 min | Calculated |
| Trading Volume | Every 5 min | Stock APIs |
| News | Every 1 hour | News aggregators |
| Company Fundamentals | Daily | Company disclosures |
| Financial Reports | Quarterly | Stock exchange |
| Market Indices | Every 5 min | Stock APIs |
| Sector Performance | Daily | Aggregated data |
| Economic Data | Weekly/Monthly | Government sources |

---

## 6. Error Handling & Data Quality

```
Data Received
    │
    ▼
┌─────────────────────┐
│ Validation Check    │
├─────────────────────┤
│ ✓ Required fields?  │
│ ✓ Data types?       │
│ ✓ Value ranges?     │
│ ✓ Outliers?         │
└──────┬──────────────┘
       │
    Success OR Failure
       │
       ├──────────────┴──────────────┐
       │                             │
       ▼                             ▼
    Continue             Handle Error
    Processing           ├─ Log error
                         ├─ Alert admins
                         ├─ Use cached data
                         ├─ Retry on timeout
                         └─ Update status
```

---

## 7. Audit & Logging

```
Every Operation Logged:
│
├─ User Actions
│  ├─ Login/Logout
│  ├─ Portfolio Changes
│  ├─ Analysis Requests
│  └─ Settings Updates
│
├─ Data Operations
│  ├─ Data Fetches
│  ├─ DB Updates
│  ├─ Cache Operations
│  └─ API Calls
│
├─ AI/ML Operations
│  ├─ Analysis Execution
│  ├─ Predictions Made
│  ├─ Recommendations Generated
│  └─ Model Retrainings
│
└─ System Operations
   ├─ Errors/Exceptions
   ├─ Performance Metrics
   ├─ Security Events
   └─ Deployments
```

---

## 8. Data Retention Policy

| Data Type | Retention | Purpose |
|-----------|-----------|---------|
| Stock Price History | 5+ years | Historical analysis |
| News | 1 year | Archive, research |
| User Transactions | 7 years | Legal, audit |
| Analysis Results | 1 year | Performance tracking |
| Chat History | 2 years | User support |
| System Logs | 3 months | Debugging, security |
| User Sessions | 7 days | Security |

---

*Luồng dữ liệu này có thể được tùy chỉnh dựa trên các yêu cầu hiệu suất cụ thể*

