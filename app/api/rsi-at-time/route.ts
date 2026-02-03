import { NextRequest, NextResponse } from "next/server";
import { getRSIAtTime } from "@/app/actions/binance";

/**
 * GET /api/rsi-at-time?symbol=BTCUSDT&atTime=1738281600000
 * hoặc atTime=2025-01-31T00:00:00.000Z (ISO string)
 * Trả về RSI tại mốc thời gian đã chỉ định cho một coin.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.trim();
    const atTimeParam = searchParams.get("atTime")?.trim();

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: "Thiếu tham số symbol" },
        { status: 400 }
      );
    }
    if (!atTimeParam) {
      return NextResponse.json(
        { success: false, error: "Thiếu tham số atTime (ms hoặc ISO date)" },
        { status: 400 }
      );
    }

    const atTime = /^\d+$/.test(atTimeParam)
      ? parseInt(atTimeParam, 10)
      : atTimeParam;
    const result = await getRSIAtTime(symbol, atTime as number | string);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API rsi-at-time] Error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi server" },
      { status: 500 }
    );
  }
}
