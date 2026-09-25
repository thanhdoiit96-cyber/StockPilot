> Phạm vi: tài liệu thiết kế mục tiêu và ví dụ tham khảo, chưa phải mô tả đầy đủ của bản đang chạy. Hiện trạng: [PROJECT_STATUS](PROJECT_STATUS.md); hành vi đã triển khai: [backend](../backend/README.md), [frontend](../frontend/README.md); cách chạy hiện hành: [QUICK_START](../QUICK_START.md).

# Cấu Trúc Dự Án

```
MyProject/
│
├── docs/                          # Tài liệu dự án
│   ├── PROJECT_STRUCTURE.md       # File này - Cấu trúc thư mục
│   ├── ARCHITECTURE.md            # Kiến trúc hệ thống
│   ├── TECH_STACK.md              # Công nghệ sử dụng
│   ├── DATA_FLOW.md               # Luồng dữ liệu
│   ├── AI_STRATEGY.md             # Chiến lược AI
│   ├── API_DESIGN.md              # Thiết kế API
│   ├── DATABASE_SCHEMA.md         # Schema database
│   └── DEPLOYMENT.md              # Hướng dẫn deploy
│
├── backend/                       # Backend - Node.js/Express
│   ├── src/
│   │   ├── controllers/           # Request handlers
│   │   │   ├── stockController.js
│   │   │   ├── portfolioController.js
│   │   │   ├── analysisController.js
│   │   │   └── userController.js
│   │   │
│   │   ├── services/              # Business logic
│   │   │   ├── stockService.js
│   │   │   ├── portfolioService.js
│   │   │   ├── aiIntegrationService.js
│   │   │   ├── dataFetchService.js
│   │   │   └── emailService.js
│   │   │
│   │   ├── models/                # Database models (Sequelize/Mongoose)
│   │   │   ├── User.js
│   │   │   ├── Stock.js
│   │   │   ├── Portfolio.js
│   │   │   ├── Analysis.js
│   │   │   └── News.js
│   │   │
│   │   ├── routes/                # API routes
│   │   │   ├── stocks.js
│   │   │   ├── portfolio.js
│   │   │   ├── analysis.js
│   │   │   ├── auth.js
│   │   │   └── users.js
│   │   │
│   │   ├── middleware/            # Custom middleware
│   │   │   ├── auth.js
│   │   │   ├── errorHandler.js
│   │   │   └── validation.js
│   │   │
│   │   ├── utils/                 # Utility functions
│   │   │   ├── logger.js
│   │   │   ├── validators.js
│   │   │   ├── formatters.js
│   │   │   └── constants.js
│   │   │
│   │   ├── config/                # Configuration
│   │   │   ├── database.js
│   │   │   ├── environment.js
│   │   │   └── aiConfig.js
│   │   │
│   │   └── app.js                 # Express app initialization
│   │
│   ├── .env.example               # Environment variables template
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js                  # Entry point
│   └── README.md
│
├── frontend/                      # Frontend - React
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   │
│   ├── src/
│   │   ├── components/            # React components
│   │   │   ├── layout/
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── Footer.jsx
│   │   │   │
│   │   │   ├── dashboard/         # Dashboard components
│   │   │   │   ├── DashboardPage.jsx
│   │   │   │   ├── MarketOverview.jsx
│   │   │   │   ├── TopRecommendations.jsx
│   │   │   │   └── analytics/
│   │   │   │
│   │   │   ├── stocks/            # Stock-related components
│   │   │   │   ├── StockList.jsx
│   │   │   │   ├── StockDetail.jsx
│   │   │   │   ├── StockChart.jsx
│   │   │   │   └── TechnicalAnalysis.jsx
│   │   │   │
│   │   │   ├── portfolio/         # Portfolio components
│   │   │   │   ├── PortfolioPage.jsx
│   │   │   │   ├── PortfolioChart.jsx
│   │   │   │   └── TransactionHistory.jsx
│   │   │   │
│   │   │   ├── analysis/          # Analysis components
│   │   │   │   ├── FundamentalAnalysis.jsx
│   │   │   │   ├── TechnicalAnalysis.jsx
│   │   │   │   └── SentimentAnalysis.jsx
│   │   │   │
│   │   │   ├── aiAdvisor/         # AI advisor components
│   │   │   │   ├── ChatBot.jsx
│   │   │   │   ├── ChatMessage.jsx
│   │   │   │   └── RecommendationPanel.jsx
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── RegisterPage.jsx
│   │   │   │   └── ProfileSettings.jsx
│   │   │   │
│   │   │   └── common/
│   │   │       ├── LoadingSpinner.jsx
│   │   │       ├── ErrorAlert.jsx
│   │   │       └── ConfirmDialog.jsx
│   │   │
│   │   ├── pages/                 # Page components
│   │   │   ├── HomePage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── StockPage.jsx
│   │   │   ├── AnalysisPage.jsx
│   │   │   ├── PortfolioPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   │
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useFetchStock.js
│   │   │   ├── usePortfolio.js
│   │   │   └── useAIRecommendation.js
│   │   │
│   │   ├── services/              # API services
│   │   │   ├── api.js             # Axios configuration
│   │   │   ├── stockService.js
│   │   │   ├── portfolioService.js
│   │   │   ├── analysisService.js
│   │   │   ├── authService.js
│   │   │   └── aiService.js
│   │   │
│   │   ├── store/                 # State management (Redux)
│   │   │   ├── slices/
│   │   │   │   ├── stockSlice.js
│   │   │   │   ├── portfolioSlice.js
│   │   │   │   ├── userSlice.js
│   │   │   │   ├── analysisSlice.js
│   │   │   │   └── settingsSlice.js
│   │   │   │
│   │   │   ├── store.js           # Redux store configuration
│   │   │   └── actions/
│   │   │
│   │   ├── utils/                 # Utility functions
│   │   │   ├── formatters.js
│   │   │   ├── validators.js
│   │   │   ├── localStorage.js
│   │   │   └── constants.js
│   │   │
│   │   ├── styles/                # Global styles
│   │   │   ├── index.css
│   │   │   ├── variables.css
│   │   │   └── themes.css
│   │   │
│   │   ├── App.jsx                # Main App component
│   │   └── index.js               # Entry point
│   │
│   ├── public/
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── README.md
│
├── ai-service/                    # AI Service - Python/FastAPI
│   ├── src/
│   │   ├── main.py                # FastAPI app
│   │   │
│   │   ├── models/                # AI models
│   │   │   ├── stock_analyzer.py
│   │   │   ├── sentiment_analyzer.py
│   │   │   ├── price_predictor.py
│   │   │   └── recommendation_engine.py
│   │   │
│   │   ├── services/              # Services
│   │   │   ├── data_service.py
│   │   │   ├── llm_service.py
│   │   │   ├── analysis_service.py
│   │   │   └── cache_service.py
│   │   │
│   │   ├── routers/               # API routes
│   │   │   ├── analysis.py
│   │   │   ├── recommendations.py
│   │   │   ├── chat.py
│   │   │   └── health.py
│   │   │
│   │   ├── schemas/               # Request/response schemas
│   │   │   ├── stock_analysis.py
│   │   │   ├── recommendation.py
│   │   │   └── chat.py
│   │   │
│   │   ├── utils/                 # Utilities
│   │   │   ├── logger.py
│   │   │   ├── config.py
│   │   │   ├── data_processors.py
│   │   │   └── prompts.py
│   │   │
│   │   └── ml_models/             # Trained models (cached)
│   │       ├── price_predictor_model.pkl
│   │       └── sentiment_model.pkl
│   │
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example
│   ├── .gitignore
│   ├── README.md
│   └── run.sh                     # Run script
│
├── database/                      # Database scripts
│   ├── migrations/                # Database migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_analysis_table.sql
│   │   └── ...
│   │
│   ├── seeds/                     # Sample data
│   │   ├── stocks.sql
│   │   ├── sectors.sql
│   │   └── initial_data.sql
│   │
│   └── schema/
│       └── database_schema.sql    # Full database schema
│
├── .gitignore
├── .env.example                   # Environment variables template
├── docker-compose.yml             # Docker composition
├── README.md                       # This file
└── CHANGELOG.md                   # Project changes log
```

## Mô Tả Chi Tiết

### Backend (Node.js/Express)
- **Controllers**: Xử lý HTTP requests, gọi services
- **Services**: Chứa business logic phức tạp
- **Models**: Database models và queries
- **Routes**: Định nghĩa API endpoints
- **Middleware**: Auth, validation, error handling

### Frontend (React)
- **Components**: Reusable UI components
- **Pages**: Full page components
- **Hooks**: Custom React hooks
- **Services**: API calls abstraction
- **Store**: Redux state management

### AI Service (Python/FastAPI)
- **Models**: ML/AI models, LLM integrations
- **Services**: Data processing, analysis engines
- **Routers**: FastAPI endpoints
- **Schemas**: Request/response validation

## Liên Kết Tài Liệu
- [ARCHITECTURE.md](ARCHITECTURE.md) - Chi tiết kiến trúc
- [TECH_STACK.md](TECH_STACK.md) - Công nghệ sử dụng
- [API_DESIGN.md](API_DESIGN.md) - Thiết kế API
- [AI_STRATEGY.md](AI_STRATEGY.md) - Chiến lược AI

