"use client";

import { Button } from "@/components/ui/button";
import { applyFilters, applyPrice3AlertFilter } from "@/lib/filter-utils";
import { PRICE3_ALERT_RANGES, type Price3AlertRange } from "@/lib/alerts";
import type { CoinRSI } from "@/lib/binance";

interface AlertFilterButtonsProps {
  alertFilter: 'red' | 'yellow' | 'green' | 'pink' | 'black' | null;
  selectedRSI: string | null;
  coins: CoinRSI[];
  onFilterChange: (filter: 'red' | 'yellow' | 'green' | 'pink' | 'black' | null, filteredCoins: CoinRSI[]) => void;
  price3AlertFilter?: Price3AlertRange | null;
  onPrice3AlertFilterChange?: (key: Price3AlertRange | null, filteredCoins: CoinRSI[]) => void;
}

export function AlertFilterButtons({
  alertFilter,
  selectedRSI,
  coins,
  onFilterChange,
  price3AlertFilter = null,
  onPrice3AlertFilterChange,
}: AlertFilterButtonsProps) {
  const handleAlertFilterClick = (newFilter: 'red' | 'yellow' | 'green' | 'pink' | 'black' | null) => {
    // Chỉ 1 button báo động: khi chọn đỏ/vàng/xanh/đen/hồng thì không áp dụng lọc Giá (3)
    const filtered = applyFilters(coins, selectedRSI, newFilter);
    onFilterChange(newFilter, filtered);
  };

  const handlePrice3AlertClick = (key: Price3AlertRange | null) => {
    if (!onPrice3AlertFilterChange) return;
    // Chỉ 1 button báo động: khi chọn Giá (3) thì bỏ lọc đỏ/vàng/xanh/đen/hồng
    const baseFiltered = applyFilters(coins, selectedRSI, null);
    const newKey = price3AlertFilter === key ? null : key;
    const filtered = newKey ? applyPrice3AlertFilter(baseFiltered, newKey) : baseFiltered;
    onPrice3AlertFilterChange(newKey, filtered);
  };

  return (
    <>
      <div className="flex gap-2 mt-4">
        <Button
          variant={alertFilter === 'red' ? "default" : "outline"}
          size="sm"
          onClick={() => handleAlertFilterClick(alertFilter === 'red' ? null : 'red')}
          className={alertFilter === 'red' ? "bg-red-600 hover:bg-red-700 text-white" : "border-red-600 text-red-600"}
        >
          🔴 BÁO ĐỘNG ĐỎ
        </Button>
        <Button
          variant={alertFilter === 'yellow' ? "default" : "outline"}
          size="sm"
          onClick={() => handleAlertFilterClick(alertFilter === 'yellow' ? null : 'yellow')}
          className={alertFilter === 'yellow' ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "border-yellow-500 text-yellow-600"}
        >
          🟡 BÁO ĐỘNG VÀNG
        </Button>
        <Button
          variant={alertFilter === 'green' ? "default" : "outline"}
          size="sm"
          onClick={() => handleAlertFilterClick(alertFilter === 'green' ? null : 'green')}
          className={alertFilter === 'green' ? "bg-green-600 hover:bg-green-700 text-white" : "border-green-600 text-green-600"}
        >
          🟢 BÁO ĐỘNG XANH
        </Button>
        <Button
          variant={alertFilter === 'black' ? "default" : "outline"}
          size="sm"
          onClick={() => handleAlertFilterClick(alertFilter === 'black' ? null : 'black')}
          className={alertFilter === 'black' ? "bg-black hover:bg-gray-900 text-white" : "border-black text-black"}
        >
          ⚫ BÁO ĐỘNG ĐEN
        </Button>
        <Button
          variant={alertFilter === 'pink' ? "default" : "outline"}
          size="sm"
          onClick={() => handleAlertFilterClick(alertFilter === 'pink' ? null : 'pink')}
          className={alertFilter === 'pink' ? "bg-pink-600 hover:bg-pink-700 text-white" : "border-pink-600 text-pink-600"}
        >
          ♦️ BÁO ĐỘNG HỒNG
        </Button>
      </div>
      {/* Hàng riêng: Báo động theo Giá (3) */}
      {onPrice3AlertFilterChange && (
        <div className="flex flex-wrap gap-2 mt-3">
          {PRICE3_ALERT_RANGES.map(({ key, label }) => (
            <Button
              key={key}
              variant={price3AlertFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => handlePrice3AlertClick(key)}
              className={price3AlertFilter === key ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-amber-500 text-amber-600"}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
      {/* Alert Notes */}
      {alertFilter !== null && (
        <div className="mt-2 text-xs text-muted-foreground">
          {alertFilter === 'red' ? (
            <span>🔴 Báo động đỏ: RSI 85-100 VÀ Funding Rate ≥ 0.05%</span>
          ) : alertFilter === 'yellow' ? (
            <span>🟡 Báo động vàng: RSI 75-79 VÀ Funding Rate ≥ 0.05%</span>
          ) : alertFilter === 'green' ? (
            <span>🟢 Báo động xanh: RSI ≥ 70 VÀ Funding Rate ≥ 0.05%</span>
          ) : alertFilter === 'black' ? (
            <span>⚫ Báo động đen: RSI ≥ 70 và Funding Rate = 0.005% hoặc 0.01%</span>
          ) : (
            <span>♦️ Báo động hồng: (1) Nến đỏ (2) Đã vượt Band vàng (3) Giá dưới Band vàng (4) RSI 70-79 (5) Funding Rate ≥ 0.05%</span>
          )}
        </div>
      )}
    </>
  );
}



