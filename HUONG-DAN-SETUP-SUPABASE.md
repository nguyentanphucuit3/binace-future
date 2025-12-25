# Hướng dẫn Setup Cron Job Auto Scan RSI trên Supabase Dashboard

## Bước 1: Tạo Edge Function trên Supabase Dashboard

### 1.1. Vào Supabase Dashboard
1. Đăng nhập vào [https://app.supabase.com](https://app.supabase.com)
2. Chọn project của bạn

### 1.2. Vào Edge Functions
1. Vào menu bên trái, chọn **Edge Functions**
2. Bạn sẽ thấy trang với 3 lựa chọn: **Via Editor**, **AI Assistant**, **Via CLI**

### 1.3. Tạo Function qua Editor (Khuyến nghị)
1. Click nút **"Open Editor"** trong card **"<> Via Editor"**
2. Hoặc click nút **"Deploy a new function"** ở góc trên bên phải → chọn **"Via Editor"**
3. Trong popup/modal hiện ra:
   - **Function name**: Nhập `scan-rsi`
   - Click **Create function** hoặc **Deploy**

### 1.4. Copy code vào function
1. Sau khi tạo function, bạn sẽ thấy editor với code mẫu
2. Mở file `supabase/functions/scan-rsi/index.ts` trong project của bạn (trong VS Code)
3. Copy **TOÀN BỘ** nội dung từ file đó (Ctrl+A, Ctrl+C)
4. Quay lại Supabase Dashboard, xóa hết code mẫu trong editor
5. Paste code vừa copy vào (Ctrl+V)
6. Click nút **Deploy** (màu xanh) ở góc trên bên phải để deploy function

**Lưu ý**: Nếu không thấy nút Deploy, có thể function đã tự động save. Kiểm tra xem function đã xuất hiện trong danh sách bên trái chưa.

## Bước 2: Set Environment Variables

### 2.1. Vào Settings
1. Trong Edge Functions, click vào function `scan-rsi`
2. Click tab **Settings** hoặc icon ⚙️

### 2.2. Thêm Environment Variables
Thêm 3 biến môi trường sau:

1. **SUPABASE_URL**
   - Value: URL của project (ví dụ: `https://xxxxx.supabase.co`)
   - Lấy từ: Settings → API → Project URL

2. **SUPABASE_SERVICE_ROLE_KEY**
   - Value: Service Role Key (key bí mật, không phải anon key)
   - Lấy từ: Settings → API → service_role key (secret)
   - ⚠️ **LƯU Ý**: Đây là key quan trọng, không chia sẻ công khai

3. **NEXT_PUBLIC_APP_URL**
   - Value: URL của Next.js app của bạn
   - Nếu chạy local: `http://localhost:3000`
   - Nếu deploy (Vercel/Netlify): URL production (ví dụ: `https://your-app.vercel.app`)

### 2.3. Save Settings
Click **Save** để lưu các biến môi trường

## Bước 3: Enable pg_cron Extension

### 3.1. Vào SQL Editor
1. Trong menu bên trái, chọn **SQL Editor**
2. Click **New query**

### 3.2. Chạy SQL để enable extension
Copy và chạy SQL sau:

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
  '*/5 * * * *',                -- Chạy mỗi 5 phút (:00, :05, :10, :15, ...)
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

## Bước 5: Kiểm tra Cron Job đã chạy

### 5.1. Kiểm tra job đã được tạo
Chạy SQL sau:

```sql
-- Xem danh sách các cron job
SELECT * FROM cron.job WHERE jobname = 'scan-rsi-every-5min';
```

Nếu có kết quả trả về → Job đã được tạo thành công ✅

### 5.2. Xem lịch sử chạy
Chạy SQL sau để xem job đã chạy chưa:

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

## Bước 6: Test thủ công (Optional)

### 6.1. Test Edge Function
1. Vào **Edge Functions** → `scan-rsi`
2. Click tab **Invoke** hoặc icon ▶️
3. Click **Invoke function**
4. Xem kết quả trong Logs

### 6.2. Test API Route
Nếu app đã deploy, test API route:

```bash
curl -X POST https://your-app.vercel.app/api/scan-rsi \
  -H "Content-Type: application/json"
```

## Bước 7: Kiểm tra kết quả

### 7.1. Kiểm tra trong Database
1. Vào **Table Editor** → `scan_history`
2. Xem các bản ghi mới được tạo

### 7.2. Kiểm tra Logs
1. Vào **Edge Functions** → `scan-rsi` → **Logs**
2. Xem các log khi function chạy

## Lưu ý quan trọng

1. **Thời gian chạy**: Function chạy **24/7** (không giới hạn thời gian)
2. **Thời điểm chạy**: Chạy mỗi 5 phút tại các phút :00, :05, :10, :15, :20, :25, :30, :35, :40, :45, :50, :55
3. **Điều kiện lưu**: Chỉ lưu vào history khi có coins với RSI >= 70
4. **Xóa dữ liệu cũ**: Tự động xóa dữ liệu cũ hơn 24 giờ sau mỗi lần scan
5. **Rate Limit**: Đảm bảo Next.js app không có rate limit cho API route `/api/scan-rsi`

## Troubleshooting

### Job không chạy?
1. Kiểm tra pg_cron đã enable chưa
2. Kiểm tra URL và Authorization header trong cron job
3. Xem logs trong Edge Functions

### Function báo lỗi?
1. Kiểm tra Environment Variables đã set đúng chưa
2. Kiểm tra NEXT_PUBLIC_APP_URL có đúng không
3. Xem logs chi tiết trong Edge Functions

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
5. ✅ Kiểm tra job đã chạy
6. ✅ Test và verify

Sau khi setup xong, hệ thống sẽ tự động quét RSI mỗi 5 phút từ 18:00-06:00 giờ Việt Nam! 🎉

