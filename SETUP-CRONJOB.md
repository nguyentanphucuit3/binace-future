# Hướng dẫn Setup Cronjob Auto Scan RSI

## Tổng quan

Cronjob sẽ tự động:
- Gọi API quét RSI mỗi 5 phút
- Lưu vào bảng `scan_history` khi có data (coins với RSI >= 70)
- Tự động xóa dữ liệu cũ hơn 24 giờ

## Bước 1: Tạo Edge Function trên Supabase

### 1.1. Vào Supabase Dashboard
1. Đăng nhập vào [https://app.supabase.com](https://app.supabase.com)
2. Chọn project của bạn

### 1.2. Tạo Edge Function
1. Vào menu bên trái → **Edge Functions**
2. Click **"Deploy a new function"** → chọn **"Via Editor"**
3. Nhập tên function: `scan-rsi`
4. Click **Create function**

### 1.3. Copy code vào function
1. Mở file `supabase/functions/scan-rsi/index.ts` trong project
2. Copy **TOÀN BỘ** nội dung (Ctrl+A, Ctrl+C)
3. Quay lại Supabase Dashboard, xóa code mẫu
4. Paste code vào (Ctrl+V)
5. Click **Deploy** để deploy function

## Bước 2: Set Environment Variables

### 2.1. Vào Settings của function
1. Trong Edge Functions, click vào function `scan-rsi`
2. Click tab **Settings** hoặc icon ⚙️

### 2.2. Thêm 3 biến môi trường:

1. **SUPABASE_URL**
   - Value: URL của project (ví dụ: `https://xxxxx.supabase.co`)
   - Lấy từ: Settings → API → Project URL

2. **SUPABASE_SERVICE_ROLE_KEY**
   - Value: Service Role Key (key bí mật)
   - Lấy từ: Settings → API → service_role key (secret)
   - ⚠️ **LƯU Ý**: Đây là key quan trọng, không chia sẻ công khai

3. **NEXT_PUBLIC_APP_URL**
   - Value: URL của Next.js app
   - Nếu chạy local: `http://localhost:3000`
   - Nếu deploy (Vercel/Netlify): URL production (ví dụ: `https://your-app.vercel.app`)

### 2.3. Save Settings
Click **Save** để lưu các biến môi trường

## Bước 3: Enable pg_cron Extension

### 3.1. Vào SQL Editor
1. Trong menu bên trái, chọn **SQL Editor**
2. Click **New query**

### 3.2. Chạy SQL để enable extension
```sql
-- Enable pg_cron extension (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

Click **Run** để chạy

## Bước 4: Tạo Cron Job

### 4.1. Lấy thông tin cần thiết
Trước khi tạo cron job, bạn cần:

1. **Project Reference** (Project Ref):
   - Vào Settings → General
   - Copy **Reference ID** (ví dụ: `abcdefghijklmnop`)

2. **Anon Key**:
   - Vào Settings → API
   - Copy **anon** `public` key

### 4.2. Chạy SQL tạo Cron Job
Trong SQL Editor, copy và chạy SQL sau (thay thế các giá trị):

```sql
-- Tạo cron job chạy mỗi 5 phút
SELECT cron.schedule(
  'scan-rsi-every-5min',  -- Tên job
  '*/5 * * * *',          -- Chạy mỗi 5 phút (:00, :05, :10, :15, ...)
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scan-rsi',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_ANON_KEY'
      )
    ) AS request_id;
  $$
);
```

**Thay thế:**
- `YOUR_PROJECT_REF` → Reference ID của project (lấy từ Settings → General → Reference ID)
- `YOUR_ANON_KEY` → Anon key của bạn (lấy từ Settings → API → anon key)

Click **Run** để tạo cron job

## Bước 5: Kiểm tra Cron Job

### 5.1. Kiểm tra job đã được tạo
```sql
-- Xem danh sách các cron job
SELECT * FROM cron.job WHERE jobname = 'scan-rsi-every-5min';
```

Nếu có kết quả trả về → Job đã được tạo thành công ✅

### 5.2. Xem lịch sử chạy
```sql
-- Xem lịch sử chạy của job (20 lần gần nhất)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'scan-rsi-every-5min')
ORDER BY start_time DESC 
LIMIT 20;
```

### 5.3. Kiểm tra data đã lưu
1. Vào **Table Editor** → `scan_history`
2. Xem các bản ghi mới được tạo
3. Mỗi bản ghi chứa:
   - `scan_time`: Thời gian scan (giờ Việt Nam)
   - `coins_data`: Mảng các coins có RSI >= 70
   - `created_at`: Thời gian tạo record

### 5.4. Kiểm tra Logs
1. Vào **Edge Functions** → `scan-rsi` → **Logs**
2. Xem các log khi function chạy:
   - `[Auto Scan] Request received`
   - `[Auto Scan] Vietnam time`
   - `[Auto Scan] Calling scan API`
   - `[Auto Scan] Saving X coins directly to database`
   - `[Auto Scan] Successfully saved`

## Bước 6: Test thủ công (Optional)

### 6.1. Test Edge Function
1. Vào **Edge Functions** → `scan-rsi`
2. Click tab **Invoke** hoặc icon ▶️
3. Click **Invoke function**
4. Xem kết quả trong Logs và Response

### 6.2. Test API Route
Nếu app đã deploy, test API route:

```bash
curl -X POST https://your-app.vercel.app/api/scan-rsi \
  -H "Content-Type: application/json"
```

## Troubleshooting

### Job không chạy?
1. Kiểm tra pg_cron đã enable chưa:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Kiểm tra URL và Authorization header trong cron job:
   ```sql
   SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'scan-rsi-every-5min';
   ```

3. Xem logs trong Edge Functions

### Function báo lỗi?
1. Kiểm tra Environment Variables đã set đúng chưa
2. Kiểm tra NEXT_PUBLIC_APP_URL có đúng không (phải accessible từ Supabase)
3. Xem logs chi tiết trong Edge Functions

### Không có data lưu vào history?
1. Kiểm tra xem có coins với RSI >= 70 không (function chỉ lưu khi có data)
2. Kiểm tra logs xem có lỗi khi save không
3. Kiểm tra RLS (Row Level Security) đã disable chưa:
   ```sql
   ALTER TABLE scan_history DISABLE ROW LEVEL SECURITY;
   ```

### Xóa Cron Job
Nếu muốn dừng cron job:
```sql
SELECT cron.unschedule('scan-rsi-every-5min');
```

### Xem tất cả cron jobs
```sql
SELECT * FROM cron.job;
```

## Tóm tắt các bước

1. ✅ Tạo Edge Function `scan-rsi` và deploy
2. ✅ Set 3 Environment Variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL)
3. ✅ Enable pg_cron extension
4. ✅ Tạo cron job với SQL (chỉ cần thay YOUR_ANON_KEY, URL đã được set sẵn)
5. ✅ Kiểm tra job đã chạy và data đã lưu

Sau khi setup xong, hệ thống sẽ tự động quét RSI mỗi 5 phút và lưu vào history! 🎉

