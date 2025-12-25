// Supabase Edge Function to auto scan RSI
// Runs from 5:50 AM to 11:50 AM Vietnam time, every 30 minutes
// Schedule: 5:50, 6:20, 6:50, 7:20, 7:50, 8:20, 8:50, 9:20, 9:50, 10:20, 10:50, 11:20, 11:50

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TIMEZONE = "Asia/Ho_Chi_Minh";

// Helper to get Vietnam time
// Returns an object with Vietnam timezone values
function getVietnamTimeInfo() {
  const now = new Date();
  
  // Use Intl.DateTimeFormat to get Vietnam time components
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  
  return {
    year: parseInt(parts.find(p => p.type === 'year')!.value),
    month: parseInt(parts.find(p => p.type === 'month')!.value),
    day: parseInt(parts.find(p => p.type === 'day')!.value),
    hour: parseInt(parts.find(p => p.type === 'hour')!.value),
    minute: parseInt(parts.find(p => p.type === 'minute')!.value),
    second: parseInt(parts.find(p => p.type === 'second')!.value),
    // Also return formatted string for display
    formatted: now.toLocaleString("vi-VN", { timeZone: TIMEZONE }),
  };
}

// Helper to get Vietnam time as Date (for display purposes)
function getVietnamTime(): Date {
  const info = getVietnamTimeInfo();
  // Return a Date object that represents Vietnam time
  // Note: This is mainly for formatting display, not for time calculations
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
}

// Check if current time is within scan window
// Runs from 5:50 AM to 11:50 AM Vietnam time, every 30 minutes
// Times: 5:50, 6:20, 6:50, 7:20, 7:50, 8:20, 8:50, 9:20, 9:50, 10:20, 10:50, 11:20, 11:50
function isWithinScanWindow(): boolean {
  const vietnamTime = getVietnamTimeInfo();
  const hour = vietnamTime.hour;
  const minute = vietnamTime.minute;
  
  // Check if within time window (5:50 to 11:50)
  if (hour < 5 || (hour === 5 && minute < 50)) {
    return false; // Before 5:50
  }
  if (hour >= 12) {
    return false; // After 12:00
  }
  
  // Only run at specific minutes:
  // - :50 of hours 5-11
  // - :20 of hours 6-11
  if (minute === 50) {
    return hour >= 5 && hour <= 11;
  }
  if (minute === 20) {
    return hour >= 6 && hour <= 11;
  }
  
  return false;
}

// Format Vietnam time (kept for compatibility, but using getVietnamTimeInfo is preferred)
function formatVietnamTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("vi-VN", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

console.info('[Auto Scan] Edge Function initialized');
console.info(`[Auto Scan] Current time: ${new Date().toISOString()}`);

Deno.serve(async (req: Request) => {
  console.info(`[Auto Scan] Request received at ${new Date().toISOString()}`);
  try {
    // Check if within scan window
    const vietnamTimeInfo = getVietnamTimeInfo();
    const isWithinWindow = isWithinScanWindow();
    console.log(`[Auto Scan] Vietnam time: ${vietnamTimeInfo.formatted}`);
    console.log(`[Auto Scan] Hour: ${vietnamTimeInfo.hour}, Minute: ${vietnamTimeInfo.minute}, Second: ${vietnamTimeInfo.second}`);
    console.log(`[Auto Scan] Is within scan window: ${isWithinWindow}`);
    
    if (!isWithinWindow) {
      console.log(`[Auto Scan] Outside scan window, skipping scan`);
      console.log(`[Auto Scan] Current time: ${vietnamTimeInfo.hour}:${vietnamTimeInfo.minute.toString().padStart(2, '0')}:${vietnamTimeInfo.second.toString().padStart(2, '0')}`);
      console.log(`[Auto Scan] Scan window: 5:50 - 11:50 VN time, every 30 minutes (5:50, 6:20, 6:50, 7:20, 7:50, 8:20, 8:50, 9:20, 9:50, 10:20, 10:50, 11:20, 11:50)`);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Outside scan window. Current Vietnam time: ${vietnamTimeInfo.formatted}. Scan runs from 5:50 to 11:50 VN time, every 30 minutes.`,
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    console.log(`[Auto Scan] ✅ Within scan window, proceeding with scan`);

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const apiUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";
    
    console.log(`[Auto Scan] Environment check:`);
    console.log(`[Auto Scan] - SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
    console.log(`[Auto Scan] - SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`[Auto Scan] - NEXT_PUBLIC_APP_URL: ${apiUrl}`);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      const errorMsg = `Missing Supabase environment variables: SUPABASE_URL=${!!supabaseUrl}, SUPABASE_SERVICE_ROLE_KEY=${!!supabaseServiceKey}`;
      console.error(`[Auto Scan] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Create Supabase client for direct database access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the scan API endpoint to get scan results
    const scanUrl = `${apiUrl}/api/scan-rsi`;
    console.log(`[Auto Scan] Calling scan API at ${scanUrl}`);
    
    const scanResponse = await fetch(scanUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-from-edge-function": "true", // Tell API to skip saving, we'll save here
      },
    });

    const responseText = await scanResponse.text();
    console.log(`[Auto Scan] API Response Status: ${scanResponse.status}`);
    console.log(`[Auto Scan] API Response Body: ${responseText}`);

    if (!scanResponse.ok) {
      throw new Error(`Scan API failed: ${scanResponse.status} - ${responseText}`);
    }

    let scanResult;
    try {
      scanResult = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Failed to parse API response: ${responseText}`);
    }
    
    console.log(`[Auto Scan] Scan Result:`, JSON.stringify(scanResult, null, 2));
    
    // Check if scan was successful
    if (!scanResult.success) {
      console.error(`[Auto Scan] ❌ Scan failed: ${scanResult.error || 'Unknown error'}`);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Scan failed",
          error: scanResult.error,
          scanResult,
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    // Get coins data from scan result
    const coinsData = scanResult.coins_data || [];
    const scanTime = scanResult.scanTime || formatVietnamTime(Date.now());
    
    // Check if we have data to save
    if (!coinsData || coinsData.length === 0) {
      console.log(`[Auto Scan] ⚠️ No coins with RSI >= 70 found, nothing to save`);
      console.log(`[Auto Scan] Total coins scanned: ${scanResult.totalCoins || 'unknown'}`);
      console.log(`[Auto Scan] Filtered coins: ${scanResult.filteredCoins || 0}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Scan completed but no coins with RSI >= 70 found",
          totalCoins: scanResult.totalCoins,
          filteredCoins: 0,
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Save directly to database from Edge Function
    console.log(`[Auto Scan] 💾 Saving ${coinsData.length} coins directly to database...`);
    console.log(`[Auto Scan] Scan time: ${scanTime}`);
    
    // Save to database
    const { data: insertData, error: insertError } = await supabase
      .from("scan_history")
      .insert([
        {
          scan_time: scanTime,
          coins_data: coinsData,
        },
      ])
      .select();
    
    if (insertError) {
      console.error(`[Auto Scan] ❌ Error saving to database:`, insertError);
      console.error(`[Auto Scan] Error details:`, JSON.stringify(insertError, null, 2));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to save to database: ${insertError.message}`,
          insertError: insertError.message,
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
    
    console.log(`[Auto Scan] ✅ Successfully saved ${coinsData.length} coins to database`);
    console.log(`[Auto Scan] Record ID: ${insertData?.[0]?.id || 'unknown'}`);
    
    // Delete old history entries (older than 48 hours)
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    const { error: deleteError } = await supabase
      .from("scan_history")
      .delete()
      .lt("created_at", fortyEightHoursAgo.toISOString());
    
    if (deleteError) {
      console.warn(`[Auto Scan] ⚠️ Error deleting old history:`, deleteError);
    } else {
      console.log(`[Auto Scan] ✅ Cleaned up old history entries`);
    }
    
    const endVietnamTimeInfo = getVietnamTimeInfo();
    console.log(`[Auto Scan] Completed at ${endVietnamTimeInfo.formatted}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "RSI scan completed",
        scanResult,
        vietnamTime: endVietnamTimeInfo.formatted,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[Auto Scan] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});



