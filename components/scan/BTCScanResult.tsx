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
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatPrice, getRSIColor, getRSIBadge } from "@/lib/formatters";
import type { CoinRSI } from "@/lib/binance";

interface BTCScanResultProps {
  coin: CoinRSI;
  scanTime: string | null;
  onCopySymbol: (symbol: string) => void;
}

export function BTCScanResult({ coin, scanTime, onCopySymbol }: BTCScanResultProps) {
  const handleCopy = () => {
    onCopySymbol(coin.symbol);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>RSI BTC</CardTitle>
        <CardDescription>
          Thông tin RSI và giá của Bitcoin (BTCUSDT)
          {scanTime && (
            <span className="block mt-1 text-xs text-muted-foreground">
              Thời gian quét: {scanTime} (GMT+7)
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">RSI 14</TableHead>
                <TableHead className="text-right">Funding</TableHead>
                <TableHead className="text-right">Giá (USDT)</TableHead>
                <TableHead className="text-right">Giá đánh dấu</TableHead>
                <TableHead className="text-right">Chỉ số</TableHead>
                <TableHead className="text-right">Thay đổi 24h</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-orange-50 dark:bg-orange-950/20 border-l-4 border-l-orange-500">
                <TableCell
                  className="font-medium text-orange-700 dark:text-orange-400 cursor-pointer hover:text-orange-600 dark:hover:text-orange-300 transition-colors"
                  onClick={handleCopy}
                  title="Click to copy symbol"
                >
                  {coin.symbol}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRSIBadge(
                      coin.rsi
                    )}`}
                  >
                    <span className={getRSIColor(coin.rsi)}>
                      {coin.rsi.toFixed(2)}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {coin.fundingRate !== undefined ? (
                    <span className={coin.fundingRate >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                      {(coin.fundingRate * 100).toFixed(4)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  ${formatPrice(coin.price)}
                </TableCell>
                <TableCell className="text-right">
                  {coin.markPrice ? (
                    `$${formatPrice(coin.markPrice, 2, 2)}`
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {coin.indexPrice ? (
                    `$${formatPrice(coin.indexPrice, 2, 2)}`
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell
                  className={`text-right ${
                    coin.change24h >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  <div className="flex items-center justify-end gap-1">
                    {coin.change24h >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {coin.change24h >= 0 ? "+" : ""}
                    {coin.change24h.toFixed(2)}%
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}



