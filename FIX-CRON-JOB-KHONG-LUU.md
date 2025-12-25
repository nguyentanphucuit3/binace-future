# Fix: Cron Job không lưu vào History Table

## Nguyên nhân thường gặp:

### 1. ❌ SUPABASE_SERVICE_ROLE_KEY chưa được set trong Production

**Triệu chứng:**
- Logs hiển thị: `[saveScanHistory] WARNING: SUPABASE_SERVICE_ROLE_KEY not found`
- `Service Role Key available: false`

**Cách fix:**
1. Vào **Vercel Dashboard** → Project → **Settings** → **Environment Variables**
2. Thêm biến:
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Lấy từ **Supabase Dashboard** → **Settings** → **API** → `service_role` key (secret)
3. **Redeploy** app (hoặc đợi auto-deploy)

### 2. ❌ RLS (Row Level Security) đang enable

**Triệu chứng:**
- Logs hiển thị: `Error saving scan history: new row violates row-level security policy`
- Hoặc không có lỗi nhưng không có data trong database

**Cách fix:**
Chạy SQL này trong **Supabase SQL Editor**:
```sql
ALTER TABLE scan_history DISABLE ROW LEVEL SECURITY;
```

### 3. ❌ Không có coins RSI >= 70

**Triệu chứng:**
- Logs hiển thị: `No coins with RSI >= 70 found, skipping save to history`
- `filteredCoins: 0`

**Đây không phải lỗi** - Đơn giản là không có coins nào thỏa điều kiện, nên không lưu (theo yêu cầu ban đầu)

### 4. ❌ API URL không đúng

**Triệu chứng:**
- Edge Function logs: `Scan API failed: 404`
- Hoặc timeout

**Cách fix:**
1. Kiểm tra `NEXT_PUBLIC_APP_URL` trong **Supabase Edge Function** environment variables
2. Đảm bảo URL đúng (không có trailing slash)
3. Đảm bảo Next.js app đang chạy và accessible

## Cách kiểm tra:

### Bước 1: Kiểm tra Logs

**Edge Function Logs:**
1. Vào **Supabase Dashboard** → **Edge Functions** → `scan-rsi`
2. Click tab **Logs**
3. Tìm các log:
   - `[Auto Scan] API Response Status: ...`
   - `[Auto Scan] API Response Body: ...`
   - `[Auto Scan] Scan Result: ...`

**Next.js API Logs (Vercel):**
1. Vào **Vercel Dashboard** → Project → **Logs**
2. Filter theo function: `/api/scan-rsi`
3. Tìm các log:
   - `[API] Service Role Key available: true/false` ⚠️ **QUAN TRỌNG**
   - `[saveScanHistory] WARNING: SUPABASE_SERVICE_ROLE_KEY not found` ⚠️
   - `[API] Failed to save scan history: ...`

### Bước 2: Test thủ công

**Test Next.js API:**
```bash
curl -X POST https://your-app.vercel.app/api/scan-rsi
```

Kiểm tra:
- Response có `success: true` không?
- Response có `filteredCoins > 0` không?
- Database có record mới không?

**Test Edge Function:**
1. Vào **Supabase Dashboard** → **Edge Functions** → `scan-rsi`
2. Click **Invoke**
3. Xem logs và response

### Bước 3: Kiểm tra Database

Chạy SQL trong Supabase:
```sql
-- Xem record mới nhất
SELECT 
  id,
  created_at,
  scan_time,
  jsonb_array_length(coins_data) as coins_count
FROM scan_history
ORDER BY created_at DESC
LIMIT 10;
```

## Checklist để fix:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` có trong Vercel environment variables không?
- [ ] RLS có disable không? (`ALTER TABLE scan_history DISABLE ROW LEVEL SECURITY;`)
- [ ] `NEXT_PUBLIC_APP_URL` trong Edge Function có đúng không?
- [ ] Test API thủ công có lưu được không?
- [ ] Xem logs có lỗi gì không?

## Nếu vẫn không được:

1. **Kiểm tra logs chi tiết** - Xem có lỗi cụ thể nào không
2. **Test từng bước** - Test API trực tiếp, test Edge Function trực tiếp
3. **Kiểm tra database permissions** - Đảm bảo table cho phép insert
4. **Kiểm tra network** - Edge Function có gọi được Next.js API không


