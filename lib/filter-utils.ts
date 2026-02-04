import type { CoinRSI } from "@/lib/binance";
import { RSI_FILTERS, type RSIFilter, type FilterButton } from "@/constants/scan";
import { getAlertStatus, getPrice3AlertRange, isFundingInRange005To2, type Price3AlertRange } from "@/lib/alerts";

/**
 * Apply RSI filter to coins
 */
export const applyRSIFilter = (coins: CoinRSI[], filter: RSIFilter): CoinRSI[] => {
  if (filter.type === 'max') {
    return coins.filter((coin) => coin.rsi <= filter.value);
  } else if (filter.type === 'range') {
    return coins.filter((coin) => coin.rsi >= filter.min && coin.rsi <= filter.max);
  } else {
    return coins.filter((coin) => coin.rsi >= filter.value && coin.rsi <= 100);
  }
};

/**
 * Get filter config by key
 */
export const getFilterConfig = (filterKey: string): FilterButton | null => {
  const allButtons: FilterButton[] = [];
  Object.values(RSI_FILTERS).forEach(c => {
    allButtons.push(...c.buttons);
  });
  return allButtons.find(b => b.key === filterKey) || null;
};

/**
 * Apply alert filter to coins
 */
export const applyAlertFilter = (coins: CoinRSI[], alertFilter: 'red' | 'yellow' | 'green' | 'pink' | 'black' | null): CoinRSI[] => {
  if (alertFilter === null) return coins;
  return coins.filter((coin) => getAlertStatus(coin) === alertFilter);
};

/**
 * Apply both RSI and alert filters
 */
export const applyFilters = (
  coins: CoinRSI[],
  selectedRSI: string | null,
  alertFilter: 'red' | 'yellow' | 'green' | 'pink' | 'black' | null
): CoinRSI[] => {
  let filtered = coins;

  // Apply RSI filter first
  if (selectedRSI) {
    const filterConfig = getFilterConfig(selectedRSI);
    if (filterConfig) {
      filtered = applyRSIFilter(coins, filterConfig.filter);
    }
  } else {
    // Default: show coins with RSI >= 70
    filtered = coins.filter((coin) => coin.rsi >= 70 && coin.rsi <= 100);
  }

  // Apply alert filter on top
  if (alertFilter !== null) {
    filtered = applyAlertFilter(filtered, alertFilter);
  }

  return filtered;
};

/**
 * Lọc theo báo động Giá (3) (100-300 → 300, 301-600 → 600, ...).
 * Thêm điều kiện: Funding 0.005% - 2%.
 */
export const applyPrice3AlertFilter = (
  coins: CoinRSI[],
  price3AlertFilter: Price3AlertRange | null
): CoinRSI[] => {
  if (price3AlertFilter === null) return coins;
  return coins.filter(
    (coin) =>
      getPrice3AlertRange(coin.price3) === price3AlertFilter && isFundingInRange005To2(coin.fundingRate)
  );
};



