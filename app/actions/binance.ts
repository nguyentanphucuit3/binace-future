"use server";

import {
  fetchUSDTFuturesPairs,
  fetchKlines,
  calculateRSI,
  calculateRSIAtTime,
  fetch24hTicker,
  fetchCurrentPriceWithMarkPrice,
  fetchFundingRate,
  getPriceDifferenceAfter30mKline,
  checkShortSignal,
  type CoinRSI,
  type RSIAtTimeResult,
} from "@/lib/binance";
import { checkAndSendAlertEmail } from "@/lib/email-alert";

/**
 * Server Action to scan RSI for all USDT perpetual futures pairs
 */
export async function scanRSI(): Promise<{
  coins: CoinRSI[];
  dataTime: { openTime: number; closeTime: number } | null;
  klinesData: Record<string, import("@/lib/binance").BinanceKline[]>;
}> {
  try {
    // Fetch all USDT perpetual futures pairs
    const pairs = await fetchUSDTFuturesPairs();
    console.log(`Found ${pairs.length} USDT perpetual futures pairs`);

    // Process pairs in batches to avoid rate limiting
    const batchSize = 10;
    const results: CoinRSI[] = [];
    const klinesData: Record<string, import("@/lib/binance").BinanceKline[]> = {};
    let dataTime: { openTime: number; closeTime: number } | null = null;

    const now = Date.now();

    for (let i = 0; i < pairs.length; i += batchSize) {
      const batch = pairs.slice(i, i + batchSize);
      const batchPromises = batch.map(async (symbol) => {
        try {
          // ===== Logic: Lấy 200 nến 30m đã đóng + 1 giá realtime =====
          // - 200 nến 30m từ các nến 30m đã đóng trước đó
          // - 1 giá realtime (current price)
          // - Tính RSI từ: 200 closes (30m) + 1 close (realtime) = 201 closes
          
          // Fetch ticker để lấy current price (realtime)
          const ticker = await fetch24hTicker(symbol);
          const currentPrice = ticker.price;
          
          // Fetch funding rate
          const fundingData = await fetchFundingRate(symbol);
          
          // Fetch 200 nến 30m đã đóng
          const klines30m = await fetchKlines(symbol, "30m", 201);
          if (klines30m.length < 200) {
            return null;
          }
          
          // Filter only completed 30m candles
          const completed30mKlines = klines30m.filter((k) => k.closeTime < now);
          if (completed30mKlines.length < 200) {
            return null;
          }
          
          // Take last 200 completed 30m nến
          const last20030mKlines = completed30mKlines.slice(-200);
          const closes30m = last20030mKlines.map((k) => parseFloat(k.close));
          
          // Combine: 200 closes from 30m + 1 close (realtime) = 201 closes
          const allCloses = [...closes30m, currentPrice];
          
          if (allCloses.length !== 201) {
            console.warn(`[RSI Scan ${symbol}] Total closes count mismatch: ${allCloses.length}, expected: 201`);
            return null;
          }
          
          // Use last20030mKlines for dataTime calculation
          const last200CompletedKlines = last20030mKlines;

          // Store data time from first coin (all coins use same klines structure)
          if (!dataTime && last200CompletedKlines.length > 0) {
            const firstKline = last200CompletedKlines[0];
            
            dataTime = {
              // Use openTime of first 30m candle (start of data range)
              openTime: firstKline.openTime,
              // Use current time as closeTime since we include ongoing 1m candle
              closeTime: now,
            };
            console.log(`[RSI Data Time] First 30m kline: ${new Date(firstKline.openTime).toISOString()} - ${new Date(firstKline.closeTime).toISOString()}`);
            console.log(`[RSI Data Time] Now: ${new Date(now).toISOString()}`);
          }

          // Calculate RSI(14) from combined 201 closes (200 closes from 30m + 1 close realtime)
          const rsi = calculateRSI(allCloses, 14);

          // Skip if RSI calculation failed
          if (!rsi) {
            return null;
          }

          // Store klines data for this symbol - store 200 nến 30m
          klinesData[symbol] = last20030mKlines;

          // Calculate price difference (currentPrice - first1mPrice after latest 30m)
          // Pass currentPrice and completed30mKlines to avoid re-fetching
          let priceDifference: number | undefined = undefined;
          try {
            const diff = await getPriceDifferenceAfter30mKline(symbol, currentPrice, completed30mKlines);
            if (diff !== null) {
              priceDifference = diff;
            }
          } catch (error) {
            console.warn(`[RSI Scan ${symbol}] Failed to get price difference:`, error);
            // Continue without price difference if it fails
          }

          // Check SHORT signal
          // Pass klines30m, currentPrice, and completed30mKlines to avoid re-fetching
          let isShortSignal: boolean | undefined = undefined;
          try {
            const shortSignalResult = await checkShortSignal(symbol, klines30m, currentPrice, completed30mKlines);
            if (shortSignalResult) {
              isShortSignal = shortSignalResult.isShortSignal;
            }
          } catch (error) {
            console.warn(`[RSI Scan ${symbol}] Failed to check short signal:`, error);
            // Continue without short signal if it fails
          }

          // Giá (2): tại 7 mốc 30m gần nhất (nến 193..199), nếu có RSI 45-55 thì lấy giá đóng cửa tại mốc đó
          let price2: number | undefined = undefined;
          const last7StartIndex = Math.max(0, last20030mKlines.length - 7);
          for (let i = last20030mKlines.length - 1; i >= last7StartIndex && i >= 14; i--) {
            const closesUpToI = closes30m.slice(0, i + 1);
            const rsiAtI = calculateRSI(closesUpToI, 14);
            if (rsiAtI !== null && rsiAtI >= 45 && rsiAtI <= 55) {
              price2 = parseFloat(last20030mKlines[i].close);
              break;
            }
          }

          // Giá (3): giá trị tuyệt đối chữ số sau số thập phân của (price2 - price), vd 0,005578 → 5578
          let price3: number | undefined = undefined;
          if (price2 !== undefined) {
            const diff = Math.abs(price2 - ticker.price);
            const afterDot = (diff.toFixed(8).split('.')[1] || '').replace(/0+$/, '');
            price3 = afterDot === '' ? 0 : parseInt(afterDot, 10);
          }

          const coin: CoinRSI = {
            symbol,
            rsi,
            price: ticker.price,
            change24h: ticker.change24h,
            fundingRate: fundingData?.fundingRate,
            nextFundingTime: fundingData?.nextFundingTime,
            priceDifference,
            isShortSignal,
            price2,
            price3,
            // Don't include markPrice/indexPrice for RSI scan (only for BTC)
          };
          
          return coin;
        } catch (error) {
          console.error(`Error processing ${symbol}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((r): r is CoinRSI => r !== null));
    }

    // Sort by RSI descending
    const sortedCoins = results.sort((a, b) => b.rsi - a.rsi);

    // Check for alerts and send email notification (async, don't wait)
    // Only send email if we have coins
    if (sortedCoins.length > 0) {
      checkAndSendAlertEmail(sortedCoins).catch((error) => {
        // Log error but don't fail the scan
        console.error("[scanRSI] Error sending alert email:", error);
      });
    }

    return {
      coins: sortedCoins,
      dataTime,
      klinesData,
    };
  } catch (error) {
    console.error("Error scanning RSI:", error);
    return { coins: [], dataTime: null, klinesData: {} };
  }
}

/**
 * Server Action to fetch BTC RSI and ticker data
 * Returns coin data and the closeTime of the last kline
 */
export async function scanBTCRSI(): Promise<{ coin: CoinRSI; dataTime: { openTime: number; closeTime: number } } | null> {
  try {
    const symbol = "BTCUSDT";
    console.log(`[RSI BTC] Fetching klines for ${symbol}...`);
    
    // Fetch current price with markPrice/indexPrice for BTC
    const ticker = await fetchCurrentPriceWithMarkPrice(symbol);
    const currentPrice = ticker.price;
    
    const now = Date.now();
    
    // ===== Logic: Lấy 200 nến 30m đã đóng + 1 giá realtime =====
    // - 200 nến 30m từ các nến 30m đã đóng trước đó
    // - 1 giá realtime (current price)
    // - Tính RSI từ: 200 closes (30m) + 1 close (realtime) = 201 closes
    
    // Fetch 200 nến 30m đã đóng
    const klines30m = await fetchKlines(symbol, "30m", 201);
    
    if (klines30m.length < 200) {
      console.warn(`[RSI BTC] Insufficient 30m klines: ${klines30m.length}`);
      return null;
    }
    
    // Filter only completed 30m candles
    const completed30mKlines = klines30m.filter((k) => k.closeTime < now);
    
    if (completed30mKlines.length < 200) {
      console.warn(`[RSI BTC] Insufficient completed 30m klines: ${completed30mKlines.length}`);
      return null;
    }
    
    // Take last 200 completed 30m nến
    const last20030mKlines = completed30mKlines.slice(-200);
    const closes30m = last20030mKlines.map((k) => parseFloat(k.close));
    
    // Combine: 200 closes from 30m + 1 close (realtime) = 201 closes
    const allCloses = [...closes30m, currentPrice];
    
    if (allCloses.length !== 201) {
      console.warn(`[RSI BTC] Total closes count mismatch: ${allCloses.length}, expected: 201`);
      return null;
    }
    
    // Calculate RSI 14 from combined 201 closes (200 closes from 30m + 1 close realtime)
    const rsi = calculateRSI(allCloses, 14);
    
    if (!rsi) {
      console.warn("[RSI BTC] RSI calculation returned null");
      return null;
    }
    
    // Get the last completed 30m candle for dataTime
    const lastCompleted30mKline = last20030mKlines[last20030mKlines.length - 1];
    
    // Calculate data time range
    const dataTime = {
      openTime: lastCompleted30mKline.openTime, // Start of last completed 30m candle
      closeTime: now, // Current time (for 1m data)
    };
    
    // Fetch funding rate for BTC
    const fundingData = await fetchFundingRate(symbol);
    
    const btcCoin: CoinRSI = {
      symbol,
      rsi: rsi,
      price: ticker.price,
      change24h: ticker.change24h,
      markPrice: ticker.markPrice,
      indexPrice: ticker.indexPrice,
      fundingRate: fundingData?.fundingRate,
      nextFundingTime: fundingData?.nextFundingTime,
    };

    console.log(`[RSI BTC] RSI: ${rsi}`);
    return { coin: btcCoin, dataTime };
  } catch (error) {
    console.error("[RSI BTC] Error scanning BTC RSI:", error);
    return null;
  }
}

/**
 * Server Action to scan Funding Rate for all USDT perpetual futures pairs
 * Only fetches funding rate, price, and 24h change (no RSI calculation)
 */
export async function scanFunding(): Promise<{
  coins: CoinRSI[];
}> {
  try {
    // Fetch all USDT perpetual futures pairs
    const pairs = await fetchUSDTFuturesPairs();
    console.log(`[Funding Scan] Found ${pairs.length} USDT perpetual futures pairs`);

    // Process pairs in batches to avoid rate limiting
    const batchSize = 10;
    const results: CoinRSI[] = [];

    for (let i = 0; i < pairs.length; i += batchSize) {
      const batch = pairs.slice(i, i + batchSize);
      const batchPromises = batch.map(async (symbol) => {
        try {
          // Fetch ticker để lấy current price và change24h
          const ticker = await fetch24hTicker(symbol);
          
          // Fetch funding rate
          const fundingData = await fetchFundingRate(symbol);
          
          // Skip if funding rate is not available
          if (!fundingData || fundingData.fundingRate === undefined) {
            return null;
          }

          const coin: CoinRSI = {
            symbol,
            rsi: 0, // Not calculated for funding scan
            price: ticker.price,
            change24h: ticker.change24h,
            fundingRate: fundingData.fundingRate,
            nextFundingTime: fundingData.nextFundingTime,
          };
          
          return coin;
        } catch (error) {
          console.error(`[Funding Scan] Error processing ${symbol}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((r): r is CoinRSI => r !== null));
    }

    // Sort by funding rate descending (highest first)
    return {
      coins: results.sort((a, b) => (b.fundingRate ?? 0) - (a.fundingRate ?? 0)),
    };
  } catch (error) {
    console.error("[Funding Scan] Error scanning funding rates:", error);
    return { coins: [] };
  }
}

/**
 * Server Action: Tính RSI tại một mốc thời gian cho một coin.
 * @param symbol Cặp (vd: "BTCUSDT")
 * @param atTime Unix timestamp (ms) hoặc chuỗi ISO date
 */
export async function getRSIAtTime(
  symbol: string,
  atTime: number | string
): Promise<{ success: boolean; data: RSIAtTimeResult | null; error?: string }> {
  try {
    const ts = typeof atTime === "string" ? new Date(atTime).getTime() : atTime;
    if (Number.isNaN(ts) || ts <= 0) {
      return { success: false, data: null, error: "Mốc thời gian không hợp lệ" };
    }
    const data = await calculateRSIAtTime(symbol.toUpperCase(), ts);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi tính RSI theo thời gian";
    return { success: false, data: null, error: message };
  }
}