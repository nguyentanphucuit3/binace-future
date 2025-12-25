import { NextResponse } from "next/server";
import { scanRSI } from "@/app/actions/binance";
import { saveScanHistory, deleteOldHistory } from "@/app/actions/history";

const TIMEZONE = "Asia/Ho_Chi_Minh";

const formatVietnamTime = (timestamp: number): string => {
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
};

export async function POST(request?: Request) {
  try {
    // Check if called from Edge Function (skip saving, Edge Function will save)
    const skipSave = request?.headers.get("x-skip-save") === "true" || 
                     request?.headers.get("x-from-edge-function") === "true";
    
    if (skipSave) {
      console.log("[API] Called from Edge Function - will skip saving, only return data");
    }

    console.log("[API] Starting RSI scan...");
    
    // Perform RSI scan
    const result = await scanRSI();
    
    if (!result.coins || result.coins.length === 0) {
      return NextResponse.json(
        { success: false, error: "No coins found" },
        { status: 400 }
      );
    }

    // Filter coins with RSI >= 70
    const filtered = result.coins.filter((coin) => coin.rsi >= 70 && coin.rsi <= 100);
    
    console.log(`[API] Total coins scanned: ${result.coins.length}, Coins with RSI >= 70: ${filtered.length}`);
    
    if (filtered.length === 0) {
      console.log("[API] ⚠️ No coins with RSI >= 70 found, skipping save to history");
      console.log(`[API] Total coins scanned: ${result.coins.length}`);
      return NextResponse.json(
        { 
          success: true, 
          message: "No coins with RSI >= 70 found", 
          totalCoins: result.coins.length, 
          filteredCoins: 0,
          scanTime: formatVietnamTime(Date.now()),
        },
        { status: 200 }
      );
    }

    // Prepare data to save
    const scanTime = formatVietnamTime(Date.now());
    const coinsToSave = filtered.map((coin) => ({
      symbol: coin.symbol,
      rsi: coin.rsi,
      price: coin.price,
      fundingRate: coin.fundingRate,
    }));

    // If called from Edge Function, skip saving (Edge Function will save directly)
    if (!skipSave) {
      // Save to history
      console.log(`[API] Saving ${coinsToSave.length} coins to history...`);
      console.log(`[API] Service Role Key available: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
      
      const saveResult = await saveScanHistory({
        scan_time: scanTime,
        coins_data: coinsToSave,
      });

      if (!saveResult.success) {
        console.error("[API] Failed to save scan history:", saveResult.error);
        console.error("[API] Full save result:", JSON.stringify(saveResult, null, 2));
        
        // Still return success but log the error
        // This allows the scan to complete even if save fails
        return NextResponse.json(
          {
            success: false,
            error: `Failed to save scan history: ${saveResult.error}`,
            totalCoins: result.coins.length,
            filteredCoins: filtered.length,
            scanTime,
            saveError: saveResult.error,
            coins_data: coinsToSave, // Include data so Edge Function can save
          },
          { status: 500 }
        );
      }

      console.log("[API] Successfully saved scan history");

      // Delete old history entries (older than 48 hours)
      await deleteOldHistory();
    } else {
      console.log(`[API] Skipping save (will be saved by Edge Function)`);
    }

    return NextResponse.json({
      success: true,
      message: skipSave ? "RSI scan completed (data only, not saved)" : "RSI scan completed and saved",
      totalCoins: result.coins.length,
      filteredCoins: filtered.length,
      scanTime,
      coins_data: coinsToSave, // Always include data in response
    });
  } catch (error) {
    console.error("Error in scan-rsi API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

