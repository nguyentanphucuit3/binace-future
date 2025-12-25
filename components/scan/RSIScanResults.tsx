"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFilterDescription } from "@/lib/formatters";
import { Pagination } from "./Pagination";
import { CoinRow } from "./CoinRow";
import { AlertFilterButtons } from "./AlertFilterButtons";
import { ITEMS_PER_PAGE } from "@/constants/scan";
import type { CoinRSI } from "@/lib/binance";

interface RSIScanResultsProps {
  coins: CoinRSI[];
  filteredCoins: CoinRSI[];
  selectedRSI: string | null;
  alertFilter: 'red' | 'yellow' | 'green' | null;
  lastScanTime: string | null;
  scanDuration: number | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  onAlertFilterChange: (filter: 'red' | 'yellow' | 'green' | null, filteredCoins: CoinRSI[]) => void;
  onCopySymbol: (symbol: string) => void;
}

export function RSIScanResults({
  coins,
  filteredCoins,
  selectedRSI,
  alertFilter,
  lastScanTime,
  scanDuration,
  currentPage,
  onPageChange,
  onAlertFilterChange,
  onCopySymbol,
}: RSIScanResultsProps) {
  const totalPages = Math.ceil(filteredCoins.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCoins = filteredCoins.slice(startIndex, endIndex);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Kết quả ({filteredCoins.length} / {coins.length} cặp)
          {alertFilter !== null && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {alertFilter === 'red' ? '(🔴 Báo động đỏ)' : alertFilter === 'yellow' ? '(🟡 Báo động vàng)' : '(🟢 Báo động xanh)'}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          {getFilterDescription(selectedRSI)}
          {lastScanTime && (
            <span className="block mt-1 text-xs text-muted-foreground">
              Thời gian quét: {lastScanTime} (GMT+7)
            </span>
          )}
          {scanDuration !== null && (
            <span className="block mt-1 text-xs text-muted-foreground">
              Thời gian quét: {(scanDuration / 1000).toFixed(2)} giây
            </span>
          )}
        </CardDescription>
        <AlertFilterButtons
          alertFilter={alertFilter}
          selectedRSI={selectedRSI}
          coins={coins}
          onFilterChange={onAlertFilterChange}
        />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">RSI (14)</TableHead>
                <TableHead className="text-right">Funding</TableHead>
                <TableHead className="text-right">Giá (USDT)</TableHead>
                <TableHead className="text-right">Thay đổi 24h</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoins.length === 0 && alertFilter !== null ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-lg">
                        {alertFilter === 'red' ? '🔴' : alertFilter === 'yellow' ? '🟡' : '🟢'}
                      </span>
                      <span className="font-medium">
                        Không có báo động {alertFilter === 'red' ? 'đỏ' : alertFilter === 'yellow' ? 'vàng' : 'xanh'}
                      </span>
                      <span className="text-sm">
                        {alertFilter === 'red' 
                          ? 'Không có coin nào có RSI 85-100 VÀ Funding Rate ≥ 0.05%'
                          : alertFilter === 'yellow'
                          ? 'Không có coin nào có RSI 75-79 VÀ Funding Rate ≥ 0.05%'
                          : 'Không có coin nào có Funding Rate ≥ 0.05%'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedCoins.map((coin, index) => (
                    <CoinRow
                      key={coin.symbol}
                      coin={coin}
                      index={index}
                      startIndex={startIndex}
                      showRSI={true}
                      onCopySymbol={onCopySymbol}
                    />
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCoins.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={onPageChange}
        />
      </CardContent>
    </Card>
  );
}

