import type { CoinRSI } from "@/lib/binance";

/**
 * Compare funding rate with tolerance for floating point precision
 * @param fundingRate - Funding rate in decimal form (e.g., 0.005 = 0.5%)
 * @param targetPercent - Target percentage (e.g., 0.5 for 0.5%)
 * @returns true if funding rate equals target percentage (within tolerance)
 */
const isFundingRateEqual = (fundingRate: number, targetPercent: number): boolean => {
  // Convert target percentage to decimal: 0.5% = 0.005
  const targetDecimal = targetPercent / 100;
  // Use small tolerance for floating point comparison
  const tolerance = 0.000001;
  return Math.abs(fundingRate - targetDecimal) < tolerance;
};

/**
 * Get alert status for a coin
 */
export const getAlertStatus = (coin: CoinRSI): 'red' | 'yellow' | 'green' | 'pink' | 'black' | null => {
  const fundingRate = coin.fundingRate ?? 0;

  // Báo động Đỏ: RSI 85-100 AND Funding Rate >= 0.0005 (0.05%)
  if (coin.rsi >= 85 && coin.rsi <= 100 && fundingRate >= 0.0005) {
    return 'red';
  }

  // Báo động Đen: RSI >= 80 AND Funding Rate = 0.005 (trong code)
  // Note: Funding rate từ Binance API là decimal form
  // 0.005 (trong code) = 0.5% (khi hiển thị: 0.005 * 100 = 0.5%)
  // Sử dụng hàm so sánh với tolerance để tránh lỗi floating point
  // (Kiểm tra trước Báo động Hồng - có độ ưu tiên cao)
  if (coin.rsi >= 80 && isFundingRateEqual(fundingRate, 0.5)) {
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



