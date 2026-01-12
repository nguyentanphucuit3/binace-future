import { NextResponse } from "next/server";
import { scanRSI } from "@/app/actions/binance";

export async function GET() {
  try {
    console.log("[Test Scan] Starting RSI scan to check BUSDT...");
    
    // First check if we can fetch pairs
    const { fetchUSDTFuturesPairs } = await import("@/lib/binance");
    console.log("[Test Scan] Checking fetchUSDTFuturesPairs...");
    const pairs = await fetchUSDTFuturesPairs();
    console.log(`[Test Scan] fetchUSDTFuturesPairs returned ${pairs.length} pairs`);
    
    const startTime = Date.now();
    const result = await scanRSI();
    const scanDuration = Date.now() - startTime;
    
    console.log(`[Test Scan] Total coins scanned: ${result.coins.length}`);
    console.log(`[Test Scan] Scan duration: ${scanDuration}ms`);
    
    // Find BUSDT in results
    const busdt = result.coins.find((coin) => coin.symbol === "BUSDT");
    
    // Filter coins with RSI >= 70
    const coinsWithRSI70 = result.coins.filter((coin) => coin.rsi >= 70 && coin.rsi <= 100);
    
    // Check if BUSDT is in the filtered list
    const busdtInFiltered = coinsWithRSI70.find((coin) => coin.symbol === "BUSDT");
    
    // Get top 10 coins with RSI >= 70 (already sorted by RSI descending)
    const top10Coins = coinsWithRSI70.slice(0, 10).map((coin) => ({
      symbol: coin.symbol,
      rsi: coin.rsi,
      price: coin.price,
    }));
    
    return NextResponse.json({
      success: true,
      totalCoinsScanned: result.coins.length,
      coinsWithRSI70: coinsWithRSI70.length,
      scanDurationMs: scanDuration,
      pairsCount: pairs.length,
      pairsCheck: pairs.length > 0 ? "✅ Pairs fetched successfully" : "❌ No pairs fetched (IP may be banned)",
      busdt: busdt
        ? {
            symbol: busdt.symbol,
            rsi: busdt.rsi,
            price: busdt.price,
            change24h: busdt.change24h,
            fundingRate: busdt.fundingRate,
            inFiltered: !!busdtInFiltered,
          }
        : null,
      busdtInResults: !!busdt,
      busdtInFilteredList: !!busdtInFiltered,
      message: busdt
        ? busdt.rsi >= 70
          ? `✅ BUSDT found with RSI ${busdt.rsi} >= 70, should be saved to history`
          : `⚠️ BUSDT found with RSI ${busdt.rsi} < 70, will NOT be saved to history`
        : "❌ BUSDT not found in scan results",
      top10Coins: top10Coins,
      // Show first 5 coins regardless of RSI for debugging
      first5Coins: result.coins.slice(0, 5).map((coin) => ({
        symbol: coin.symbol,
        rsi: coin.rsi,
      })),
    });
  } catch (error) {
    console.error("[Test Scan] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
