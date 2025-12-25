"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import type { CoinRSI } from "@/lib/binance";

interface FundingCoinRowProps {
  coin: CoinRSI;
  index: number;
  startIndex: number;
  onCopySymbol?: (symbol: string) => void;
}

export function FundingCoinRow({ coin, index, startIndex, onCopySymbol }: FundingCoinRowProps) {
  const fundingRate = coin.fundingRate ?? 0;
  const isHighFunding = fundingRate >= 0.0005; // >= 0.05%

  const handleCopy = () => {
    if (onCopySymbol) {
      onCopySymbol(coin.symbol);
    }
  };

  return (
    <TableRow 
      className={isHighFunding ? 'bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500' : ''}
    >
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
      <TableCell className="text-right">
        <span className={fundingRate >= 0 ? "text-green-600 dark:text-green-400 font-semibold" : "text-red-600 dark:text-red-400 font-semibold"}>
          {(fundingRate * 100).toFixed(4)}%
        </span>
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
    </TableRow>
  );
}



