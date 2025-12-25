"use client";

import { Button } from "@/components/ui/button";
import { applyFilters } from "@/lib/filter-utils";
import type { CoinRSI } from "@/lib/binance";

interface AlertFilterButtonsProps {
  alertFilter: 'red' | 'yellow' | 'green' | null;
  selectedRSI: string | null;
  coins: CoinRSI[];
  onFilterChange: (filter: 'red' | 'yellow' | 'green' | null, filteredCoins: CoinRSI[]) => void;
}

export function AlertFilterButtons({
  alertFilter,
  selectedRSI,
  coins,
  onFilterChange,
}: AlertFilterButtonsProps) {
  const handleAlertFilterClick = (newFilter: 'red' | 'yellow' | 'green' | null) => {
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
      </div>
      {/* Alert Notes */}
      {alertFilter !== null && (
        <div className="mt-2 text-xs text-muted-foreground">
          {alertFilter === 'red' ? (
            <span>🔴 Báo động đỏ: RSI 85-100 VÀ Funding Rate ≥ 0.05%</span>
          ) : alertFilter === 'yellow' ? (
            <span>🟡 Báo động vàng: RSI 75-79 VÀ Funding Rate ≥ 0.05%</span>
          ) : (
            <span>🟢 Báo động xanh: Funding Rate ≥ 0.05%</span>
          )}
        </div>
      )}
    </>
  );
}



