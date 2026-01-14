"use client";

import { Button } from "@/components/ui/button";
import { applyFilters } from "@/lib/filter-utils";
import type { CoinRSI } from "@/lib/binance";

interface AlertFilterButtonsProps {
  alertFilter: 'red' | 'yellow' | 'green' | 'pink' | 'black' | null;
  selectedRSI: string | null;
  coins: CoinRSI[];
  onFilterChange: (filter: 'red' | 'yellow' | 'green' | 'pink' | 'black' | null, filteredCoins: CoinRSI[]) => void;
}

export function AlertFilterButtons({
  alertFilter,
  selectedRSI,
  coins,
  onFilterChange,
}: AlertFilterButtonsProps) {
  const handleAlertFilterClick = (newFilter: 'red' | 'yellow' | 'green' | 'pink' | 'black' | null) => {
    const filtered = applyFilters(coins, selectedRSI, newFilter);
    onFilterChange(newFilter, filtered);
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
            <span>⚫ Báo động đen: RSI ≥ 80 và Funding Rate = 0.5% (0.005)</span>
          ) : (
            <span>♦️ Báo động hồng: (1) Nến đỏ (2) Đã vượt Band vàng (3) Giá dưới Band vàng (4) RSI 70-79 (5) Funding Rate ≥ 0.05%</span>
          )}
        </div>
      )}
    </>
  );
}



