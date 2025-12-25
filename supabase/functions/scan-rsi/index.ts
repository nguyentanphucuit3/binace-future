// Supabase Edge Function to auto scan RSI every 5 minutes
// Runs 24/7 at :00, :05, :10, :15, :20, :25, :30, :35, :40, :45, :50, :55 minutes (at :05 seconds)

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

// Check if current time is on a 5-minute interval
// No time window restriction - runs 24/7
function isWithinScanWindow(): boolean {
  const vietnamTime = getVietnamTimeInfo();
  const minute = vietnamTime.minute;
  
  // Only run at :00, :05, :10, :15, :20, :25, :30, :35, :40, :45, :50, :55 minutes
  const isOn5MinuteInterval = minute % 5 === 0;
  
  return isOn5MinuteInterval;
}

// Wait until :05 seconds
async function waitUntil5Seconds(): Promise<void> {
  const vietnamTime = getVietnamTimeInfo();
  const seconds = vietnamTime.second;
  
  if (seconds < 5) {
    const waitMs = (5 - seconds) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitMs));
  } else if (seconds > 5) {
    // If we're past :05, wait until next :05 (next minute)
    const waitMs = (60 - seconds + 5) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
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
      console.log(`[Auto Scan] Will run at next 5-minute interval (:00, :05, :10, :15, :20, :25, :30, :35, :40, :45, :50, :55)`);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Not on 5-minute interval. Current Vietnam time: ${vietnamTimeInfo.formatted}. Scan only runs at :00, :05, :10, :15, :20, :25, :30, :35, :40, :45, :50, :55 minutes.`,
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    console.log(`[Auto Scan] ✅ Within scan window, proceeding with scan`);
    
    // If we're in the right minute but not at :05 seconds yet, wait
    if (vietnamTimeInfo.second < 5) {
      console.log(`[Auto Scan] Waiting until :05 seconds (current: ${vietnamTimeInfo.second})`);
      await waitUntil5Seconds();
    } else if (vietnamTimeInfo.second > 5) {
      // If we're past :05, we're too late for this interval
      // But since cron runs every 5 minutes, we should still proceed
      console.log(`[Auto Scan] Past :05 seconds (current: ${vietnamTimeInfo.second}), but proceeding anyway`);
    } else {
      console.log(`[Auto Scan] Already at :05 seconds, proceeding immediately`);
    }

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



