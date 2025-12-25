const TIMEZONE = "Asia/Ho_Chi_Minh";

/**
 * Format timestamp to Vietnam time string
 */
export const formatVietnamTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString("vi-VN", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

/**
 * Format price with configurable decimals
 */
export const formatPrice = (price: number, minDecimals = 2, maxDecimals = 8): string => {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
};

/**
 * Get RSI color class based on RSI value
 */
export const getRSIColor = (rsi: number): string => {
  if (rsi >= 70) return "text-red-600 dark:text-red-400 font-semibold";
  if (rsi <= 30) return "text-green-600 dark:text-green-400 font-semibold";
  return "text-foreground";
};

/**
 * Get RSI badge class based on RSI value
 */
export const getRSIBadge = (rsi: number): string => {
  if (rsi >= 70) return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
  if (rsi <= 30) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
  return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
};

/**
 * Get filter description text
 */
export const getFilterDescription = (selectedRSI: string | null): string => {
  if (!selectedRSI) return "Chọn ngưỡng RSI để xem kết quả";
  
  if (selectedRSI.startsWith("<=")) {
    const value = selectedRSI.replace("<=", "");
    return `Hiển thị các cặp có RSI ≤ ${value}`;
  }
  
  if (selectedRSI.includes("-")) {
    return `Hiển thị các cặp có RSI ${selectedRSI}`;
  }
  
  if (selectedRSI.startsWith(">=")) {
    const value = selectedRSI.replace(">=", "");
    return `Hiển thị các cặp có RSI ≥ ${value} và ≤ 100`;
  }
  
  return "Chọn ngưỡng RSI để xem kết quả";
};



