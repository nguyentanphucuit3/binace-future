import { NextResponse } from "next/server";
import { fetchKlines, calculateRSI, fetch24hTicker, fetchFundingRate } from "@/lib/binance";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BUSDT";
    
    console.log(`[Test RSI] Testing RSI for ${symbol}...`);
    
    const now = Date.now();
    
    // Fetch current price
    const ticker = await fetch24hTicker(symbol);
    const currentPrice = ticker.price;
    
    // Fetch funding rate
    const fundingData = await fetchFundingRate(symbol);
    
    // Fetch 200 nến 30m đã đóng (cần 201 để có 200 đã đóng + 1 đang mở)
    const klines30m = await fetchKlines(symbol, "30m", 201);
    
    if (klines30m.length < 200) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient klines: ${klines30m.length} (need at least 200)`,
          symbol,
        },
        { status: 400 }
      );
    }
    
    // Filter only completed 30m candles
    const completed30mKlines = klines30m.filter((k) => k.closeTime < now);
    
    if (completed30mKlines.length < 200) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient completed klines: ${completed30mKlines.length} (need at least 200)`,
          symbol,
          totalKlines: klines30m.length,
          completedKlines: completed30mKlines.length,
        },
        { status: 400 }
      );
    }
    
    // Take last 200 completed 30m nến
    const last20030mKlines = completed30mKlines.slice(-200);
    const closes30m = last20030mKlines.map((k) => parseFloat(k.close));
    
    // Combine: 200 closes from 30m + 1 close (realtime) = 201 closes
    const allCloses = [...closes30m, currentPrice];
    
    if (allCloses.length !== 201) {
      return NextResponse.json(
        {
          success: false,
          error: `Total closes count mismatch: ${allCloses.length} (expected: 201)`,
          symbol,
        },
        { status: 400 }
      );
    }
    
    // Calculate RSI(14) from combined 201 closes (200 closes from 30m + 1 close realtime)
    const rsi = calculateRSI(allCloses, 14);
    
    if (!rsi) {
      return NextResponse.json(
        {
          success: false,
          error: "RSI calculation returned null",
          symbol,
        },
        { status: 400 }
      );
    }
    
    // Get the last completed 30m candle for data time
    const lastCompleted30mKline = last20030mKlines[last20030mKlines.length - 1];
    
    return NextResponse.json({
      success: true,
      symbol,
      rsi: rsi,
      price: ticker.price,
      change24h: ticker.change24h,
      fundingRate: fundingData?.fundingRate,
      nextFundingTime: fundingData?.nextFundingTime,
      dataInfo: {
        totalKlines: klines30m.length,
        completedKlines: completed30mKlines.length,
        usedKlines: last20030mKlines.length,
        closesCount: allCloses.length,
        lastCompletedKlineTime: {
          openTime: lastCompleted30mKline.openTime,
          closeTime: lastCompleted30mKline.closeTime,
          openTimeISO: new Date(lastCompleted30mKline.openTime).toISOString(),
          closeTimeISO: new Date(lastCompleted30mKline.closeTime).toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("❌ Error testing RSI:", error);
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
