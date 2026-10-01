> Phạm vi: tài liệu thiết kế mục tiêu và ví dụ tham khảo, chưa phải mô tả đầy đủ của bản đang chạy. Hiện trạng: [PROJECT_STATUS](PROJECT_STATUS.md); hành vi đã triển khai: [backend](../backend/README.md), [frontend](../frontend/README.md); cách chạy hiện hành: [QUICK_START](../QUICK_START.md).

# API Design (RESTful Endpoints)

## Workspace đề xuất (đã triển khai ở frontend)

Frontend có tab riêng cho snapshot ngắn hạn và đánh giá; Tổng quan không còn chứa hai khối này. `GET /api/recommendations/latest` giữ snapshot bất biến và trả `rationale.evidence` theo nhóm objective, macro, news, sentiment, subjective và policy. `GET /api/recommendations/history` chỉ tính hit rate/forward return sau đủ horizon; measured và pending luôn tách riêng.

Model metadata hiện là `short_term_rule_v2`, nhưng điểm hiện tại chỉ dùng technical evidence đã kiểm chứng. Yếu tố thiếu nguồn, quyền hiển thị, phương pháp hoặc dữ liệu đủ dài có trạng thái `unavailable` và nhận zero điểm. Chi tiết tiêu chí nằm trong [RECOMMENDATIONS_DESIGN](RECOMMENDATIONS_DESIGN.md).

## Bổ sung đã triển khai — 2026-09-21

- `GET /api/stocks` hỗ trợ `pinned=FPT,VCB` và `exchange=HSX|HNX|UPCOM`: ưu tiên mã trước sắp xếp/phân trang, vẫn áp dụng tìm kiếm/lọc ngành/sàn; các tham số được đưa vào khóa cache. Đây là tùy chọn hiển thị, không phải bằng chứng quyền sở hữu. Contract hiện hành nằm trong [backend README](../backend/README.md).
- `GET /api/stocks/:id/analysis` trả `source_url` (hoặc `null`) trong từng phần tử `data.external_factors.factors` đã xác minh.
- `GET /api/stocks/breadth/history?sessions=20&exchange=HSX|HNX|UPCOM` trả tối đa 60 điểm EOD theo session gồm A/D, spread, coverage, volume breadth và continuity. Endpoint cache 5 phút; không nội suy phiên/mã thiếu và chỉ trả `traded_value` khi có observation thật.
- Những ví dụ thiết kế bên dưới vẫn là đề xuất, không được xem là contract runtime chỉ vì bổ sung này đã triển khai.

## Base URL
```
http://api.stockanalyst.local/api  (Development)
https://api.stockanalyst.com/api    (Production)
```

## Authentication
All endpoints (except `/auth/`) require JWT token in header:
```
Authorization: Bearer <jwt_token>
```

---

## 1. Authentication Endpoints

### Register User
```
POST /auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "riskTolerance": "medium",  // low, medium, high
  "investmentAmount": 100000
}

Response 201:
{
  "id": "user_123",
  "username": "johndoe",
  "email": "john@example.com",
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### Login
```
POST /auth/login
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response 200:
{
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "user_123",
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

### Refresh Token
```
POST /auth/refresh
{
  "refreshToken": "eyJhbGc..."
}

Response 200:
{
  "token": "eyJhbGc..."
}
```

### Logout
```
POST /auth/logout
Response 200:
{
  "message": "Logged out successfully"
}
```

---

## 2. Stock Endpoints

### Get All Stocks (with Pagination)
```
GET /stocks?page=1&limit=20&sector=Technology&sortBy=marketCap

Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
- sector: string (filter by sector)
- search: string (search by name or symbol)
- sortBy: string (marketCap, pe_ratio, volumeChange)
- order: 'asc' | 'desc' (default: desc)

Response 200:
{
  "data": [
    {
      "id": "STOCK_001",
      "symbol": "VNM",
      "name": "Vinamilk",
      "sector": "Consumer Discretionary",
      "industry": "Beverages",
      "currentPrice": 85.5,
      "priceChange": 1.2,
      "percentChange": 1.4,
      "volume": 15000000,
      "marketCap": 1800000000000,
      "pe_ratio": 22.5,
      "ROE": 0.18,
      "dividendYield": 0.035,
      "52WeekHigh": 95.0,
      "52WeekLow": 68.5,
      "lastUpdated": "2024-01-15T10:30:00Z"
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 350,
    "totalPages": 18
  }
}
```

### Get Stock Detail
```
GET /stocks/:stockId

Response 200:
{
  "id": "STOCK_001",
  "symbol": "VNM",
  "name": "Vinamilk",
  "sector": "Consumer Discretionary",
  "description": "Vinamilk is a leading dairy company...",
  "currentPrice": 85.5,
  "priceHistory": [
    {
      "date": "2024-01-15",
      "open": 84.2,
      "high": 86.0,
      "low": 83.8,
      "close": 85.5,
      "volume": 15000000
    },
    ...
  ],
  "technicalIndicators": {
    "MA_20": 84.3,
    "MA_50": 82.1,
    "RSI": 65.2,
    "MACD": { "value": 1.2, "signal": 0.8 },
    "Bollinger": { "upper": 88.2, "middle": 85.5, "lower": 82.8 }
  },
  "fundamentals": {
    "PE_Ratio": 22.5,
    "PB_Ratio": 3.2,
    "ROE": 0.18,
    "ROA": 0.12,
    "DebtToEquity": 0.45,
    "CurrentRatio": 1.8,
    "EPS": 3.81,
    "DividendYield": 0.035,
    "EarningsGrowth": 0.12
  },
  "news": [
    {
      "id": "news_123",
      "title": "Vinamilk reports Q3 profit increase",
      "source": "Cafef",
      "publishedAt": "2024-01-15T08:00:00Z",
      "sentiment": "positive",
      "sentimentScore": 0.85
    },
    ...
  ],
  "sentiment": {
    "overallSentiment": "positive",
    "sentimentScore": 0.72,
    "trendingKeywords": ["profit", "growth", "export"],
    "recentSentimentTrend": "improving"
  }
}
```

### Search Stocks
```
GET /stocks/search?q=vinamilk

Response 200:
{
  "results": [
    {
      "id": "STOCK_001",
      "symbol": "VNM",
      "name": "Vinamilk",
      "currentPrice": 85.5
    },
    ...
  ]
}
```

---

## 3. Analysis Endpoints

### Get Stock Analysis
```
POST /analysis/:stockId
{
  "analysisType": "comprehensive",  // technical, fundamental, comprehensive
  "timeframe": "monthly"  // daily, weekly, monthly, quarterly
}

Response 200:
{
  "stockId": "STOCK_001",
  "analysisType": "comprehensive",
  "timestamp": "2024-01-15T10:30:00Z",
  
  "technicalAnalysis": {
    "trend": "UPTREND",
    "trendStrength": 0.78,
    "support": { "level": 80.5, "strength": 0.85 },
    "resistance": { "level": 90.0, "strength": 0.72 },
    "signals": {
      "shortTerm": "BUY",
      "mediumTerm": "BUY",
      "longTerm": "HOLD"
    },
    "volatility": 0.12
  },
  
  "fundamentalAnalysis": {
    "valuation": "UNDERVALUED",
    "valuationScore": 0.82,
    "growthScore": 0.75,
    "profitabilityScore": 0.88,
    "financialHealthScore": 0.70,
    "industryComparison": {
      "sector": "Consumer Discretionary",
      "peRatioVsIndustry": "lower",
      "roe_VsIndustry": "higher",
      "ranking": "top 15%"
    }
  },
  
  "sentimentAnalysis": {
    "overallSentiment": "POSITIVE",
    "sentimentScore": 0.75,
    "newsCount": 12,
    "positiveNews": 9,
    "negativeNews": 2,
    "neutralNews": 1,
    "keywords": ["profit", "growth", "export", "market share"]
  },
  
  "riskAssessment": {
    "riskLevel": "MEDIUM",
    "volatility": 0.12,
    "valueAtRisk95": -0.08,
    "beta": 1.1,
    "concentration": 0.15
  },
  
  "recommendation": {
    "action": "BUY",
    "confidence": 0.82,
    "targetPrice": 92.5,
    "targetDate": "2024-04-15",
    "stopLoss": 78.0,
    "expectedReturn": 0.082,
    "rationale": "Stock is undervalued with strong fundamentals and positive sentiment. Technical indicators show uptrend continuation."
  }
}
```

### Get Price Prediction
```
GET /analysis/:stockId/prediction?lookahead=30

Query Parameters:
- lookahead: number of days to predict (1-90, default: 30)

Response 200:
{
  "stockId": "STOCK_001",
  "symbol": "VNM",
  "currentPrice": 85.5,
  "prediction": [
    {
      "date": "2024-01-16",
      "predictedPrice": 85.8,
      "confidenceInterval": [84.5, 87.2],
      "probability": 0.95
    },
    {
      "date": "2024-01-17",
      "predictedPrice": 86.2,
      "confidenceInterval": [84.2, 88.5],
      "probability": 0.95
    },
    ...
  ],
  "trend": "UPTREND",
  "accuracy": 0.78,
  "modelUsed": "LSTM"
}
```

---

## 4. Portfolio Endpoints

### Get User Portfolio
```
GET /portfolio

Response 200:
{
  "id": "portfolio_123",
  "userId": "user_123",
  "name": "My Investment Portfolio",
  "totalValue": 250000,
  "totalCost": 235000,
  "totalGain": 15000,
  "totalGainPercent": 0.064,
  "riskLevel": "MEDIUM",
  "allocation": {
    "stocks": 0.70,
    "cash": 0.30
  },
  "sectorAllocation": {
    "Technology": 0.25,
    "Finance": 0.20,
    "Consumer": 0.15,
    "Energy": 0.10,
    "Other": 0.30
  },
  "holdings": [
    {
      "id": "holding_001",
      "stockId": "STOCK_001",
      "symbol": "VNM",
      "name": "Vinamilk",
      "quantity": 500,
      "purchasePrice": 80.0,
      "currentPrice": 85.5,
      "currentValue": 42750,
      "totalCost": 40000,
      "gain": 2750,
      "gainPercent": 0.0688,
      "purchaseDate": "2023-06-15",
      "allocation": 0.171,
      "riskScore": 0.4
    },
    ...
  ],
  "createdAt": "2023-06-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Add Stock to Portfolio
```
POST /portfolio/add
{
  "stockId": "STOCK_001",
  "quantity": 500,
  "purchasePrice": 80.0,
  "purchaseDate": "2024-01-15"
}

Response 201:
{
  "id": "holding_001",
  "stockId": "STOCK_001",
  "quantity": 500,
  "purchasePrice": 80.0,
  "currentPrice": 85.5,
  "currentValue": 42750,
  "gain": 2750,
  "gainPercent": 0.0688
}
```

### Remove Stock from Portfolio
```
DELETE /portfolio/:holdingId

Response 200:
{
  "message": "Stock removed from portfolio",
  "updatedPortfolioValue": 207250
}
```

### Get Portfolio Recommendations
```
GET /portfolio/recommendations

Response 200:
{
  "recommendations": [
    {
      "action": "REBALANCE",
      "currentAllocation": 0.70,
      "suggestedAllocation": 0.65,
      "reason": "Current stock allocation is higher than target for your risk profile"
    },
    {
      "action": "ADD",
      "stockId": "STOCK_045",
      "symbol": "BCM",
      "reason": "Strong fundamentals, undervalued, low correlation with current holdings"
    },
    ...
  ]
}
```

---

## 5. AI Advisor Endpoints

### Start Chat
```
POST /ai/chat
{
  "message": "Should I buy Vinamilk stock now?",
  "context": {
    "portfolioId": "portfolio_123"
  }
}

Response 200:
{
  "conversationId": "conv_123",
  "message": "Based on your current portfolio and risk profile...",
  "followUpQuestions": [
    "What's your investment timeframe?",
    "How much capital can you allocate?"
  ],
  "relatedStocks": ["STOCK_001", "STOCK_045"],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Get Conversation History
```
GET /ai/chat/conversations/:conversationId

Response 200:
{
  "id": "conv_123",
  "messages": [
    {
      "role": "user",
      "message": "Should I buy Vinamilk?",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "role": "assistant",
      "message": "Based on technical and fundamental analysis...",
      "timestamp": "2024-01-15T10:31:00Z"
    },
    ...
  ]
}
```

### Get AI Recommendations
```
GET /ai/recommendations?limit=5

Response 200:
{
  "recommendations": [
    {
      "rank": 1,
      "stockId": "STOCK_015",
      "symbol": "FPT",
      "name": "FPT Software",
      "score": 0.92,
      "rationale": "Strong technical setup, undervalued fundamentals, positive sentiment",
      "targetPrice": 65.0,
      "stopLoss": 55.5,
      "expectedReturn": 0.125,
      "riskLevel": "MEDIUM"
    },
    ...
  ]
}
```

---

## 6. User Endpoints

### Get User Profile
```
GET /users/me

Response 200:
{
  "id": "user_123",
  "username": "johndoe",
  "email": "john@example.com",
  "fullName": "John Doe",
  "riskTolerance": "medium",
  "investmentAmount": 100000,
  "preferredSectors": ["Technology", "Finance"],
  "investmentExperience": "intermediate",
  "createdAt": "2023-06-15T10:00:00Z"
}
```

### Update User Profile
```
PUT /users/me
{
  "fullName": "John Doe Updated",
  "riskTolerance": "high",
  "preferredSectors": ["Technology", "Finance", "Energy"],
  "investmentExperience": "advanced"
}

Response 200:
{
  "message": "Profile updated successfully",
  "user": { ... }
}
```

### Get Investment Preferences
```
GET /users/me/preferences

Response 200:
{
  "riskTolerance": "medium",
  "minAnnualReturn": 0.08,
  "maxDrawdown": 0.20,
  "preferredSectors": ["Technology", "Finance"],
  "preferredMarketCap": "large-cap",
  "diversificationLevel": "high",
  "investmentHorizon": "long-term"
}
```

---

## 7. News Endpoints

### Get News for Stock
```
GET /stocks/:stockId/news?limit=10&sentiment=all

Query Parameters:
- limit: number (default: 10)
- sentiment: all | positive | negative | neutral (default: all)
- days: number of days back (default: 30)

Response 200:
{
  "stockId": "STOCK_001",
  "news": [
    {
      "id": "news_123",
      "title": "Vinamilk reports Q3 profit increase",
      "content": "Long form content...",
      "source": "Cafef",
      "url": "https://cafef.vn/...",
      "publishedAt": "2024-01-15T08:00:00Z",
      "sentiment": "positive",
      "sentimentScore": 0.85,
      "keywords": ["profit", "growth", "export"],
      "relevanceScore": 0.92
    },
    ...
  ],
  "summary": {
    "totalArticles": 45,
    "sentimentDistribution": {
      "positive": 28,
      "negative": 8,
      "neutral": 9
    },
    "trend": "improving"
  }
}
```

---

## 8. Market Data Endpoints

### Get Market Overview
```
GET /market/overview

Response 200:
{
  "indices": [
    {
      "symbol": "VNIndex",
      "value": 1089.25,
      "change": 12.5,
      "percentChange": 1.16,
      "volume": 500000000,
      "advancingStocks": 245,
      "decliningStocks": 105,
      "unchangedStocks": 50,
      "timestamp": "2024-01-15T14:50:00Z"
    },
    {
      "symbol": "HNXIndex",
      "value": 235.80,
      "change": -2.1,
      "percentChange": -0.88,
      "volume": 50000000,
      "timestamp": "2024-01-15T14:50:00Z"
    }
  ],
  "topGainers": [...],
  "topLosers": [...],
  "marketSentiment": "bullish",
  "volatilityIndex": 18.5
}
```

---

## 9. Common Response Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests (Rate Limited) |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## 10. Error Response Format

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid stock ID format",
    "details": [
      {
        "field": "stockId",
        "message": "Must be a valid UUID"
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## 11. Rate Limiting

- **Basic**: 100 requests/minute
- **Premium**: 1000 requests/minute
- **Enterprise**: Custom

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1705324260
```

---

## 12. Pagination

All list endpoints support:
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `offset` (alternative to page)

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 350,
    "totalPages": 18
  }
}
```

---

*API documentation có thể được cập nhật khi phát triển thêm các tính năng mới*

