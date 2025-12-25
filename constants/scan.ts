export const RATE_LIMIT_KEY = "rsi_scan_last_time";
export const RATE_LIMIT_MS = process.env.NEXT_PUBLIC_TIME_RSI 
  ? parseInt(process.env.NEXT_PUBLIC_TIME_RSI) * 60 * 1000 
  : 5 * 60 * 1000; // 5 minutes

export const FUNDING_RATE_LIMIT_KEY = "funding_scan_last_time";
export const FUNDING_RATE_LIMIT_MS = process.env.NEXT_PUBLIC_TIME_FUNDING 
  ? parseInt(process.env.NEXT_PUBLIC_TIME_FUNDING) * 60 * 1000 
  : 5 * 60 * 1000; // 5 minutes

export const ITEMS_PER_PAGE = 20;
export const SCAN_DATA_KEY = "rsi_scan_data";
export const FUNDING_SCAN_DATA_KEY = "funding_scan_data";

// Types
export type RSIFilter = 
  | { type: 'max'; value: number }
  | { type: 'range'; min: number; max: number }
  | { type: 'min'; value: number };

export type FilterButton = {
  key: string;
  filter: RSIFilter;
  label: string;
};

// RSI Filter Config
export const RSI_FILTERS = {
  lt30: {
    label: "RSI < 30",
    category: "lt30" as const,
    buttons: [
      { key: "<=5", filter: { type: 'max' as const, value: 5 }, label: "RSI ≤ 5" },
      { key: "<=10", filter: { type: 'max' as const, value: 10 }, label: "RSI ≤ 10" },
      { key: "<=15", filter: { type: 'max' as const, value: 15 }, label: "RSI ≤ 15" },
      { key: "<=20", filter: { type: 'max' as const, value: 20 }, label: "RSI ≤ 20" },
      { key: "<=25", filter: { type: 'max' as const, value: 25 }, label: "RSI ≤ 25" },
    ],
    className: "bg-green-50 dark:bg-green-950/20 hover:bg-green-200 dark:hover:bg-green-950/40 active:bg-green-300 dark:active:bg-green-950/50 border-green-400 dark:border-green-800",
    textClassName: (expanded: boolean) => expanded 
      ? "text-black dark:text-white" 
      : "text-green-800 dark:text-green-200",
  },
  mid: {
    label: "RSI 30-70",
    category: "30-70" as const,
    buttons: [
      { key: "30-40", filter: { type: 'range' as const, min: 30, max: 40 }, label: "RSI 30-40" },
      { key: "40-50", filter: { type: 'range' as const, min: 40, max: 50 }, label: "RSI 40-50" },
      { key: "50-60", filter: { type: 'range' as const, min: 50, max: 60 }, label: "RSI 50-60" },
      { key: "60-70", filter: { type: 'range' as const, min: 60, max: 70 }, label: "RSI 60-70" },
    ],
    className: "hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 text-gray-900 dark:text-gray-100",
    textClassName: (expanded: boolean) => expanded 
      ? "text-white dark:text-white" 
      : "text-gray-900 dark:text-gray-100",
  },
  gte70: {
    label: "RSI ≥ 70",
    category: "gte70" as const,
    buttons: [
      { key: ">=70", filter: { type: 'min' as const, value: 70 }, label: "RSI ≥ 70" },
      { key: ">=75", filter: { type: 'min' as const, value: 75 }, label: "RSI ≥ 75" },
      { key: ">=80", filter: { type: 'min' as const, value: 80 }, label: "RSI ≥ 80" },
      { key: ">=85", filter: { type: 'min' as const, value: 85 }, label: "RSI ≥ 85" },
      { key: ">=90", filter: { type: 'min' as const, value: 90 }, label: "RSI ≥ 90" },
      { key: ">=95", filter: { type: 'min' as const, value: 95 }, label: "RSI ≥ 95" },
    ],
    className: "bg-red-50 dark:bg-red-950/20 hover:bg-red-200 dark:hover:bg-red-950/40 active:bg-red-300 dark:active:bg-red-950/50 border-red-400 dark:border-red-800",
    textClassName: (expanded: boolean) => expanded 
      ? "text-black dark:text-white" 
      : "text-red-800 dark:text-red-200",
  },
};



