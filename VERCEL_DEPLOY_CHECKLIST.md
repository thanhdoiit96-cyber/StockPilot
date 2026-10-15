# Vercel Deployment Checklist

## 1. Create frontend project
- Project name: `stock-pilot`
- Root directory: `frontend`
- Framework preset: `Vite`
- Build command: `npm install && npm run build`
- Output directory: `dist`

Environment variables:
```env
VITE_API_BASE_URL=https://stock-pilot-api.vercel.app/api
VITE_ENABLE_FORECAST_RESEARCH=false
VITE_ENABLE_FORECAST_LIVE=false
```

## 2. Create backend project
- Project name: `stock-pilot-api`
- Root directory: `backend`
- Framework preset: `Node.js`
- Build command: `npm install`
- Start command: `npm start`

Environment variables:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://user:password@host:5432/stock_pilot_db
JWT_SECRET=replace_with_a_long_secure_secret_32_chars
AUTH_ACCESS_EXPIRES_IN=15m
CORS_ORIGIN=https://stock-pilot.vercel.app
ADMIN_API_KEY=
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
FORECAST_RESEARCH_PREVIEW=false
VNSTOCK_EOD_ENABLED=false
VNSTOCK_LISTING_SYNC_ENABLED=false
QUOTE_FRESHNESS_ENABLED=false
COMPANY_DATA_SYNC_ENABLED=false
VNSTOCK_WORKER_URL=
```

## 3. Database
- Create a PostgreSQL database in Vercel Storage or another provider.
- Copy the actual `DATABASE_URL` and paste into backend env.
- Do not leave the placeholder `user:password@host:5432/...` in production.

## 4. CORS
- Frontend exact origin must match backend `CORS_ORIGIN`.
- Example: `https://stock-pilot.vercel.app`
- Do not use `*` or a wildcard in production.

## 5. Deploy order
1. Deploy database.
2. Deploy backend first.
3. Copy backend URL.
4. Put backend URL into frontend `VITE_API_BASE_URL`.
5. Deploy frontend.
6. Verify the app loads and calls `/api/...` successfully.

## 6. Smoke checks after deploy
- Open frontend URL.
- Confirm page loads.
- Confirm backend health works at `https://stock-pilot-api.vercel.app/api/health`.
- Confirm frontend API calls reach backend correctly.

## 7. Known limitation
- Vercel serverless is not ideal for long-running cron jobs or background workers.
- If you need scheduled jobs, move them to a separate worker service or external scheduler.
