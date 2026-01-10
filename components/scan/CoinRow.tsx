"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatPrice, getRSIColor, getRSIBadge } from "@/lib/formatters";
import { getAlertStatus } from "@/lib/alerts";
import type { CoinRSI } from "@/lib/binance";

interface CoinRowProps {
  coin: CoinRSI;
  index: number;
  startIndex: number;
  showRSI?: boolean;
  onCopySymbol?: (symbol: string) => void;
}

export function CoinRow({ coin, index, startIndex, showRSI = true, onCopySymbol }: CoinRowProps) {
  const alertStatus = getAlertStatus(coin);
  const rowClassName = alertStatus === 'red'
    ? 'bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500'
    : alertStatus === 'yellow'
    ? 'bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-l-yellow-500'
    : alertStatus === 'green'
    ? 'bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500'
    : '';

  const handleCopy = () => {
    if (onCopySymbol) {
      onCopySymbol(coin.symbol);
    }
  };

  return (
    <TableRow className={rowClassName}>
      <TableCell className="font-medium">
        {startIndex + index + 1}
      </TableCell>
      <TableCell
        className="font-medium cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        onClick={handleCopy}
        title="Click to copy symbol"
      >
        {coin.symbol}
      </TableCell>
      {showRSI && (
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
      )}
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
      <TableCell
        className={`text-right font-medium ${
          coin.priceDifference !== undefined
            ? (Math.abs(coin.priceDifference) < 0.01 ? "text-muted-foreground" : coin.priceDifference >= 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400")
            : "text-muted-foreground"
        }`}
      >
        {coin.priceDifference !== undefined ? (
          (() => {
            // Normalize giá trị rất gần 0 về 0 để tránh hiển thị -0.00
            // priceDifference bây giờ là phần trăm (%)
            const normalizedDiff = Math.abs(coin.priceDifference) < 0.01 ? 0 : coin.priceDifference;
            return (
              <div className="flex items-center justify-end gap-1">
                {normalizedDiff >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {normalizedDiff >= 0 ? "+" : ""}
                {normalizedDiff.toFixed(2)}%
              </div>
            );
          })()
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}



