# Kiểm tra Cron Job có lưu vào History

## Vấn đề từ logs:

Từ logs bạn gửi, tôi thấy:
- Edge Function được gọi lúc **11:52:56**
- Nhưng bị bỏ qua vì **minute = 52** không chia hết cho 5
- Cron job chỉ chạy vào phút **:00, :05, :10, :15, :20, :25, :30, :35, :40, :45, :50, :55**

## Các khả năng:

### 1. Cron job chạy không đúng thời điểm
Cron job có thể được trigger bởi pg_cron nhưng không đúng vào phút chia hết cho 5.

**Kiểm tra:**
Chạy SQL này trong Supabase:
```sql
-- Xem cron job schedule
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname = 'scan-rsi-every-5min';

-- Xem lịch sử chạy
SELECT 
  runid,
  job_pid,
  status,
  return_message,
  start_time,
  end_time,
  EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'scan-rsi-every-5min')
ORDER BY start_time DESC 
LIMIT 20;
```

**Nếu `schedule` không phải `*/5 * * * *`** → Cron job schedule sai

### 2. Cron job chạy đúng nhưng Edge Function check thời gian sai
Edge Function có thể check thời gian không đúng.

**Kiểm tra:**
- Xem logs khi cron job chạy vào đúng thời điểm (ví dụ: 11:50:05, 11:55:05)
- Xem có log `[Auto Scan] ✅ Within scan window, proceeding with scan` không

### 3. Cron job chạy và gọi API nhưng không lưu được
API có thể được gọi nhưng save thất bại.

**Kiểm tra:**
- Xem logs trong Next.js API (Vercel)
- Tìm log `[API] Service Role Key available: true/false`
- Tìm log `[saveScanHistory] ❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY not found!`

## Cách test:

### Test 1: Kiểm tra cron job schedule
Chạy SQL query trên để xem schedule có đúng không.

### Test 2: Đợi đến đúng thời điểm
Đợi đến phút chia hết cho 5 (ví dụ: 12:00:05, 12:05:05) và xem logs:
- Edge Function có được gọi không?
- Có log `[Auto Scan] ✅ Within scan window` không?
- Có gọi Next.js API không?
- API có lưu được không?

### Test 3: Test thủ công Edge Function
1. Vào Supabase Dashboard → Edge Functions → `scan-rsi`
2. Click **Invoke** (sẽ gọi ngay lập tức, bỏ qua check thời gian)
3. Xem logs:
   - Có gọi Next.js API không?
   - API response như thế nào?
   - Có lưu vào database không?

### Test 4: Test Next.js API trực tiếp
```bash
curl -X POST https://your-app.vercel.app/api/scan-rsi
```

Kiểm tra:
- Response có `success: true` không?
- Response có `filteredCoins > 0` không?
- Database có record mới không?

## Checklist:

- [ ] Cron job schedule có đúng `*/5 * * * *` không?
- [ ] Cron job có chạy vào đúng thời điểm (:00, :05, :10...) không?
- [ ] Edge Function có log `✅ Within scan window` khi chạy đúng thời điểm không?
- [ ] Next.js API có được gọi không?
- [ ] `SUPABASE_SERVICE_ROLE_KEY` có trong Vercel environment variables không?
- [ ] RLS có disable không?
- [ ] Database có record mới sau khi cron job chạy không?

## Nếu vẫn không được:

1. **Kiểm tra logs chi tiết** - Xem từng bước trong flow
2. **Test từng bước** - Test API trực tiếp, test Edge Function trực tiếp
3. **Kiểm tra database** - Xem có record mới không, xem có lỗi gì không


