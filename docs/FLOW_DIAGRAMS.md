> Phạm vi: tài liệu thiết kế mục tiêu và ví dụ tham khảo, chưa phải mô tả đầy đủ của bản đang chạy. Hiện trạng: [PROJECT_STATUS](PROJECT_STATUS.md); hành vi đã triển khai: [backend](../backend/README.md), [frontend](../frontend/README.md); cách chạy hiện hành: [QUICK_START](../QUICK_START.md).

# Diagram Luồng Phân Tích & Khuyến Nghị

## 1. Main User Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    VỀ TRANG CHÍNH                           │
└────────────────────┬────────────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │ Xem Market Overview │
          │ - VNIndex, HNXIndex │
          │ - Top gainers/losers│
          │ - Market sentiment  │
          └──────────┬──────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
┌────────┐    ┌──────────────┐  ┌──────────┐
│ Xem    │    │ Xem Stock    │  │ Xem      │
│ Danh   │    │ Recommendations
│ Mục    │    │ từ AI        │  │ AI Chat  │
│ Đầu    │    └──────────────┘  └──────────┘
│ Tư     │
│ Cá    │
│ Nhân   │
└────────┘
```

## 2. Stock Analysis Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 NGƯỜI DÙNG CLICK VÀO CỔ PHIẾU              │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────▼────────┐
        │ Frontend Request│
        │  GET /stocks/:id│
        └────────┬────────┘
                 │
        ┌────────▼───────────┐
        │ Backend Check Cache│
        │ (Redis 5 min TTL) │
        └────┬──────────┬────┘
             │          │
         Found        Not Found
             │          │
             │    ┌─────▼──────────────┐
             │    │ Fetch Stock Data   │
             │    │ from APIs          │
             │    │ - Current prices   │
             │    │ - Technicals       │
             │    │ - Fundamentals     │
             │    └─────┬──────────────┘
             │          │
             │    ┌─────▼──────────────┐
             │    │ Store in Cache     │
             │    │ & Database         │
             │    └─────┬──────────────┘
             │          │
             └──────┬───┘
                    ▼
        ┌───────────────────────┐
        │ Return Stock Detail   │
        │ to Frontend           │
        │ - Prices              │
        │ - Indicators          │
        │ - Recent news         │
        └───────────┬───────────┘
                    ▼
    ┌───────────────────────────────┐
    │ Frontend Renders Charts       │
    │ - Price chart (ECharts)       │
    │ - Technical indicators        │
    │ - News feed                   │
    └───────────────────────────────┘
```

## 3. Stock Analysis Generation Flow

```
┌────────────────────────────────────────┐
│  NGƯỜI DÙNG YÊU CẦU PHÂN TÍCH CỔ PHIẾU │
└─────────┬──────────────────────────────┘
          │
    ┌─────▼────────┐
    │ Frontend POST│
    │ /analysis    │
    └─────┬────────┘
          │ Request
          ▼
┌────────────────────────────────────────────┐
│           BACKEND                          │
│  1. Check if analysis cached (expires_at)  │
│  2. If cached and valid → Return cached    │
│  3. If not → Request AI Service            │
└────────┬──────────────────────────────────┘
         │
         ├─ Send stock data
         ├─ Send user profile
         └─ Send market context
         │
         ▼
┌────────────────────────────────────────────────────┐
│           AI SERVICE (Python)                      │
│                                                    │
│  ┌─ Technical Analysis Engine                      │
│  │  - MA, RSI, MACD, Bollinger                     │
│  │  - Trend detection                              │
│  │  - Support/Resistance levels                    │
│  │  --> Technical Score                            │
│  │                                                  │
│  ├─ Fundamental Analysis Engine                    │
│  │  - P/E, P/B, ROE, Debt ratios                   │
│  │  - Earnings growth                              │
│  │  - Industry comparison                          │
│  │  --> Fundamental Score                          │
│  │                                                  │
│  ├─ Sentiment Analysis Engine                      │
│  │  - News sentiment (NLP)                         │
│  │  - Keyword extraction                           │
│  │  --> Sentiment Score                            │
│  │                                                  │
│  ├─ Risk Assessment Engine                         │
│  │  - Volatility calculation                       │
│  │  - Value at Risk (VaR)                          │
│  │  - Beta calculation                             │
│  │  --> Risk Score                                 │
│  │                                                  │
│  └─ LLM Analysis Interpreter                       │
│     - Combine all scores                           │
│     - Generate explanation                         │
│     - Call LLM (GPT-4/Claude)                      │
│     --> Final recommendation                       │
│                                                    │
└────────┬──────────────────────────────────────────┘
         │
         ▼ Return comprehensive analysis
┌────────────────────────────────────────┐
│         BACKEND                        │
│  1. Store result in DB (analysis_results)
│  2. Cache result (expires after 2h)    │
│  3. Return to Frontend                 │
└────────┬──────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│       FRONTEND                         │
│  Display Analysis Result               │
│  ├─ Technical indicators chart         │
│  ├─ Fundamental scores                 │
│  ├─ Sentiment breakdown                │
│  ├─ Risk assessment                    │
│  └─ AI Recommendation                  │
│     - BUY/HOLD/SELL                    │
│     - Target price                     │
│     - Stop loss                        │
│     - Expected return                  │
│     - Rationale                        │
└────────────────────────────────────────┘
```

## 4. Recommendation Generation Flow

```
┌─────────────────────────────────────────┐
│  SCHEDULED JOB (Every hour)             │
│  Generate recommendations for all users │
└──────────┬──────────────────────────────┘
           │
    ┌──────▼──────────────────┐
    │  For each active user:  │
    │  - Get user profile     │
    │  - Get all stocks       │
    │  - Get portfolio        │
    └──────┬──────────────────┘
           │
        ┌──▼─────────────────────────────┐
        │ For each stock:                │
        │ Calculate composite score:     │
        │                                │
        │ score = (                      │
        │   0.25 * technical_score +     │
        │   0.35 * fundamental_score +   │
        │   0.20 * sentiment_score +     │
        │   0.20 * risk_fit_score        │
        │ )                              │
        │                                │
        │ Apply user preferences:        │
        │ - Boost if in preferred sectors
        │ - Apply risk tolerance         │
        │ - Check diversification        │
        └──┬──────────────────────────────┘
           │
        ┌──▼──────────────────────────┐
        │  Rank stocks by score       │
        │  Select top N recommendations│
        └──┬──────────────────────────┘
           │
        ┌──▼─────────────────────────────┐
        │ Store in recommendations table │
        │ with:                         │
        │ - Stock ID                    │
        │ - Score                       │
        │ - Action (BUY/HOLD/SELL)      │
        │ - Target price                │
        │ - Stop loss                   │
        │ - Rationale                   │
        └──┬─────────────────────────────┘
           │
        ┌──▼──────────────────────────┐
        │ Notify user:                │
        │ - Email                     │
        │ - Push notification         │
        │ - Dashboard update          │
        └──────────────────────────────┘
```

## 5. Portfolio Rebalancing Flow

```
┌──────────────────────────────────────┐
│  USER ADDS/MODIFIES PORTFOLIO HOLDING│
└───────────┬────────────────────────┐
            │                        │
            ▼                        ▼
    ┌──────────────┐      ┌────────────────┐
    │ Frontend POST│      │ Update current │
    │ /portfolio   │      │ allocation %   │
    └──────┬───────┘      └────────┬───────┘
           │                       │
           └───────────┬───────────┘
                       │
                ┌──────▼─────────┐
                │ Backend        │
                │ - Validate    │
                │ - Update DB   │
                │ - Notify AI   │
                └──────┬─────────┘
                       │
                ┌──────▼───────────────────┐
                │ AI Service:              │
                │ Analyze portfolio:       │
                │ - Current allocation     │
                │ - Risk level            │
                │ - Diversification       │
                │ - Compare with target   │
                └──────┬───────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
    Portfolio OK?                 Need Rebalance?
        │                             │
        ▼                             ▼
    Return OK msg          Generate rebalancing suggestions:
                           - Sell: Stock X (overweight)
                           - Buy: Stock Y (underweight)
                           - Add: Stock Z (diversification)
                           │
                           ▼
                    Show to user:
                    - Current vs target allocation
                    - Suggested actions
                    - Expected outcome
```

## 6. AI Chat Flow

```
┌────────────────────────────────┐
│ USER SENDS MESSAGE TO AI CHAT  │
└───────────┬────────────────────┘
            │
    ┌───────▼──────────┐
    │ Frontend POST    │
    │ /ai/chat         │
    └───────┬──────────┘
            │ Message
            ▼
┌──────────────────────────────────────┐
│ BACKEND                              │
│ - Get user profile & preferences     │
│ - Get portfolio info                 │
│ - Get conversation history           │
│ - Get current market data            │
└────────┬─────────────────────────────┘
         │
    ┌────▼─────────────────────────────┐
    │ AI SERVICE:                      │
    │ Build prompt with context:       │
    │                                  │
    │ System: "You are AI advisor..."  │
    │                                  │
    │ Context:                         │
    │ - User profile (risk, experience)│
    │ - Current portfolio              │
    │ - Market data                    │
    │ - Chat history                   │
    │ - Analysis data                  │
    │                                  │
    │ User Message: [USER_INPUT]       │
    └────┬──────────────────────────────┘
         │
    ┌────▼──────────────────────┐
    │ Call LLM API              │
    │ (GPT-4, Claude, etc)      │
    │                           │
    │ Temperature: 0.7          │
    │ Max tokens: 1000          │
    └────┬──────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ Stream response back               │
    │ - Check for factual completeness  │
    │ - Extract related stocks/entities │
    │ - Determine user intent           │
    └────┬──────────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ BACKEND:                          │
    │ - Store message in conversation DB│
    │ - Store metadata (intent, entities)
    │ - Archive analysis used           │
    └────┬──────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────┐
    │ FRONTEND:                    │
    │ Display AI response          │
    │ - Formatted message          │
    │ - Related stock links        │
    │ - Charts/data if relevant    │
    │ - Follow-up suggestions      │
    └──────────────────────────────┘
```

## 7. Data Update & Refresh Flow

```
Market Open Time (9:15 - 15:00)
        ▼
┌─────────────────────────────────────┐
│  Every 5 minutes                    │
├─────────────────────────────────────┤
│ 1. Fetch latest stock prices        │
│ 2. Calculate technical indicators   │
│ 3. Update Redis cache               │
│ 4. Broadcast via WebSocket          │
└────────────┬────────────────────────┘
             ▼
        Frontend Updates
        Charts in real-time
             │
Market Closed Time (15:00 - 9:15)
        ▼
┌─────────────────────────────────────┐
│  Every 1 hour                       │
├─────────────────────────────────────┤
│ 1. Fetch news from APIs             │
│ 2. Perform sentiment analysis       │
│ 3. Update news in database          │
│ 4. Notify users of important news   │
└──────────────────────────────────────┘
             │
┌─────────────────────────────────────┐
│  Nightly (2:00 AM)                  │
├─────────────────────────────────────┤
│ 1. Retrain ML models                │
│ 2. Generate recommendations         │
│ 3. Calculate sector performance     │
│ 4. Cleanup old cache entries        │
└──────────────────────────────────────┘
```

## 8. Error Recovery Flow

```
┌──────────────────────────────────┐
│  Exception Occurs                │
│  (API failure, DB error, etc)    │
└───────────┬──────────────────────┘
            │
    ┌───────▼──────────────────┐
    │ Catch & Log Error        │
    │ - Stack trace            │
    │ - Context (user, data)   │
    │ - Timestamp              │
    └───────┬──────────────────┘
            │
    ┌───────▼──────────────────┐
    │ Determine Error Type     │
    └─┬──────┬────────┬───────┬──┘
      │      │        │       │
  ┌───▼──┐┌──▼──┐┌───▼──┐ ┌──▼──┐
  │Network│ │DB   │ │API   │ │None │
  │error  │ │Error│ │Error │ │mous │
  └───┬──┘└──┬──┘└───┬──┘ └──┬──┘
      │      │       │       │
  Retry with Fallback Use Use Generic
  backoff  to cache  cached error msg
      │      │       data   │
      └──────┴──────┬───────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Return appropriate   │
         │ error to user:       │
         │ - Status code        │
         │ - Error message      │
         │ - Retry advice       │
         └──────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Track error metrics  │
         │ - Alert if critical  │
         │ - Monitor trends     │
         └──────────────────────┘
```

---

Các diagrams này miêu tả luồng chính của hệ thống từ góc độ người dùng và từng thành phần kỹ thuật. Sử dụng chúng để hiểu flow của dự án khi phát triển các tính năng.

