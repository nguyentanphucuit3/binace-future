import type { CoinRSI } from "@/lib/binance";

/**
 * Get alert status for a coin
 */
export const getAlertStatus = (coin: CoinRSI): 'red' | 'yellow' | 'green' | 'pink' | 'black' | null => {
  const fundingRate = coin.fundingRate ?? 0;

  // Báo động Đỏ: RSI 85-100 AND Funding Rate >= 0.0005 (0.05%)
  if (coin.rsi >= 85 && coin.rsi <= 100 && fundingRate >= 0.0005) {
    return 'red';
  }

  // Báo động Đen: RSI >= 80 AND Funding Rate = 0.005 (0.5%)
  // (Kiểm tra trước Báo động Hồng - có độ ưu tiên cao)
  if (coin.rsi >= 80 && fundingRate >= 0.005) {
    return 'black';
  }

  // Báo động Hồng: isShortSignal === true AND RSI 70-79 AND Funding Rate >= 0.0005 (0.05%)
  // (Kiểm tra trước Báo động Vàng để ưu tiên - nếu có isShortSignal thì ưu tiên hồng hơn vàng)
  if (coin.isShortSignal === true && coin.rsi >= 70 && coin.rsi <= 79 && fundingRate >= 0.0005) {
    return 'pink';
  }

  // Báo động Vàng: RSI 75-79 AND Funding Rate >= 0.0005 (0.05%)
  // (Nhưng không phải Hồng - vì Hồng đã được kiểm tra trước)
  if (coin.rsi >= 75 && coin.rsi <= 79 && fundingRate >= 0.0005) {
    return 'yellow';
  }

  // Báo động Xanh: RSI >= 70 AND Funding Rate >= 0.0005 (0.05%)
  // (Nhưng không phải Đỏ, Đen, Vàng, hoặc Hồng)
  if (coin.rsi >= 70 && fundingRate >= 0.0005) {
    return 'green';
  }

  return null;
};



