# Lệnh build và chạy dự án

Tài liệu này là bảng lệnh PowerShell ngắn gọn để build, kiểm thử và chạy PostgreSQL, Vnstock worker, backend và frontend. Hướng dẫn cấu hình đầy đủ, quyền database và xử lý lỗi nằm trong [QUICK_START](QUICK_START.md).

## Thứ tự khởi động

1. PostgreSQL.
2. Vnstock worker — `127.0.0.1:8787`.
3. Backend — `127.0.0.1:5000`.
4. Frontend — `127.0.0.1:4173` khi preview production hoặc `127.0.0.1:5173` khi phát triển.

Worker, backend và frontend cần ba terminal PowerShell riêng.

## Cài dependency lần đầu

### Backend

```powershell
Set-Location D:\MyProject\backend
npm.cmd ci
```

### Frontend

```powershell
Set-Location D:\MyProject\frontend
npm.cmd ci
```

### Python worker

```powershell
py --version
py -m pip install -U "vnstock>=4.0.6" "vnai>=2.5.7"
py -c "import vnstock; print('vnstock OK')"
```

## Chuẩn bị database

Chạy migrations sau khi `backend/.env` đã trỏ đúng PostgreSQL:

```powershell
Set-Location D:\MyProject\backend
npm.cmd run migrate
```

Chỉ seed một lần trên database demo chưa có dữ liệu:

```powershell
npm.cmd run seed
```

Không seed lặp và không xóa database hiện hữu để xử lý lỗi setup.

## Chạy Vnstock worker

Mở terminal thứ nhất:

```powershell
Set-Location D:\MyProject\backend
$env:HTTP_PROXY = ''
$env:HTTPS_PROXY = ''
$env:ALL_PROXY = ''
py scripts/vnstock_worker.py
```

Kiểm tra worker:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8787/health
```

Hoặc dùng kiểm tra tích hợp của backend:

```powershell
Set-Location D:\MyProject\backend
npm.cmd run check:vnstock-runtime
```

## Chạy backend

Mở terminal thứ hai:

```powershell
Set-Location D:\MyProject\backend
npm.cmd start
```

Kiểm tra backend:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5000/api/health
```

Khi phát triển và cần tự reload:

```powershell
Set-Location D:\MyProject\backend
npm.cmd run dev
```

Backend chạy JavaScript CommonJS trực tiếp nên không có bước build riêng.

## Build frontend

```powershell
Set-Location D:\MyProject\frontend
npm.cmd run build
```

Build production được ghi vào `frontend/dist`; lệnh build đồng thời kiểm tra bundle integrity.

## Chạy frontend production preview

Mở terminal thứ ba sau khi build:

```powershell
Set-Location D:\MyProject\frontend
npm.cmd start -- --host 127.0.0.1 --port 4173 --strictPort
```

Mở <http://127.0.0.1:4173/>.

## Chạy frontend development

Dùng lệnh này thay cho production preview khi sửa frontend:

```powershell
Set-Location D:\MyProject\frontend
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Mở <http://127.0.0.1:5173/>.

## Chạy kiểm thử

### Backend

```powershell
Set-Location D:\MyProject\backend
npm.cmd test -- --runInBand
```

### Frontend unit và encoding

```powershell
Set-Location D:\MyProject\frontend
npm.cmd test -- --runInBand
```

### Frontend E2E

```powershell
Set-Location D:\MyProject\frontend
npm.cmd run test:e2e
```

### Kiểm tra release frontend

```powershell
Set-Location D:\MyProject\frontend
npm.cmd run build
npm.cmd run verify:release
```

## Chạy lại nhanh sau khi máy khởi động

Terminal 1:

```powershell
Set-Location D:\MyProject\backend
$env:HTTP_PROXY = ''
$env:HTTPS_PROXY = ''
$env:ALL_PROXY = ''
py scripts/vnstock_worker.py
```

Terminal 2:

```powershell
Set-Location D:\MyProject\backend
npm.cmd start
```

Terminal 3:

```powershell
Set-Location D:\MyProject\frontend
npm.cmd run build
npm.cmd start -- --host 127.0.0.1 --port 4173 --strictPort
```
