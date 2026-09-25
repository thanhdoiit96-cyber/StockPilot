> Phạm vi: tài liệu thiết kế mục tiêu và ví dụ tham khảo, chưa phải mô tả đầy đủ của bản đang chạy. Hiện trạng: [PROJECT_STATUS](PROJECT_STATUS.md); hành vi đã triển khai: [backend](../backend/README.md), [frontend](../frontend/README.md); cách chạy hiện hành: [QUICK_START](../QUICK_START.md).

# Kiến Trúc Hệ Thống

## 1. Tổng Quan Kiến Trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React Web)                          │
│  ├─ Dashboard          ├─ Stock Analysis   ├─ Portfolio           │
│  ├─ AI Advisor Chat    ├─ Market Overview  └─ Settings            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                     REST API / WebSocket
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Backend (Node.js/Express)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Authentication & Authorization Layer (JWT)               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ├─ Stock API Endpoints          ├─ Analysis Endpoints         │
│  │  GET /api/stocks              │  POST /api/analyze          │
│  │  GET /api/stocks/:id          │  GET /api/fundamentals/:id  │
│  │  GET /api/stocks/search       │                             │
│  │                               │                             │
│  ├─ Portfolio Endpoints          ├─ AI Integration Endpoints   │
│  │  GET /api/portfolio           │  POST /api/ai/recommend     │
│  │  POST /api/portfolio/add      │  POST /api/ai/chat          │
│  │  DELETE /api/portfolio/remove │                             │
│  │                               │                             │
│  └─ User Endpoints               └─ News/Data Endpoints        │
│     GET /api/user                  GET /api/news               │
│     PUT /api/user                  GET /api/market-data        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Services Layer                                            │  │
│  │ ├─ Stock Service      ├─ Portfolio Service               │  │
│  │ ├─ Analysis Service   ├─ AI Integration Service          │  │
│  │ ├─ Data Fetch Service ├─ User Service                    │  │
│  │ └─ Cache Service      └─ Email Service                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Data Access Layer (ORM: Sequelize/TypeORM)               │  │
│  │ ├─ User Queries       ├─ Portfolio Queries               │  │
│  │ ├─ Stock Queries      ├─ Analysis Queries                │  │
│  │ ├─ News Queries       └─ Transaction Queries             │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                        REST API (HTTP)
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   AI Service (Python/FastAPI)                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Analysis Engines                                         │  │
│  │ ├─ Technical Analysis        ├─ Sentiment Analysis      │  │
│  │ ├─ Fundamental Analysis      ├─ Price Prediction        │  │
│  │ ├─ Risk Assessment           └─ Pattern Recognition     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ LLM/AI Models                                            │  │
│  │ ├─ Chat/Conversation Model   (e.g., GPT-4, Claude)      │  │
│  │ ├─ Recommendation Engine     (Custom ML)                │  │
│  │ ├─ Analysis Interpreter      (NLP)                      │  │
│  │ └─ Risk Calculator           (Statistical Models)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ├─ /api/analyze          ├─ /api/personality                  │
│  ├─ /api/recommend        ├─ /api/risk-assessment              │
│  ├─ /api/chat             ├─ /api/pattern-analysis             │
│  └─ /api/interpret-data   └─ /api/forecast                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                        External APIs/Data
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
    ┌───▼────┐          ┌────▼─────┐        ┌────▼────┐
    │  Stock │          │   News   │        │ Weather │
    │  APIs  │          │  Sources │        │  Data   │
    │(VNIndex│          │ (RSS/API)│        │(Climate)│
    │ SSI)   │          └──────────┘        └────────┘
    └────────┘
        │
    ┌───▼──────────────────────────┐
    │   PostgreSQL Database        │
    │  - Users                      │
    │  - Stocks                     │
    │  - Portfolios                 │
    │  - Transactions               │
    │  - Analysis Results           │
    │  - News                       │
    │  - Market Data                │
    └──────────────────────────────┘
        │
    ┌───▼────────────────┐
    │  Redis Cache       │
    │ - Session Cache    │
    │ - Stock Price Cache│
    │ - Analysis Cache   │
    └────────────────────┘
```

## 2. Chi Tiết Các Layers

### 2.1 Presentation Layer (Frontend)
**Công nghệ**: React + TypeScript + Redux Toolkit
- **UI Framework**: Material-UI hoặc Ant Design
- **Charts**: Chart.js, Recharts, hoặc Apache ECharts
- **State Management**: Redux Toolkit
- **HTTP Client**: Axios
- **Real-time**: Socket.io (cho live updates)

**Chính năng **:
- Dashboard: Overview thị trường, portfolio, gợi ý AI
- Stock Pages: Chi tiết cổ phiếu, charts, tin tức
- Portfolio: Quản lý danh mục, lịch sử giao dịch
- AI Advisor: Chat interface với AI
- Settings: Cấu hình personal risk profile, preferences

### 2.2 API Gateway / Backend Layer
**Công nghệ**: Node.js + Express + TypeScript
- **Database ORM**: Sequelize hoặc TypeORM
- **Validation**: Joi, Yup, hoặc class-validator
- **Authentication**: JWT (JSON Web Tokens)
- **Caching**: PostgreSQL Cache Table (no Redis!)
- **Logging**: Winston, Morgan
- **Task Queue**: node-cron (scheduled jobs)

**Chức năng**:
- RESTful APIs for all frontend requests
- Authentication & Authorization
- Data validation & transformation
- Business logic coordination
- Background jobs (data sync, email, etc.)
- Rate limiting & security

💡 **Cache Strategy**: Dùng PostgreSQL table thay vì Redis
- Đơn giản, không cần tool thêm
- Persistent cache (không mất khi restart)
- TTL-based auto-expiration
- Chi tiết: [CACHING_STRATEGY.md](CACHING_STRATEGY.md)

### 2.3 AI/ML Service Layer
**Công nghệ**: Python + FastAPI
- **LLM Integration**: OpenAI API, Claude API, hoặc local LLM
- **Data Processing**: Pandas, NumPy, Scikit-learn
- **Deep Learning**: TensorFlow/PyTorch (nếu cần)
- **NLP**: spaCy, NLTK, Transformers
- **Async**: AsyncIO, Celery
- **Caching**: Redis

**Chức năng**:
- Stock analysis (technical, fundamental)
- Sentiment analysis từ news/social media
- Price prediction models
- Recommendation engine
- Risk assessment
- AI chat/advisor (LLM-powered)
- Pattern recognition

### 2.4 Data Layer
**Database**: PostgreSQL
- **Replication**: Read replicas
- **Backup**: Automated daily backup
- **Connection Pool**: Managed by backend

**Cache**: Redis
- Session cache
- Stock price cache
- Analysis result cache
- Rate limiting counters

## 3. Data Flow - Quy Trình Chính

### 3.1 User Registration & Auth Flow
```
1. User → Frontend (Register form)
2. Frontend → Backend POST /auth/register
3. Backend → Database (Store credentials)
4. Backend → Frontend (JWT token)
5. Frontend Store JWT in localStorage/secure cookie
```

### 3.2 View Stock & Recommendation Flow
```
1. User → Frontend (Click on stock)
2. Frontend → Backend GET /api/stocks/:id
3. Backend → Cache (Check cache first)
4. If not cached:
   - Backend → Stock Data API (VNIndex/SSI API)
   - Backend → Database (Store data)
   - Backend → Cache (Store in Redis)
5. Backend → Frontend (Return stock data)
6. Frontend → Render stock details

// Get AI recommendation
7. User → Frontend (Request AI analysis)
8. Frontend → Backend POST /api/analysis/:stockId
9. Backend → AI Service (Send analysis request)
10. AI Service → External APIs (Fetch data)
11. AI Service → LLM (Generate analysis)
12. AI Service → Backend (Return analysis)
13. Backend → Database (Save result)
14. Backend → Frontend (Return analysis)
15. Frontend → Render recommendation & explanation
```

### 3.3 AI Chat Flow
```
1. User → Frontend (Send message to AI advisor)
2. Frontend → Backend POST /api/ai/chat
3. Backend → Database (Store conversation)
4. Backend → AI Service (Send user message + context)
5. AI Service → LLM (Generate response based on user profile + market data)
6. AI Service → Backend (Return response)
7. Backend → Frontend (Send response)
8. Frontend → Render AI response
```

### 3.4 Portfolio Management Flow
```
1. User → Frontend (Add stock to portfolio)
2. Frontend → Backend POST /api/portfolio
3. Backend → Database (Save portfolio entry)
4. Backend → Cache (Update portfolio cache)
5. Backend → AI Service (Trigger portfolio rebalancing)
6. AI Service → Backend (Rebalancing recommendation)
7. Backend → Frontend (Update portfolio view)
```

## 4. Security Considerations

```
┌─── Frontend ─────────────────────────────────┐
│ • HTTPS Only                                  │
│ • Secure JWT storage (HttpOnly cookies)      │
│ • Input validation                            │
│ • CSRF protection                             │
└───────────────────────────────────────────────┘
           ↓ Encrypted Communication ↓
┌─── Backend ──────────────────────────────────┐
│ • JWT verification on all endpoints           │
│ • Rate limiting (prevent brute force)        │
│ • SQL injection prevention (ORM/prepared)    │
│ • API key validation for external services   │
│ • Sensitive data encryption                  │
│ • Audit logging                              │
└───────────────────────────────────────────────┘
           ↓ Secure REST API Call ↓
┌─── AI Service ───────────────────────────────┐
│ • API key validation                         │
│ • Input sanitization                         │
│ • Rate limiting                              │
│ • Data anonymization for LLM                 │
│ • Output validation                          │
└───────────────────────────────────────────────┘
```

## 5. Scalability & Performance

### Horizontal Scaling
- Backend: Multiple instances behind load balancer (e.g., Nginx)
- AI Service: Multiple workers
- Database: Master-slave replication
- Cache: PostgreSQL with dedicated indexes (no Redis cluster needed)

### Caching Strategy (PostgreSQL-based)
```
Request → Check system_cache table
  ├─ If found & not expired → Return cached
  ├─ If expired/not found → Fetch from DB/API
  └─ Store result in cache (with TTL)
```

- Stock data (5 min TTL)
- Analysis results (2 hour TTL)
- News (30 min TTL)
- User sessions (24 hour TTL)

**Benefits**: Simple (one DB), persistent, no extra tool needed
**See**: [CACHING_STRATEGY.md](CACHING_STRATEGY.md)

## 6. Monitoring & Logging

```
Frontend → Backend → AI Service
   ↓          ↓         ↓
 Sentry    Winston   Python Logging
   ┌────────┴─────────┐
   ↓                  ↓
 ELK Stack / Datadog
   ↓
 Alerts & Dashboards
```

## 7. Deployment Architecture

```
Development ─→ Staging ─→ Production

┌─────────────────────────────────────┐
│     Docker Containers               │
│  ├─ Frontend (nginx)                │
│  ├─ Backend (node)                  │
│  ├─ AI Service (python)             │
│  └─ PostgreSQL, Redis               │
│                                     │
│  Orchestrated by: Kubernetes/Docker │
│  Hosted on: AWS/GCP/Azure           │
│  CI/CD: GitHub Actions/GitLab CI    │
└─────────────────────────────────────┘
```

---
*Mô tả kiến trúc có thể được điều chỉnh dựa trên yêu cầu cụ thể*

