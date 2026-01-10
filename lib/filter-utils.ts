import type { CoinRSI } from "@/lib/binance";
import { RSI_FILTERS, type RSIFilter, type FilterButton } from "@/constants/scan";
import { getAlertStatus } from "@/lib/alerts";

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



