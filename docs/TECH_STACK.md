> Phạm vi: tài liệu thiết kế mục tiêu và ví dụ tham khảo, chưa phải mô tả đầy đủ của bản đang chạy. Hiện trạng: [PROJECT_STATUS](PROJECT_STATUS.md); hành vi đã triển khai: [backend](../backend/README.md), [frontend](../frontend/README.md); cách chạy hiện hành: [QUICK_START](../QUICK_START.md).

# Tech Stack & Công Nghệ Sử Dụng

## 1. Frontend Stack

### Core Framework
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool (faster than CRA) |

### UI & Styling
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| Material-UI (MUI) | 5.x | UI component library |
| Tailwind CSS | 3.x | Utility-first CSS |
| Framer Motion | Latest | Animation library |

### State Management & Data
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| Redux Toolkit | 1.9.x | State management |
| Axios | 1.x | HTTP client |
| React Query | 5.x | Server state management |
| Socket.io Client | 4.x | Real-time communication |

### Charts & Visualization
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| ECharts | 5.x | Advanced charts & graphs |
| Recharts | 2.x | Customizable charts |
| Chart.js | 4.x | Simple charts |
| D3.js | 7.x | Data visualization |

### Other Tools
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| React Router | 6.x | Client-side routing |
| Formik | 2.x | Form management |
| Yup | Latest | Validation schema |

### Frontend Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@mui/material": "^5.14.0",
    "@mui/icons-material": "^5.14.0",
    "tailwindcss": "^3.3.0",
    "@reduxjs/toolkit": "^1.9.7",
    "react-redux": "^8.1.3",
    "axios": "^1.6.0",
    "echarts": "^5.4.3",
    "recharts": "^2.10.0",
    "socket.io-client": "^4.7.0",
    "formik": "^2.4.5",
    "yup": "^1.3.3",
    "clsx": "^2.0.0",
    "date-fns": "^2.30.0",
    "framer-motion": "^10.16.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  }
}
```

---

## 2. Backend Stack

### Core Framework
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| Node.js | 18.x LTS / 20.x | Runtime |
| Express | 4.x | Web framework |
| TypeScript | 5.x | Type safety |

### Database & ORM & Cache
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| PostgreSQL | 15.x | Relational database + caching |
| Sequelize | 6.x | ORM |

### Authentication & Security
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| JWT (jsonwebtoken) | 9.x | Authentication |
| bcryptjs | 2.x | Password hashing |
| helmet | 7.x | Security headers |
| cors | 2.x | CORS handling |

### Validation & Data Processing
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| Joi | 17.x | Schema validation |
| Axios | 1.x | HTTP requests |
| node-cron | 3.x | Scheduled tasks |

### Logging & Monitoring
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| Winston | 3.x | Logging |
| Morgan | 1.x | HTTP request logger |
| Sentry | Latest | Error tracking |

### Job Queue
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| Bull | 4.x | Job queue |
| Redis | 7.x | Queue backing |

### Testing
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| Jest | 29.x | Testing framework |
| Supertest | 6.x | API testing |

### Backend Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "typescript": "^5.3.0",
    "sequelize": "^6.35.0",
    "pg": "^8.11.0",
    "jsonwebtoken": "^9.1.2",
    "bcryptjs": "^2.4.3",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "joi": "^17.11.0",
    "axios": "^1.6.0",
    "node-cron": "^3.0.3",
    "winston": "^3.11.0",
    "morgan": "^1.10.0",
    "@sentry/node": "^7.85.0",
    "dotenv": "^16.3.1",
    "express-validator": "^7.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  }
}
```

---

## 3. AI Service Stack

### Core Framework
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| Python | 3.10+ | Language |
| FastAPI | 0.104+ | Web framework |
| Pydantic | 2.x | Data validation |

### LLM & AI Models
| Công Nghệ | Mục Đích | Lựa Chọn |
|-----------|---------|---------|
| OpenAI GPT API | Chat & Analysis | Chính (paid) |
| Anthropic Claude | Chat & Analysis | Thay thế hoặc kết hợp |
| Ollama | Local LLM | Tùy chọn OSS |
| LangChain | LLM orchestration | Framework |
| LlamaIndex | Document indexing | RAG support |

### Data Processing & ML
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| Pandas | 2.x | Data manipulation |
| NumPy | 1.24+ | Numerical computing |
| Scikit-learn | 1.x | ML algorithms |
| TensorFlow | 2.x | Deep learning (optional) |
| PyTorch | 2.x | Deep learning (optional) |

### NLP & Text Processing
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| spaCy | 3.x | NLP pipeline |
| NLTK | 3.x | NLP toolkit |
| Transformers | Latest | Pre-trained models |
| TextBlob | Latest | Sentiment analysis |

### Time Series & Analysis
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| StatsModels | 0.14+ | Statistical models |
| Prophet | Latest | Time series forecasting |

### Async & Caching
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| Celery | 5.x | Task queue |
| Redis | 5.x | Caching & broker |
| aioredis | 2.x | Async Redis |

### API & Integrations
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| Requests | 2.31+ | HTTP requests |
| aiohttp | 3.x | Async HTTP |
| yfinance | Latest | Stock data |
| newsapi | Latest | News API |

### Database & ORM
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| SQLAlchemy | 2.x | ORM |
| asyncpg | Latest | Async PostgreSQL |

### Logging & Monitoring
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| Python logging | Built-in | Logging |
| Loguru | Latest | Enhanced logging |

### AI Service Dependencies
```txt
# requirements.txt
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
python-dotenv==1.0.0

# LLM & AI
openai==1.3.0
anthropic==0.7.0
langchain==0.0.335
llama-index==0.9.0

# Data Processing & ML
pandas==2.1.3
numpy==1.26.2
scikit-learn==1.3.2
scipy==1.11.4
tensorflow==2.14.0
torch==2.1.1

# NLP
spacy==3.7.2
nltk==3.8.1
transformers==4.35.0
textblob==0.17.1

# Time Series
statsmodels==0.14.0
prophet==1.1.5

# Async & Caching
celery==5.3.4
aiohttp==3.9.1

# APIs & Integrations
requests==2.31.0
yfinance==0.2.32
newsapi==0.1.2

# Database
sqlalchemy==2.0.23
asyncpg==0.29.0

# Logging
loguru==0.7.2

# Testing
pytest==7.4.3
pytest-asyncio==0.21.1
```

---

## 4. Infrastructure & DevOps

### Containerization
| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| Docker | 24.x | Containerization |
| Docker Compose | 2.x | Multi-container orchestration |

### Cloud & Hosting
| Dịch Vụ | Mục Đích |
|--------|---------|
| AWS EC2 / RDS / ElastiCache | Hosting & managed services |
| GCP / Azure | Alternative cloud providers |
| Netlify / Vercel | Frontend deployment |
| Railway / Railway / Render | Backend deployment |

### CI/CD
| Công Nghệ | Mục Đích |
|-----------|---------|
| GitHub Actions | CI/CD pipeline |
| gitlab CI | Alternative |

### Monitoring & Analytics
| Công Nghệ | Mục Đích |
|-----------|---------|
| Sentry | Error tracking |
| Datadog / New Relic | Performance monitoring |
| ELK Stack (Elasticsearch, Logstash, Kibana) | Log aggregation |
| Prometheus + Grafana | Metrics & visualization |

---

## 5. Development Tools

### Version Control
- Git
- GitHub (repository hosting)

### Code Quality
- ESLint (JavaScript/TypeScript)
- Prettier (code formatting)
- SonarQube (code analysis)

### API Documentation
- Swagger/OpenAPI (Backend)
- API Blueprint (Frontend integration docs)

### Testing
- Frontend: Jest, React Testing Library
- Backend: Jest, Supertest
- AI Service: Pytest

---

## 6. External APIs & Services

### Stock Market Data
| API | Mục Đích |
|-----|---------|
| VNIndex API / SSI API | Vietnamese stock data |
| Yahoo Finance API (yfinance) | Alternative data source |
| Alpha Vantage | Technical indicators |

### News & Content
| API | Mục Đích |
|-----|---------|
| NewsAPI | Stock market news |
| RSS Feeds | Source aggregation |

### Email & Notifications
| Dịch Vụ | Mục Đích |
|--------|---------|
| SendGrid / AWS SES | Email sending |
| Firebase Cloud Messaging | Push notifications |

### Payment (nếu có premium features)
| Dịch Vụ | Mục Đích |
|--------|---------|
| Stripe | Payment processing |
| Momo / VNPay | Vietnam payment options |

---

## 7. Recommended Installation Order

1. **Backend Setup**
   ```bash
   npm install
   npm run dev
   ```

2. **Database Setup**
   ```bash
   # PostgreSQL
   docker run -d -e POSTGRES_PASSWORD=password postgres:15
   ```

3. **Redis Setup**
   ```bash
   docker run -d -p 6379:6379 redis:7
   ```

4. **AI Service Setup**
   ```bash
   pip install -r requirements.txt
   python -m uvicorn src.main:app --reload
   ```

5. **Frontend Setup**
   ```bash
   npm install
   npm run dev
   ```

---

## 8. Environment Configuration

### Backend `.env` Example
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/stock_analyst
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_key
AI_SERVICE_URL=http://localhost:8000
OPENAI_API_KEY=sk-...
```

### AI Service `.env` Example
```env
ENVIRONMENT=development
HOST=0.0.0.0
PORT=8000
DATABASE_URL=postgresql://user:password@localhost:5432/stock_analyst
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...
```

### Frontend `.env` Example
```env
VITE_API_URL=http://localhost:5000/api
VITE_AI_SERVICE_URL=http://localhost:8000
VITE_ENV=development
```

---

*Bạn có thể điều chỉnh phiên bản và công nghệ tùy theo yêu cầu cụ thể của dự án*

