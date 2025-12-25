-- Tạo cron job để tự động quét RSI
-- Chạy từ 5:50 sáng đến 11:50 sáng (giờ Việt Nam), mỗi 30 phút
-- Chạy file này trong Supabase SQL Editor

-- Bước 1: Enable pg_cron extension (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Bước 2: Tạo cron job
-- LƯU Ý: 
-- - Thay YOUR_PROJECT_REF bằng Reference ID của project (lấy từ Settings → General → Reference ID)
-- - Thay YOUR_ANON_KEY bằng anon key của bạn (lấy từ Settings → API → anon key)
-- Cron job chạy mỗi 10 phút để cover các thời điểm :20 và :50
-- Edge Function sẽ filter để chỉ chạy trong window 5:50-11:50 và đúng phút :20/:50
SELECT cron.schedule(
  'scan-rsi-every-30min-morning',  -- Tên job
  '*/10 * * * *',                  -- Chạy mỗi 10 phút (:00, :10, :20, :30, :40, :50)
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

-- Kiểm tra job đã được tạo chưa
SELECT * FROM cron.job WHERE jobname = 'scan-rsi-every-30min-morning';

-- Xem lịch sử chạy (20 lần gần nhất)
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
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'scan-rsi-every-30min-morning')
ORDER BY start_time DESC 
LIMIT 20;

