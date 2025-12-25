export interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteVolume: string;
  trades: number;
  takerBuyBaseVolume: string;
  takerBuyQuoteVolume: string;
}

export interface CoinRSI {
  symbol: string;
  rsi: number;
  price: number;
  change24h: number;
  markPrice?: number;
  indexPrice?: number;
  fundingRate?: number;
  nextFundingTime?: number;
}

/**
 * Calculate RSI (Relative Strength Index) using Wilder's method
 * @param closes Array of closing prices
 * @param period RSI period (default: 14)
 * @returns RSI value or null if insufficient data
 */
export function calculateRSI(closes: number[], period: number = 14): number | null {
  if (!Array.isArray(closes) || closes.length < period + 1) {
    return null;
  }

  // Price changes
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // Initial avg gain/loss
  let gainSum = 0;
  let lossSum = 0;

  for (let i = 0; i < period; i++) {
    const c = changes[i];
    if (c >= 0) gainSum += c;
    else lossSum += Math.abs(c);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  // Wilder smoothing
  for (let i = period; i < changes.length; i++) {
    const c = changes[i];
    const gain = c > 0 ? c : 0;
    const loss = c < 0 ? Math.abs(c) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return Math.round(rsi * 100) / 100; // 2 decimals
}

/**
 * Fetch klines (candlestick data) from Binance Futures API
 */
export async function fetchKlines(
  symbol: string,
  interval: string = "30m",
  limit: number = 200
): Promise<BinanceKline[]> {
  try {
    // Add timestamp to URL to ensure fresh data
    const timestamp = Date.now();
    const response = await fetch(
      `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}&_t=${timestamp}`,
      {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch klines for ${symbol}`);
    }

    const data = await response.json();
    console.log(`[Klines ${symbol}] Fetched ${data.length} klines at ${new Date().toISOString()}`);
    return data.map((kline: any[]) => ({
      openTime: kline[0],
      open: kline[1],
      high: kline[2],
      low: kline[3],
      close: kline[4],
      volume: kline[5],
      closeTime: kline[6],
      quoteVolume: kline[7],
      trades: kline[8],
      takerBuyBaseVolume: kline[9],
      takerBuyQuoteVolume: kline[10],
    }));
  } catch (error) {
    console.error(`Error fetching klines for ${symbol}:`, error);
    return [];
  }
}

/**
 * Fetch all USDT perpetual futures trading pairs from Binance
 */
export async function fetchUSDTFuturesPairs(): Promise<string[]> {
  try {
    const timestamp = Date.now();
    const response = await fetch(
      `https://fapi.binance.com/fapi/v1/exchangeInfo?_t=${timestamp}`,
      {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch exchange info");
    }

    const data = await response.json();
    const usdtPairs = data.symbols
      .filter(
        (symbol: any) =>
          symbol.status === "TRADING" &&
          symbol.contractType === "PERPETUAL" &&
          symbol.quoteAsset === "USDT"
      )
      .map((symbol: any) => symbol.symbol);

    return usdtPairs;
  } catch (error) {
    console.error("Error fetching USDT futures pairs:", error);
    return [];
  }
}

/**
 * Fetch 24h ticker price change statistics from Binance Futures
 * @param includeMarkPrice - If true, also fetch markPrice and indexPrice from premiumIndex
 */
export async function fetch24hTicker(symbol: string, includeMarkPrice: boolean = false): Promise<{
  price: number;
  change24h: number;
  markPrice?: number;
  indexPrice?: number;
}> {
  const startTime = Date.now();
  try {
    // Add timestamp to URL to ensure fresh data
    const timestamp = Date.now();
    
    // Fetch ticker/24hr for lastPrice and change24h (always needed)
    const tickerResponse = await fetch(
      `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}&_t=${timestamp}`,
      { 
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );

    if (!tickerResponse.ok) {
      throw new Error(`Failed to fetch ticker for ${symbol}`);
    }

    const tickerData = await tickerResponse.json();
    
    // Use lastPrice from ticker/24hr (same as Binance website displays)
    // This is the last traded price, which is what users see on Binance
    const price = parseFloat(tickerData.lastPrice);
    const change24h = parseFloat(tickerData.priceChangePercent);
    
    // Only fetch premiumIndex if markPrice/indexPrice are needed (for BTC)
    let premiumIndexData = null;
    if (includeMarkPrice) {
      const premiumIndexResponse = await fetch(
        `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}&_t=${timestamp}`,
        { 
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        }
      );
      
      if (premiumIndexResponse.ok) {
        premiumIndexData = await premiumIndexResponse.json();
      }
      
      // Log all price types for comparison (only when needed)
      const fetchDuration = Date.now() - startTime;
      const fetchTime = new Date().toISOString();
      console.log(`[Ticker ${symbol}] Fetched at ${fetchTime} (took ${fetchDuration}ms)`);
      console.log(`[Ticker ${symbol}] Price types comparison:`);
      console.log(`  - lastPrice (from 24hr): ${tickerData.lastPrice} <- Using this (same as Binance website)`);
      console.log(`  - markPrice (from premiumIndex): ${premiumIndexData?.markPrice || 'N/A'}`);
      console.log(`  - indexPrice (from premiumIndex): ${premiumIndexData?.indexPrice || 'N/A'}`);
      console.log(`  - Final price: ${price}, change24h: ${change24h}%`);
    }
    
    return {
      price,
      change24h,
      markPrice: premiumIndexData?.markPrice ? parseFloat(premiumIndexData.markPrice) : undefined,
      indexPrice: premiumIndexData?.indexPrice ? parseFloat(premiumIndexData.indexPrice) : undefined,
    };
  } catch (error) {
    const fetchDuration = Date.now() - startTime;
    console.error(`[Ticker ${symbol}] Error after ${fetchDuration}ms:`, error);
    return { price: 0, change24h: 0 };
  }
}

/**
 * Fetch current price with markPrice and indexPrice for BTC
 * This is a convenience wrapper around fetch24hTicker with includeMarkPrice=true
 */
export async function fetchCurrentPriceWithMarkPrice(symbol: string): Promise<{
  price: number;
  change24h: number;
  markPrice?: number;
  indexPrice?: number;
}> {
  return fetch24hTicker(symbol, true);
}

/**
 * Fetch funding rate from premiumIndex API
 * Returns lastFundingRate and nextFundingTime
 */
export async function fetchFundingRate(symbol: string): Promise<{
  fundingRate: number;
  nextFundingTime: number;
} | null> {
  try {
    const timestamp = Date.now();
    const response = await fetch(
      `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}&_t=${timestamp}`,
      {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch funding rate for ${symbol}`);
    }

    const data = await response.json();
    
    return {
      fundingRate: parseFloat(data.lastFundingRate || "0"),
      nextFundingTime: data.nextFundingTime || 0,
    };
  } catch (error) {
    console.error(`Error fetching funding rate for ${symbol}:`, error);
    return null;
  }
}

