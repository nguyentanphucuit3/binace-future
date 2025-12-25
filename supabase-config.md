# Supabase Cron Job Configuration

## Setup Auto Scan RSI Cron Job

### 1. Deploy Edge Function

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy scan-rsi
```

### 2. Set Environment Variables

In Supabase Dashboard → Edge Functions → Settings, add:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (from Settings → API)
- `NEXT_PUBLIC_APP_URL`: Your Next.js app URL (e.g., `https://your-app.vercel.app`)

### 3. Enable pg_cron Extension (if not already enabled)

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 4. Create Cron Job

Run this SQL in Supabase SQL Editor (chỉ cần thay YOUR_ANON_KEY):

```sql
-- Create cron job to run every 5 minutes
-- This will trigger at :00, :05, :10, :15, :20, :25, :30, :35, :40, :45, :50, :55 of each hour
SELECT cron.schedule(
  'scan-rsi-every-5min',
  '*/5 * * * *', -- Every 5 minutes
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

**Note**: Replace:
- `YOUR_PROJECT_REF` → Reference ID của project (lấy từ Settings → General → Reference ID)
- `YOUR_ANON_KEY` with your Supabase anon key (found in Settings → API)

### 5. Verify Cron Job

```sql
-- Check scheduled jobs
SELECT * FROM cron.job;

-- Check job run history
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'scan-rsi-every-5min')
ORDER BY start_time DESC 
LIMIT 10;
```

### 6. Manual Test

You can test the function manually:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/scan-rsi \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Notes

- The function will only execute scans from 18:00 to 06:00 Vietnam time (GMT+7)
- Scans run at :05 seconds of each 5-minute interval (e.g., 18:00:05, 18:05:05, 18:10:05, etc.)
- The function waits until :05 seconds before executing the scan
- Old history entries (>24 hours) are automatically deleted after each scan
- Cron job runs every 5 minutes, but the function filters to only execute during the time window

## Troubleshooting

### Check if cron job is running:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'scan-rsi-every-5min')
ORDER BY start_time DESC 
LIMIT 20;
```

### Unschedule the job:
```sql
SELECT cron.unschedule('scan-rsi-every-5min');
```

### Update the schedule:
```sql
-- First unschedule
SELECT cron.unschedule('scan-rsi-every-5min');

-- Then create new schedule with different timing
SELECT cron.schedule(
  'scan-rsi-every-5min',
  '*/5 * * * *',
  $$...$$
);
```

