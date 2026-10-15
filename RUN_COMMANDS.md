# Lá»‡nh build vÃ  cháº¡y dá»± Ã¡n

TÃ i liá»‡u nÃ y lÃ  báº£ng lá»‡nh PowerShell ngáº¯n gá»n Ä‘á»ƒ build, kiá»ƒm thá»­ vÃ  cháº¡y PostgreSQL, Vnstock worker, backend vÃ  frontend. HÆ°á»›ng dáº«n cáº¥u hÃ¬nh Ä‘áº§y Ä‘á»§, quyá»n database vÃ  xá»­ lÃ½ lá»—i náº±m trong [QUICK_START](QUICK_START.md).

## Thá»© tá»± khá»Ÿi Ä‘á»™ng

1. PostgreSQL.
2. Vnstock worker â€” `127.0.0.1:8787`.
3. Backend â€” `127.0.0.1:5000`.
4. Frontend â€” `127.0.0.1:4173` khi preview production hoáº·c `127.0.0.1:5173` khi phÃ¡t triá»ƒn.

Worker, backend vÃ  frontend cáº§n ba terminal PowerShell riÃªng.

## CÃ i dependency láº§n Ä‘áº§u

### Backend

```powershell
Set-Location .\backend
npm.cmd ci
```

### Frontend

```powershell
Set-Location .\frontend
npm.cmd ci
```

### Python worker

```powershell
py --version
py -m pip install -U "vnstock>=4.0.6" "vnai>=2.5.7"
py -c "import vnstock; print('vnstock OK')"
```

## Chuáº©n bá»‹ database

Cháº¡y migrations sau khi `backend/.env` Ä‘Ã£ trá» Ä‘Ãºng PostgreSQL:

```powershell
Set-Location .\backend
npm.cmd run migrate
```

Chá»‰ seed má»™t láº§n trÃªn database demo chÆ°a cÃ³ dá»¯ liá»‡u:

```powershell
npm.cmd run seed
```

KhÃ´ng seed láº·p vÃ  khÃ´ng xÃ³a database hiá»‡n há»¯u Ä‘á»ƒ xá»­ lÃ½ lá»—i setup.

## Cháº¡y Vnstock worker

Má»Ÿ terminal thá»© nháº¥t:

```powershell
Set-Location .\backend
$env:HTTP_PROXY = ''
$env:HTTPS_PROXY = ''
$env:ALL_PROXY = ''
$env:VNSTOCK_WORKER_MAX_CONCURRENCY = '1'
py scripts/vnstock_worker.py
```

Kiá»ƒm tra worker:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8787/health
```

Hoáº·c dÃ¹ng kiá»ƒm tra tÃ­ch há»£p cá»§a backend:

```powershell
Set-Location .\backend
npm.cmd run check:vnstock-runtime
```

Probe read-only má»™t nhÃ³m mÃ£ qua listing, price board vÃ  lá»‹ch sá»­ EOD (tá»‘i Ä‘a 100 mÃ£):

```powershell
Set-Location .\backend
$env:VNSTOCK_PROBE_SYMBOLS = 'FPT,SSI'
$env:VNSTOCK_PROBE_FROM = '2026-09-01'
$env:VNSTOCK_PROBE_TO = '2026-10-02'
npm.cmd run probe:vnstock-history-gaps
```

Lá»‡nh ghi evidence cá»¥c bá»™ nhÆ°ng khÃ´ng ghi giÃ¡ vÃ o PostgreSQL.

## Cháº¡y backend

Má»Ÿ terminal thá»© hai:

```powershell
Set-Location .\backend
npm.cmd start
```

Kiá»ƒm tra backend:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5000/api/health
```

Khi phÃ¡t triá»ƒn vÃ  cáº§n tá»± reload:

```powershell
Set-Location .\backend
npm.cmd run dev
```

Backend cháº¡y JavaScript CommonJS trá»±c tiáº¿p nÃªn khÃ´ng cÃ³ bÆ°á»›c build riÃªng.

## Build frontend

```powershell
Set-Location .\frontend
npm.cmd run build
```

Build production Ä‘Æ°á»£c ghi vÃ o `frontend/dist`; lá»‡nh build Ä‘á»“ng thá»i kiá»ƒm tra bundle integrity.

## Cháº¡y frontend production preview

Má»Ÿ terminal thá»© ba sau khi build:

```powershell
Set-Location .\frontend
npm.cmd start -- --host 127.0.0.1 --port 4173 --strictPort
```

Má»Ÿ <http://127.0.0.1:4173/>.

## Cháº¡y frontend development

DÃ¹ng lá»‡nh nÃ y thay cho production preview khi sá»­a frontend:

```powershell
Set-Location .\frontend
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Má»Ÿ <http://127.0.0.1:5173/>.

## Cháº¡y kiá»ƒm thá»­

### Backend

```powershell
Set-Location .\backend
npm.cmd test -- --runInBand
```

### Frontend unit vÃ  encoding

```powershell
Set-Location .\frontend
npm.cmd test -- --runInBand
```

### Frontend E2E

```powershell
Set-Location .\frontend
npm.cmd run test:e2e
```

### Kiá»ƒm tra release frontend

```powershell
Set-Location .\frontend
npm.cmd run build
npm.cmd run verify:release
```

## Cháº¡y láº¡i nhanh sau khi mÃ¡y khá»Ÿi Ä‘á»™ng

Terminal 1:

```powershell
Set-Location .\backend
$env:HTTP_PROXY = ''
$env:HTTPS_PROXY = ''
$env:ALL_PROXY = ''
py scripts/vnstock_worker.py
```

Terminal 2:

```powershell
Set-Location .\backend
npm.cmd start
```

Terminal 3:

```powershell
Set-Location .\frontend
npm.cmd run build
npm.cmd start -- --host 127.0.0.1 --port 4173 --strictPort
```

