"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "./Pagination";
import { FundingCoinRow } from "./FundingCoinRow";
import { ITEMS_PER_PAGE } from "@/constants/scan";
import type { CoinRSI } from "@/lib/binance";

interface FundingScanResultsProps {
  coins: CoinRSI[];
  fundingScanTime: string | null;
  fundingScanDuration: number | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  onCopySymbol: (symbol: string) => void;
}

export function FundingScanResults({
  coins,
  fundingScanTime,
  fundingScanDuration,
  currentPage,
  onPageChange,
  onCopySymbol,
}: FundingScanResultsProps) {
  const totalPages = Math.ceil(coins.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCoins = coins.slice(startIndex, endIndex);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Kết quả Funding Rate ({coins.length} cặp)
        </CardTitle>
        <CardDescription>
          Danh sách các cặp được sắp xếp theo Funding Rate (cao nhất trước)
          {fundingScanTime && (
            <span className="block mt-1 text-xs text-muted-foreground">
              Thời gian quét: {fundingScanTime} (GMT+7)
            </span>
          )}
          {fundingScanDuration !== null && (
            <span className="block mt-1 text-xs text-muted-foreground">
              Thời gian quét: {(fundingScanDuration / 1000).toFixed(2)} giây
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Funding</TableHead>
                <TableHead className="text-right">Giá (USDT)</TableHead>
                <TableHead className="text-right">Thay đổi 24h</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCoins.map((coin, index) => (
                <FundingCoinRow
                  key={coin.symbol}
                  coin={coin}
                  index={index}
                  startIndex={startIndex}
                  onCopySymbol={onCopySymbol}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={coins.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={onPageChange}
        />
      </CardContent>
    </Card>
  );
}



