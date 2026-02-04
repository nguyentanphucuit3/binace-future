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

  // Báo động Đen: RSI >= 70 AND Funding Rate = 0.005% (0.00005) HOẶC = 0.01% (0.0001)
  // Note: Funding rate từ Binance API là decimal form
  // So sánh: fundingRate * 100 == 0.005 (0.005%) HOẶC == 0.01 (0.01%)
  // (Kiểm tra trước Báo động Hồng - có độ ưu tiên cao)
  if (coin.rsi >= 70 && (Math.abs(fundingRate * 100 - 0.005) < 0.0001 || Math.abs(fundingRate * 100 - 0.01) < 0.0001)) {
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

/** Khoảng Giá (3) → nhãn báo động (BÁO ĐỘNG 300, 600, ...) */
export type Price3AlertRange = '300' | '600' | '900' | '1200' | '1500' | '1800' | '2100';

/** Cấu hình khoảng Giá (3) và nhãn báo động */
export const PRICE3_ALERT_RANGES: { min: number; max: number; key: Price3AlertRange; label: string }[] = [
  { min: 100, max: 300, key: '300', label: 'BÁO ĐỘNG 300' },
  { min: 301, max: 600, key: '600', label: 'BÁO ĐỘNG 600' },
  { min: 601, max: 900, key: '900', label: 'BÁO ĐỘNG 900' },
  { min: 901, max: 1200, key: '1200', label: 'BÁO ĐỘNG 1.200' },
  { min: 1201, max: 1500, key: '1500', label: 'BÁO ĐỘNG 1.500' },
  { min: 1501, max: 1800, key: '1800', label: 'BÁO ĐỘNG 1.800' },
  { min: 1801, max: 2100, key: '2100', label: 'BÁO ĐỘNG 2.100' },
];

/**
 * Trả về nhãn báo động theo Giá (3) nếu nằm trong một trong các khoảng đã định.
 */
export function getPrice3AlertRange(price3: number | undefined): Price3AlertRange | null {
  if (price3 === undefined || price3 == null) return null;
  const r = PRICE3_ALERT_RANGES.find((range) => price3 >= range.min && price3 <= range.max);
  return r ? r.key : null;
}

/** Funding rate trong khoảng 0.005% - 2% (dùng cho Báo động RSI và báo động Giá 3) */
export function isFundingInRange005To2(fundingRate: number | undefined): boolean {
  const fr = fundingRate ?? 0;
  return fr >= 0.00005 && fr <= 0.02; // 0.005% - 2%
}

/**
 * Trả về nhãn hiển thị (vd "BÁO ĐỘNG 300") từ key hoặc từ price3.
 */
export function getPrice3AlertLabel(price3: number | undefined): string | null {
  const key = getPrice3AlertRange(price3);
  if (!key) return null;
  return PRICE3_ALERT_RANGES.find((r) => r.key === key)?.label ?? null;
}


