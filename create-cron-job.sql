-- Tạo cron job để tự động quét RSI mỗi 5 phút
-- Chạy file này trong Supabase SQL Editor

-- Bước 1: Enable pg_cron extension (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Bước 2: Tạo cron job
-- LƯU Ý: 
-- - Thay YOUR_PROJECT_REF bằng Reference ID của project (lấy từ Settings → General → Reference ID)
-- - Thay YOUR_ANON_KEY bằng anon key của bạn (lấy từ Settings → API → anon key)
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

-- Kiểm tra job đã được tạo chưa
SELECT * FROM cron.job WHERE jobname = 'scan-rsi-every-5min';

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
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'scan-rsi-every-5min')
ORDER BY start_time DESC 
LIMIT 20;

