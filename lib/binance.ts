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
  priceDifference?: number; // Hiệu số phần trăm: (($price - first1mPrice) / first1mPrice) * 100
  isShortSignal?: boolean; // Tín hiệu SHORT từ checkShortSignal (nến đỏ + đã vượt band + giá dưới band)
  /** Giá (2): giá tại một trong 7 nến 30m gần nhất mà RSI nằm trong 45-55 (nếu có) */
  price2?: number;
  /** Giá (3): chữ số sau dấu thập phân của |price2 - price| (vd: 0,005578 → 5578), chỉ khi có price2 */
  price3?: number;
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
 * Calculate Simple Moving Average (SMA)
 * @param values Array of values
 * @param period Period for SMA calculation
 * @returns SMA value or null if insufficient data
 */
export function calculateSMA(values: number[], period: number): number | null {
  if (!Array.isArray(values) || values.length < period) {
    return null;
  }
  
  const slice = values.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return sum / period;
}

/**
 * Calculate Standard Deviation
 * @param values Array of values
 * @param period Period for calculation
 * @param sma Optional pre-calculated SMA value
 * @returns Standard deviation or null if insufficient data
 */
export function calculateStandardDeviation(values: number[], period: number, sma?: number): number | null {
  if (!Array.isArray(values) || values.length < period) {
    return null;
  }
  
  const calculatedSMA = sma !== undefined ? sma : calculateSMA(values, period);
  if (calculatedSMA === null) {
    return null;
  }
  
  const slice = values.slice(-period);
  const variance = slice.reduce((acc, val) => {
    const diff = val - calculatedSMA;
    return acc + diff * diff;
  }, 0) / period;
  
  return Math.sqrt(variance);
}

/**
 * Calculate Bollinger Bands
 * @param closes Array of closing prices
 * @param period Period for SMA calculation (default: 20)
 * @param multiplier Standard deviation multiplier (default: 2)
 * @returns Object with upper, middle, and lower bands, or null if insufficient data
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  multiplier: number = 2
): { upper: number; middle: number; lower: number } | null {
  if (!Array.isArray(closes) || closes.length < period) {
    return null;
  }
  
  const middle = calculateSMA(closes, period);
  if (middle === null) {
    return null;
  }
  
  const stdDev = calculateStandardDeviation(closes, period, middle);
  if (stdDev === null) {
    return null;
  }
  
  return {
    upper: middle + (stdDev * multiplier),
    middle: middle,
    lower: middle - (stdDev * multiplier),
  };
}

/**
 * Get current M30 candle data and current price
 * Helper function to fetch current forming M30 candle and realtime price
 */
async function getCurrentM30CandleAndPrice(
  symbol: string,
  klines30m?: BinanceKline[],
  currentPrice?: number
): Promise<{
  currentCandle: BinanceKline;
  currentPrice: number;
} | null> {
  try {
    // Get current M30 candle (the one currently forming)
    let currentCandle: BinanceKline;
    if (klines30m && klines30m.length > 0) {
      // Use provided klines (take last one as current candle)
      currentCandle = klines30m[klines30m.length - 1];
    } else {
      // Fallback: fetch if not provided
      const fetched = await fetchKlines(symbol, "30m", 2);
      if (fetched.length === 0) {
        console.error(`[Current M30 ${symbol}] No 30m klines returned`);
        return null;
      }
      currentCandle = fetched[fetched.length - 1];
    }
    
    // Get Current_Price (realtime)
    const price = currentPrice ?? (await fetch24hTicker(symbol)).price;
    
    return {
      currentCandle,
      currentPrice: price,
    };
  } catch (error) {
    console.error(`[Current M30 ${symbol}] Error:`, error);
    return null;
  }
}

/**
 * Check SHORT signal condition for current M30 candle
 * Kiểm tra điều kiện kích hoạt lệnh SHORT cho nến M30 hiện tại
 * 
 * Điều kiện:
 * 1. Current_Price < Open_Price (nến đỏ)
 * 2. High_Price > Upper_Band_Value (đã từng vượt band)
 * 3. Current_Price < Upper_Band_Value (giá hiện tại nằm dưới band)
 * 
 * @param symbol Trading pair symbol (e.g., "BTCUSDT")
 * @returns Object with signal status and details, or null if error
 */
export async function checkShortSignal(
  symbol: string,
  klines30m?: BinanceKline[],
  currentPrice?: number,
  completed30mKlines?: BinanceKline[]
): Promise<{
  isShortSignal: boolean;
  openPrice: number;
  currentPrice: number;
  highPrice: number;
  upperBandValue: number;
  middleBand: number;
  lowerBand: number;
  currentCandleTime: number;
} | null> {
  try {
    const now = Date.now();
    
    // Get current M30 candle and current price using helper function
    const candleData = await getCurrentM30CandleAndPrice(symbol, klines30m, currentPrice);
    if (!candleData) {
      return null;
    }
    
    const { currentCandle, currentPrice: price } = candleData;
    
    // Get Open_Price, High_Price from current candle
    const openPrice = parseFloat(currentCandle.open);
    const highPrice = parseFloat(currentCandle.high);
    
    // Calculate Bollinger Bands
    // Need at least 20 completed candles + current candle for calculation
    let klinesForBB: BinanceKline[];
    if (klines30m && klines30m.length >= 21) {
      // Use provided klines
      klinesForBB = klines30m;
    } else {
      // Fallback: fetch if not provided
      klinesForBB = await fetchKlines(symbol, "30m", 21);
      if (klinesForBB.length < 21) {
        console.error(`[Short Signal ${symbol}] Insufficient klines for Bollinger Band calculation`);
        return null;
      }
    }
    
    // Use closes from last 20 completed candles + current price for BB calculation
    const completedKlines = klinesForBB.filter((k) => k.closeTime < now);
    const closesForBB = completedKlines.slice(-20).map((k) => parseFloat(k.close));
    
    // Add current price to closes array for BB calculation
    const allClosesForBB = [...closesForBB, price];
    
    const bollingerBands = calculateBollingerBands(allClosesForBB, 20, 2);
    
    if (!bollingerBands) {
      console.error(`[Short Signal ${symbol}] Failed to calculate Bollinger Bands`);
      return null;
    }
    
    const upperBandValue = bollingerBands.upper;
    
    // Check 3 conditions for SHORT signal
    // Condition 1: Nến đỏ - Sử dụng getPriceDifferenceAfter30mKline
    // Nếu giá trị trả về < 0 (âm) thì là nến đỏ
    const priceDifferencePercent = await getPriceDifferenceAfter30mKline(symbol, price, completed30mKlines);
    
    if (priceDifferencePercent === null) {
      console.error(`[Short Signal ${symbol}] Failed to get price difference for nến đỏ check`);
      return null;
    }
    
    const condition1 = priceDifferencePercent < 0; // Nến đỏ (âm = giá giảm)
    const condition2 = highPrice > upperBandValue; // Đã từng vượt band
    const condition3 = price < upperBandValue; // Giá hiện tại dưới band
    
    const isShortSignal = condition1 && condition2 && condition3;
    
    console.log(`[Short Signal ${symbol}] Conditions check:`);
    console.log(`  - Open: ${openPrice}, Current: ${price}, High: ${highPrice}`);
    console.log(`  - Price Difference %: ${priceDifferencePercent.toFixed(2)}%`);
    console.log(`  - Upper Band: ${upperBandValue.toFixed(2)}`);
    console.log(`  - Condition 1 (Nến đỏ - Price Diff < 0): ${condition1} (${priceDifferencePercent.toFixed(2)}% < 0)`);
    console.log(`  - Condition 2 (High > Upper Band): ${condition2} (${highPrice} > ${upperBandValue.toFixed(2)})`);
    console.log(`  - Condition 3 (Current < Upper Band): ${condition3} (${price} < ${upperBandValue.toFixed(2)})`);
    console.log(`  - SHORT Signal: ${isShortSignal ? '✅ YES' : '❌ NO'}`);
    
    return {
      isShortSignal,
      openPrice,
      currentPrice: price,
      highPrice,
      upperBandValue,
      middleBand: bollingerBands.middle,
      lowerBand: bollingerBands.lower,
      currentCandleTime: currentCandle.openTime,
    };
  } catch (error) {
    console.error(`[Short Signal ${symbol}] Error:`, error);
    return null;
  }
}

export interface FetchKlinesOptions {
  startTime?: number;
  endTime?: number;
}

/**
 * Fetch klines (candlestick data) from Binance Futures API
 * @param options.startTime - Start time (ms). Optional.
 * @param options.endTime - End time (ms). Optional. API returns klines with closeTime < endTime.
 */
export async function fetchKlines(
  symbol: string,
  interval: string = "30m",
  limit: number = 200,
  options?: FetchKlinesOptions
): Promise<BinanceKline[]> {
  try {
    const timestamp = Date.now();
    let url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}&_t=${timestamp}`;
    if (options?.startTime != null) url += `&startTime=${options.startTime}`;
    if (options?.endTime != null) url += `&endTime=${options.endTime}`;
    const response = await fetch(
      url,
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

export interface RSIAtTimeResult {
  symbol: string;
  rsi: number;
  atTime: number;
  closesUsed: number;
  lastCloseTime: number;
  priceAtTime: number;
}

/**
 * Tính RSI tại một mốc thời gian cho một coin.
 * Dùng 200 nến 30m đã đóng trước atTime (closeTime < atTime), không dùng giá realtime.
 *
 * @param symbol Cặp giao dịch (vd: "BTCUSDT")
 * @param atTime Mốc thời gian (ms, Unix timestamp)
 * @param period Chu kỳ RSI (mặc định 14)
 * @returns RSI và metadata tại thời điểm đó, hoặc null nếu không đủ dữ liệu
 */
export async function calculateRSIAtTime(
  symbol: string,
  atTime: number,
  period: number = 14
): Promise<RSIAtTimeResult | null> {
  try {
    // Lấy 200 nến 30m có closeTime < atTime (API trả về klines với closeTime < endTime)
    const klines = await fetchKlines(symbol, "30m", 200, { endTime: atTime });
    if (klines.length < period + 1) {
      return null;
    }
    const last200 = klines.slice(-200);
    const closes = last200.map((k) => parseFloat(k.close));
    const rsi = calculateRSI(closes, period);
    if (rsi === null) {
      return null;
    }
    const lastKline = last200[last200.length - 1];
    return {
      symbol,
      rsi,
      atTime,
      closesUsed: closes.length,
      lastCloseTime: lastKline.closeTime,
      priceAtTime: parseFloat(lastKline.close),
    };
  } catch (error) {
    console.error(`[RSI At Time ${symbol}] Error:`, error);
    return null;
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

/**
 * Get price difference percentage between first 1-minute candle after latest completed 30m candle and current price
 * Example: If current time is 6h48, latest 30m candle is 6h00-6h30 (closed at 6h30),
 *          first 1m candle is 6h30-6h31, returns: (($price - first1mPrice) / first1mPrice) * 100
 * 
 * @param symbol Trading pair symbol (e.g., "BTCUSDT")
 * @returns Price difference percentage: ((currentPrice - first1mPrice) / first1mPrice) * 100, or null if error
 */
export async function getPriceDifferenceAfter30mKline(
  symbol: string,
  currentPrice?: number,
  completed30mKlines?: BinanceKline[]
): Promise<number | null> {
  try {
    const now = Date.now();
    
    // Step 1: Get latest completed 30-minute candle
    let latest30mKline: BinanceKline;
    if (completed30mKlines && completed30mKlines.length > 0) {
      // Use provided klines (take last one as latest completed)
      latest30mKline = completed30mKlines[completed30mKlines.length - 1];
    } else {
      // Fallback: fetch if not provided
      const klines30m = await fetchKlines(symbol, "30m", 2);
      if (klines30m.length === 0) {
        console.error(`[Price Diff ${symbol}] No 30m klines returned`);
        return null;
      }
      const completed = klines30m.filter((k) => k.closeTime < now);
      if (completed.length === 0) {
        console.warn(`[Price Diff ${symbol}] No completed 30m klines found`);
        return null;
      }
      latest30mKline = completed[completed.length - 1];
    }
    const latest30mCloseTime = latest30mKline.closeTime; // This is the start time of the first 1m candle
    
    // Step 2: Fetch 1-minute klines to get the first 1m candle after 30m closed
    // Only need to fetch last 35 minutes (30m + some buffer)
    const klines1m = await fetchKlines(symbol, "1m", 35);
    
    if (klines1m.length === 0) {
      console.error(`[Price Diff ${symbol}] No 1m klines returned`);
      return null;
    }
    
    // Find the 1m candle that starts exactly when the 30m candle closed
    const first1mKline = klines1m.find((k) => k.openTime === latest30mCloseTime);
    
    if (!first1mKline) {
      // Try to find the closest 1m candle after the close time (within 1 minute tolerance)
      const closest1mKline = klines1m.find((k) => 
        k.openTime >= latest30mCloseTime && 
        k.openTime < latest30mCloseTime + 60000
      );
      
      if (!closest1mKline) {
        console.error(`[Price Diff ${symbol}] No suitable 1m candle found`);
        return null;
      }
      
      // Get first 1m price and current price
      const first1mPrice = parseFloat(closest1mKline.close);
      const price = currentPrice ?? (await fetch24hTicker(symbol)).price;
      
      // Calculate percentage difference: ((price - first1mPrice) / first1mPrice) * 100
      if (first1mPrice === 0) {
        console.warn(`[Price Diff ${symbol}] First 1m price is 0, cannot calculate percentage`);
        return null;
      }
      
      const priceDifferencePercent = ((price - first1mPrice) / first1mPrice) * 100;
      return priceDifferencePercent;
    }
    
    // Get first 1m price and current price
    const first1mPrice = parseFloat(first1mKline.close);
    const price = currentPrice ?? (await fetch24hTicker(symbol)).price;
    
    // Calculate percentage difference: ((price - first1mPrice) / first1mPrice) * 100
    if (first1mPrice === 0) {
      console.warn(`[Price Diff ${symbol}] First 1m price is 0, cannot calculate percentage`);
      return null;
    }
    
    const priceDifferencePercent = ((price - first1mPrice) / first1mPrice) * 100;
    return priceDifferencePercent;
  } catch (error) {
    console.error(`[Price Diff ${symbol}] Error:`, error);
    return null;
  }
}
