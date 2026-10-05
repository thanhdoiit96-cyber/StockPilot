> Phạm vi: tài liệu thiết kế mục tiêu và ví dụ tham khảo, chưa phải mô tả đầy đủ của bản đang chạy. Hiện trạng: [PROJECT_STATUS](PROJECT_STATUS.md); hành vi đã triển khai: [backend](../backend/README.md), [frontend](../frontend/README.md); cách chạy hiện hành: [QUICK_START](../QUICK_START.md).

# Hướng Dẫn Deployment

> Hiện trạng Compose demo: `postgres`, `worker`, `backend`, `frontend` đều có healthcheck và `restart: unless-stopped`; dependency chờ `service_healthy`. Worker dùng image Python riêng, concurrency 1, không publish cổng host. Hướng dẫn chạy chuẩn nằm trong [QUICK_START](../QUICK_START.md); các phần bên dưới có thể là thiết kế triển khai mở rộng.

## 1. Environment Setup

### Pre-requisites
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+
- Node.js 18+
- Python 3.10+
- Git

---

## 2. Development Environment

### 2.1 Clone Repository
```bash
git clone https://github.com/yourname/stock-analyst.git
cd stock-analyst
```

### 2.2 Setup Backend
```bash
cd backend
cp .env.example .env

# Install dependencies
npm install

# Apply database migrations
npm run migrate

# Seed demo data
npm run seed

# Start development server
npm run dev
```

### 2.3 Setup Frontend
```bash
cd frontend
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

### 2.4 Generative AI status

There is no separate AI service in the current repository. The Advisor is rule-based and the generative AI gate remains disabled until a provider adapter, rights evidence and cost/fallback controls are implemented.

### 2.5 Docker Compose (Recommended)
```bash
# At project root
docker-compose up

# This starts:
# - PostgreSQL (port 5432)
# - Redis (port 6379)
# - Backend (port 5000)
# - Frontend (port 5173)
```

---

## 3. Staging Environment

### 3.1 Docker Image Build
```bash
# Build backend image
cd backend
docker build -t stock-analyst-backend:latest .

# Build frontend image
cd frontend
docker build -t stock-analyst-frontend:latest .

# Build AI service image
cd ai-service
docker build -t stock-analyst-ai:latest .
```

### 3.2 Docker Compose Staging
```yaml
# docker-compose.staging.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: stock_analyst_staging
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_staging_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    image: stock-analyst-backend:latest
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: staging
      DATABASE_URL: postgresql://...
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  frontend:
    image: stock-analyst-frontend:latest
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:5000/api

  ai-service:
    image: stock-analyst-ai:latest
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://...
      REDIS_URL: redis://redis:6379

volumes:
  postgres_staging_data:
```

### 3.3 Deploy to Staging Server
```bash
# SSH into staging server
ssh user@staging-server.com

# Pull latest code
git pull origin main

# Build and run
docker-compose -f docker-compose.staging.yml pull
docker-compose -f docker-compose.staging.yml up -d

# Check health
docker-compose ps
```

---

## 4. Production Deployment

### 4.1 Infrastructure Setup

#### AWS Deployment Example
```
Frontend:
├─ CloudFront (CDN)
├─ S3 (Hosting static assets)
└─ ACM (SSL Certificate)

Backend:
├─ Application Load Balancer
├─ EC2 Auto Scaling Group
├─ CloudWatch (Monitoring)
└─ RDS PostgreSQL (Managed Database)

AI Service:
├─ Application Load Balancer
├─ ECS (Container orchestration)
├─ SageMaker or EC2 (if using ML models)
└─ CloudWatch (Monitoring)

Cache:
└─ ElastiCache (AWS Managed Redis)
```

### 4.2 Database Migration
```bash
# Backup staging database
pg_dump stock_analyst_staging > backup_staging_$(date +%Y%m%d).sql

# Create production database
psql -h prod-rds.amazonaws.com -U admin -d postgres
CREATE DATABASE stock_analyst_prod;

# Restore from backup
psql -h prod-rds.amazonaws.com -U admin stock_analyst_prod < backup_staging.sql

# Run migrations
npm run migrate
```

### 4.3 SSL/TLS Configuration
```nginx
# nginx.conf example
server {
    listen 443 ssl http2;
    server_name api.stockanalyst.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /api {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ai {
        proxy_pass http://ai-service:8000;
    }
}
```

### 4.4 Production Environment Variables
```env
# .env.prod
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@prod-rds.amazonaws.com:5432/stock_analyst_prod
REDIS_URL=redis://prod-elasticache.amazonaws.com:6379
JWT_SECRET=<very-strong-secret-key>
JWT_EXPIRATION=24h
LOG_LEVEL=info
SENTRY_DSN=https://...
AI_SERVICE_URL=https://ai.stockanalyst.com
OPENAI_API_KEY=sk-...
```

### 4.5 Auto-scaling Configuration
```yaml
# Kubernetes HPA example (if using K8s)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## 5. CI/CD Pipeline Setup

### 5.1 GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
      redis:
        image: redis:7

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Backend tests
        run: |
          cd backend
          npm install
          npm run test

      - name: AI Service tests
        run: |
          cd ai-service
          pip install -r requirements.txt
          pytest

      - name: Frontend tests
        run: |
          cd frontend
          npm install
          npm run test

  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:latest

      - name: Build and push frontend
        uses: docker/build-push-action@v4
        with:
          context: ./frontend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:latest

      - name: Build and push AI service
        uses: docker/build-push-action@v4
        with:
          context: ./ai-service
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/ai-service:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    
    steps:
      - name: Deploy to production
        run: |
          # SSH into prod server and run deployment script
          ssh -i ${{ secrets.DEPLOY_KEY }} \
              deploy@prod.stockanalyst.com \
              'cd /app && bash deploy.sh'

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "Deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Deployment to production: ${{ job.status }}\n${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                  }
                }
              ]
            }
```

### 5.2 Deploy Script
```bash
#!/bin/bash
# deploy.sh

set -e

echo "Pulling latest code..."
git pull origin main

echo "Building images..."
docker-compose -f docker-compose.prod.yml build

echo "Stopping old containers..."
docker-compose -f docker-compose.prod.yml down

echo "Starting new containers..."
docker-compose -f docker-compose.prod.yml up -d

echo "Running migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend npm run migrate

echo "Priming cache..."
# No cache:prime script exists in the current backend; warm cache only through normal API/ingestion traffic.

echo "Health check..."
sleep 10
curl -f http://localhost:5000/api/health || exit 1

echo "Deployment successful!"
```

---

## 6. Monitoring & Alerting

### 6.1 Liveness Healthcheck
```javascript
// Backend
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

app.get('/health/detailed', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    ai_service: await checkAIService()
  };
  
  const allHealthy = Object.values(checks).every(c => c === 'UP');
  res.status(allHealthy ? 200 : 503).json(checks);
});
```

### 6.2 Monitoring Setup (Datadog/New Relic)
```javascript
const StatsD = require('node-statsd').StatsD;
const dogstatsd = new StatsD('localhost', 8125, {
  prefix: 'stock_analyst.'
});

// Track metrics
dogstatsd.gauge('api.response_time', responseTime);
dogstatsd.increment('api.requests.total');
dogstatsd.histogram('stock.analysis.time', executionTime);
```

### 6.3 Log Aggregation (ELK Stack)
```yaml
# logstash.conf
input {
  file {
    path => "/var/log/app/*.log"
    start_position => "beginning"
    codec => json
  }
}

filter {
  if [type] == "backend" {
    mutate {
      add_field => { "service" => "backend" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "app-logs-%{+YYYY.MM.dd}"
  }
}
```

---

## 7. Backup Strategy

### Daily Backups
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
pg_dump $DATABASE_URL > "$BACKUP_DIR/db_$DATE.sql"
gzip "$BACKUP_DIR/db_$DATE.sql"

# Upload to S3
aws s3 cp "$BACKUP_DIR/db_$DATE.sql.gz" s3://backups/database/

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

---

## 8. Rollback Procedure

```bash
# Tag a release
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0

# Rollback to previous version
git checkout v0.9.9
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

---

## 9. Security Checklist

- [ ] HTTPS/SSL enabled
- [ ] Database encryption at rest
- [ ] Secrets rotated
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Security headers (Helmet)
- [ ] Audit logging enabled
- [ ] Monitoring & alerting active

---

*Hướng dẫn deployment có thể được điều chỉnh dựa trên cơ sở hạ tầng cụ thể*

