import type { CoinRSI } from "@/lib/binance";

/**
 * Get alert status for a coin
 */
export const getAlertStatus = (coin: CoinRSI): 'red' | 'yellow' | 'green' | null => {
  const fundingRate = coin.fundingRate ?? 0;

  // Báo động Đỏ: RSI 85-100 AND Funding Rate >= 0.0005 (0.05%)
  if (coin.rsi >= 85 && coin.rsi <= 100 && fundingRate >= 0.0005) {
    return 'red';
  }

  // Báo động Vàng: RSI 75-79 AND Funding Rate >= 0.0005 (0.05%)
  if (coin.rsi >= 75 && coin.rsi <= 79 && fundingRate >= 0.0005) {
    return 'yellow';
  }

  // Báo động Xanh: Funding Rate >= 0.0005 (0.05%)
  if (fundingRate >= 0.0005) {
    return 'green';
  }

  return null;
};



