"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { getScanHistory, deleteScanHistory, type ScanHistory } from "@/app/actions/history";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2, ArrowLeft, Eye, EyeOff, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SimpleCoinData } from "@/app/actions/history";
import { getPrice3AlertRange, isFundingInRange005To2, PRICE3_ALERT_RANGES, type Price3AlertRange } from "@/lib/alerts";

const formatPrice = (price: number, minDecimals = 2, maxDecimals = 8): string => {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
};

const getRSIColor = (rsi: number): string => {
  if (rsi >= 70) return "text-red-600 dark:text-red-400 font-semibold";
  if (rsi <= 30) return "text-green-600 dark:text-green-400 font-semibold";
  return "text-foreground";
};

const getRSIBadge = (rsi: number): string => {
  if (rsi >= 70) return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
  if (rsi <= 30) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
  return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
};

// Parse scan_time to extract date and time
const parseScanTime = (timeString: string): { date: string; time: string } => {
  try {
    // Format is usually: "dd/MM/yyyy, HH:mm:ss"
    const parts = timeString.split(", ");
    if (parts.length === 2) {
      return {
        date: parts[0], // dd/MM/yyyy
        time: parts[1], // HH:mm:ss
      };
    }
    // Fallback: try to extract from different formats
    const dateMatch = timeString.match(/(\d{2}\/\d{2}\/\d{4})/);
    const timeMatch = timeString.match(/(\d{2}:\d{2}:\d{2})/);
    return {
      date: dateMatch ? dateMatch[1] : "",
      time: timeMatch ? timeMatch[1] : "",
    };
  } catch {
    return { date: "", time: "" };
  }
};

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [alertFilter, setAlertFilter] = useState<'red' | 'yellow' | 'green' | 'black' | 'pink' | null>(null);
  const [onlyWithPrice2, setOnlyWithPrice2] = useState(false);
  const [price3AlertFilter, setPrice3AlertFilter] = useState<Price3AlertRange | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const loadHistory = async () => {
    setLoading(true);
    const result = await getScanHistory();
    if (result.data) {
      setHistory(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa lịch sử này?")) return;

    setDeletingId(id);
    const result = await deleteScanHistory(id);
    if (result.success) {
      setHistory(history.filter((h) => h.id !== id));
    }
    setDeletingId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Check alert status for a coin
  const getAlertStatus = (coin: SimpleCoinData): 'red' | 'yellow' | 'green' | 'black' | 'pink' | null => {
    const fundingRate = coin.fundingRate ?? 0;
    
    // Báo động Đỏ: RSI 85-100 AND Funding Rate >= 0.0005 (0.05%)
    if (coin.rsi >= 85 && coin.rsi <= 100 && fundingRate*100 == 0.005) {
      return 'red';
    }
    
    // Báo động Đen: RSI >= 70 AND Funding Rate = 0.005% (0.00005) HOẶC = 0.01% (0.0001)
    // Note: Funding rate từ Binance API là decimal form
    // So sánh: fundingRate * 100 == 0.005 (0.005%) HOẶC == 0.01 (0.01%)
    if (coin.rsi >= 70 && (Math.abs(fundingRate * 100 - 0.005) < 0.0001 || Math.abs(fundingRate * 100 - 0.01) < 0.0001)) {
      return 'black';
    }
    
    // Báo động Hồng: isShortSignal === true AND RSI 70-79 AND Funding Rate >= 0.0005 (0.05%)
    if (coin.isShortSignal === true && coin.rsi >= 70 && coin.rsi <= 79 && fundingRate >= 0.0005) {
      return 'pink';
    }
    
    // Báo động Vàng: RSI 75-79 AND Funding Rate >= 0.0005 (0.05%)
    // (Nhưng không phải Hồng - vì Hồng đã được kiểm tra trước)
    if (coin.rsi >= 75 && coin.rsi <= 79 && fundingRate >= 0.0005) {
      return 'yellow';
    }
    
    // Báo động Xanh: RSI >= 70 AND Funding Rate >= 0.0005 (0.05%)
    // (Nhưng không phải Đỏ, Đen, Vàng, hoặc Hồng)
    if (coin.rsi >= 70 && fundingRate >= 0.0005) {
      return 'green';
    }
    
    return null;
  };

  // Filter coins based on alert filter and "có Giá (2)"
  const getFilteredCoins = (coins: SimpleCoinData[]): SimpleCoinData[] => {
    let result = coins;
    if (alertFilter === 'red') {
      result = result.filter((coin) => getAlertStatus(coin) === 'red');
    } else if (alertFilter === 'yellow') {
      result = result.filter((coin) => getAlertStatus(coin) === 'yellow');
    } else if (alertFilter === 'green') {
      result = result.filter((coin) => getAlertStatus(coin) === 'green');
    } else if (alertFilter === 'black') {
      result = result.filter((coin) => getAlertStatus(coin) === 'black');
    } else if (alertFilter === 'pink') {
      result = result.filter((coin) => getAlertStatus(coin) === 'pink');
    }
    if (onlyWithPrice2) {
      result = result.filter(
        (coin) =>
          coin.price2 !== undefined &&
          coin.price2 != null &&
          isFundingInRange005To2(coin.fundingRate)
      );
    }
    if (price3AlertFilter) {
      result = result.filter(
        (coin) =>
          getPrice3AlertRange(coin.price3) === price3AlertFilter &&
          isFundingInRange005To2(coin.fundingRate)
      );
    }
    return result;
  };

  // Apply filter to all history items
  const filteredHistory = history
    .map((item) => {
      const filtered = getFilteredCoins(item.coins_data);
      return {
        ...item,
        filtered_coins: filtered,
      };
    })
    // If alert filter is active, only show items that have matching coins (length > 0)
    .filter((item) => {
      if (alertFilter !== null || onlyWithPrice2 || price3AlertFilter) {
        const hasMatchingCoins = item.filtered_coins.length > 0;
        return hasMatchingCoins;
      }
      return true; // Show all items when no filter
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

  const currentHistory = paginatedHistory.find((h) => h.id === expandedId) || filteredHistory.find((h) => h.id === expandedId);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setExpandedId(null); // Close expanded row when changing page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Lịch sử quét RSI</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Xem lại các lần quét RSI đã thực hiện
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/")} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Đang tải lịch sử...</p>
            </CardContent>
          </Card>
        ) : history.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Chưa có lịch sử quét nào</p>
              <Button className="mt-4" onClick={() => router.push("/")}>
                Quét ngay
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div>
                    <CardTitle>
                      Tổng quan lịch sử ({alertFilter === null && !onlyWithPrice2 && !price3AlertFilter ? history.length : filteredHistory.length} lần quét
                      {alertFilter !== null && ` - ${
                        alertFilter === 'red' ? '🔴 Báo động đỏ' 
                        : alertFilter === 'yellow' ? '🟡 Báo động vàng' 
                        : alertFilter === 'green' ? '🟢 Báo động xanh'
                        : alertFilter === 'black' ? '⚫ Báo động đen'
                        : '♦️ Báo động hồng'
                      }`}
                      {onlyWithPrice2 && `${alertFilter !== null ? ' · ' : ''}Báo động RSI`}
                      {price3AlertFilter && `${alertFilter !== null || onlyWithPrice2 ? ' · ' : ''}${PRICE3_ALERT_RANGES.find((r) => r.key === price3AlertFilter)?.label ?? price3AlertFilter}`})
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Danh sách các lần quét RSI, nhấn vào một dòng để xem chi tiết
                    </CardDescription>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={alertFilter === 'red' ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setAlertFilter(alertFilter === 'red' ? null : 'red');
                          setPrice3AlertFilter(null);
                          setCurrentPage(1);
                          setExpandedId(null);
                        }}
                        className={alertFilter === 'red' ? "bg-red-600 hover:bg-red-700 text-white" : "border-red-600 text-red-600"}
                      >
                        🔴 Báo động đỏ
                      </Button>
                      <Button
                        variant={alertFilter === 'yellow' ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setAlertFilter(alertFilter === 'yellow' ? null : 'yellow');
                          setPrice3AlertFilter(null);
                          setCurrentPage(1);
                          setExpandedId(null);
                        }}
                        className={alertFilter === 'yellow' ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "border-yellow-500 text-yellow-600"}
                      >
                        🟡 Báo động vàng
                      </Button>
                      <Button
                        variant={alertFilter === 'green' ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setAlertFilter(alertFilter === 'green' ? null : 'green');
                          setPrice3AlertFilter(null);
                          setCurrentPage(1);
                          setExpandedId(null);
                        }}
                        className={alertFilter === 'green' ? "bg-green-600 hover:bg-green-700 text-white" : "border-green-600 text-green-600"}
                      >
                        🟢 Báo động xanh
                      </Button>
                      <Button
                        variant={alertFilter === 'black' ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setAlertFilter(alertFilter === 'black' ? null : 'black');
                          setPrice3AlertFilter(null);
                          setCurrentPage(1);
                          setExpandedId(null);
                        }}
                        className={alertFilter === 'black' ? "bg-black hover:bg-gray-900 text-white" : "border-black text-black"}
                      >
                        ⚫ Báo động đen
                      </Button>
                      <Button
                        variant={alertFilter === 'pink' ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setAlertFilter(alertFilter === 'pink' ? null : 'pink');
                          setPrice3AlertFilter(null);
                          setCurrentPage(1);
                          setExpandedId(null);
                        }}
                        className={alertFilter === 'pink' ? "bg-pink-600 hover:bg-pink-700 text-white" : "border-pink-600 text-pink-600"}
                      >
                        ♦️ Báo động hồng
                      </Button>
                      <Button
                        variant={onlyWithPrice2 ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setOnlyWithPrice2((v) => !v);
                          setPrice3AlertFilter(null);
                          setCurrentPage(1);
                          setExpandedId(null);
                        }}
                        className={onlyWithPrice2 ? "bg-slate-600 hover:bg-slate-700 text-white" : "border-slate-500 text-slate-600"}
                        title="Chỉ hiển thị các coin có Giá (2) – RSI 45–55 tại 5 nến 30m gần nhất"
                      >
                        Báo động RSI
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {PRICE3_ALERT_RANGES.map(({ key, label }) => (
                        <Button
                          key={key}
                          variant={price3AlertFilter === key ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setPrice3AlertFilter(price3AlertFilter === key ? null : key);
                            setAlertFilter(null);
                            setOnlyWithPrice2(false);
                            setCurrentPage(1);
                            setExpandedId(null);
                          }}
                          className={price3AlertFilter === key ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-amber-500 text-amber-600"}
                          title={`Giá (3) trong khoảng ${PRICE3_ALERT_RANGES.find((r) => r.key === key)?.min}-${PRICE3_ALERT_RANGES.find((r) => r.key === key)?.max}`}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>🔴 <strong>Báo động đỏ:</strong> RSI 85-100 và Funding Rate ≥ 0.05% (0.0005)</div>
                      <div>🟡 <strong>Báo động vàng:</strong> RSI 75-79 và Funding Rate ≥ 0.05% (0.0005)</div>
                      <div>🟢 <strong>Báo động xanh:</strong> RSI ≥ 70 và Funding Rate ≥ 0.05% (0.0005)</div>
                      <div>⚫ <strong>Báo động đen:</strong> RSI ≥ 70 và Funding Rate = 0.005% hoặc 0.01%</div>
                      <div>♦️ <strong>Báo động hồng:</strong> (1) Nến đỏ (2) Đã vượt Band vàng (3) Giá dưới Band vàng (4) RSI 70-79 (5) Funding Rate ≥ 0.05%</div>
                      <div><strong>Báo động RSI:</strong> Chỉ hiển thị coin có Giá (2) + Funding 0.005%–2%</div>
                      <div><strong>Báo động 300–2100:</strong> Giá (3) trong khoảng tương ứng + Funding 0.005%–2%</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center whitespace-nowrap w-16">STT</TableHead>
                        <TableHead className="whitespace-nowrap">Thời gian</TableHead>
                        <TableHead className="text-right whitespace-nowrap">
                          <span className="hidden sm:inline">Số cặp</span>
                          <span className="sm:hidden">Cặp</span>
                          {(alertFilter !== null || onlyWithPrice2 || price3AlertFilter) && (
                            <span className="ml-1 text-xs">
                              {alertFilter === 'red' ? '(🔴 Đỏ)' 
                                : alertFilter === 'yellow' ? '(🟡 Vàng)' 
                                : alertFilter === 'green' ? '(🟢 Xanh)'
                                : alertFilter === 'black' ? '(⚫ Đen)'
                                : alertFilter === 'pink' ? '(♦️ Hồng)'
                                : ''}
                              {onlyWithPrice2 && (alertFilter !== null ? ' · Báo động RSI' : 'Báo động RSI')}
                              {price3AlertFilter && (alertFilter !== null || onlyWithPrice2 ? ' · ' : '') + (PRICE3_ALERT_RANGES.find((r) => r.key === price3AlertFilter)?.label ?? price3AlertFilter)}
                            </span>
                          )}
                        </TableHead>
                        <TableHead className="text-center whitespace-nowrap">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedHistory.map((item, index) => (
                        <Fragment key={item.id}>
                          <TableRow
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleExpand(item.id!)}
                          >
                            <TableCell className="text-center font-medium">
                              {startIndex + index + 1}
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.scan_time}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col sm:block">
                                {alertFilter === null ? (
                                  <span>{item.coins_data.length}</span>
                                ) : item.filtered_coins.length > 0 ? (
                                  <>
                                    <span>{item.filtered_coins.length}</span>
                                    <span className="ml-1 text-xs text-muted-foreground block sm:inline">
                                      ({alertFilter === 'red' ? '🔴 Đỏ' 
                                        : alertFilter === 'yellow' ? '🟡 Vàng' 
                                        : alertFilter === 'green' ? '🟢 Xanh'
                                        : alertFilter === 'black' ? '⚫ Đen'
                                        : '♦️ Hồng'})
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(item.id!);
                                  }}
                                >
                                  {expandedId === item.id ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(item.id!);
                                  }}
                                  disabled={deletingId === item.id}
                                >
                                  {deletingId === item.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {expandedId === item.id && currentHistory && (
                            <TableRow>
                              <TableCell colSpan={5} className="p-0">
                                <div className="p-4 bg-muted/30">
                                  <h3 className="font-semibold mb-3">
                                    <span className="block sm:inline">Chi tiết lần quét</span>
                                    {alertFilter !== null && (
                                      <span className="block sm:inline sm:ml-2 text-sm text-muted-foreground">
                                        ({alertFilter === 'red' ? '🔴 Báo động đỏ' 
                                          : alertFilter === 'yellow' ? '🟡 Báo động vàng' 
                                          : alertFilter === 'green' ? '🟢 Báo động xanh'
                                          : alertFilter === 'black' ? '⚫ Báo động đen'
                                          : '♦️ Báo động hồng'}: {currentHistory.filtered_coins.length} cặp)
                                      </span>
                                    )}
                                  </h3>
                                  <div className="rounded-md border overflow-x-auto max-h-[600px] overflow-y-auto -mx-4 sm:mx-0">
                                    <Table className="min-w-full text-xs">
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="whitespace-nowrap px-1 text-[14px] w-10">ID</TableHead>
                                          <TableHead className="whitespace-nowrap px-1 text-[14px]  w-10">Symbol</TableHead>
                                          <TableHead className="text-right whitespace-nowrap px-1 text-[14px] w-20">RSI (14)</TableHead>
                                          <TableHead className="text-right whitespace-nowrap px-1 text-[14px] w-20">Funding</TableHead>
                                          <TableHead className="text-right whitespace-nowrap px-1 text-[14px] w-10">Giá (USDT)</TableHead>
                                          <TableHead className="text-right whitespace-nowrap px-1 text-[14px] w-20">Giá (2)</TableHead>
                                          <TableHead className="text-right whitespace-nowrap px-1 text-[14px] w-20">Giá (3)</TableHead>
                                          <TableHead className="text-right whitespace-nowrap px-1 text-[14px] w-20">Nến</TableHead>
                                          <TableHead className="whitespace-nowrap px-1 text-[14px] w-20">Time</TableHead>
                                          <TableHead className="whitespace-nowrap px-1 text-[14px] w-24">Ngày</TableHead>
                                          <TableHead className="text-right whitespace-nowrap px-1 text-[14px] w-auto">Action</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {currentHistory.filtered_coins.map((coin: SimpleCoinData, index: number) => {
                                          const { date, time } = parseScanTime(currentHistory.scan_time);
                                          const alertStatus = getAlertStatus(coin);
                                          const hasPrice3Alert = getPrice3AlertRange(coin.price3) !== null;
                                          const rowClassName = alertStatus === 'red' 
                                            ? 'bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500' 
                                            : alertStatus === 'yellow' 
                                            ? 'bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-l-yellow-500'
                                            : alertStatus === 'green'
                                            ? 'bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500'
                                            : alertStatus === 'black'
                                            ? 'bg-black/5 dark:bg-black/30 border-l-4 border-l-black'
                                            : alertStatus === 'pink'
                                            ? 'bg-pink-50 dark:bg-pink-950/20 border-l-4 border-l-pink-500'
                                            : hasPrice3Alert
                                            ? 'bg-amber-50 dark:bg-amber-950/20 border-l-4 border-l-amber-500'
                                            : '';
                                          
                                          return (
                                            <TableRow key={coin.symbol} className={rowClassName}>
                                              <TableCell className="font-medium px-1 text-[15px]">
                                                {index + 1}
                                              </TableCell>
                                              <TableCell className="font-medium px-1 text-[15px] w-10 truncate" title={coin.symbol}>
                                                {coin.symbol}
                                              </TableCell>
                                              <TableCell className="text-right px-1">
                                                <span
                                                  className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[15px] font-medium ${getRSIBadge(
                                                    coin.rsi
                                                  )}`}
                                                >
                                                  <span className={getRSIColor(coin.rsi)}>
                                                    {coin.rsi.toFixed(2)}
                                                  </span>
                                                </span>
                                              </TableCell>
                                              <TableCell className="text-right px-1 text-[15px]">
                                                {coin.fundingRate !== undefined ? (
                                                  <span className={coin.fundingRate >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                                    {(coin.fundingRate * 100).toFixed(4)}%
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex text-muted-foreground/50" title="Không có">
                                                    <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                                                  </span>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-right px-1 text-[15px]">
                                                ${formatPrice(coin.price)}
                                              </TableCell>
                                              <TableCell className="text-right px-1 text-[15px]">
                                                {coin.price2 !== undefined ? (
                                                  <span className="text-muted-foreground">${formatPrice(coin.price2)}</span>
                                                ) : (
                                                  <span className="inline-flex text-muted-foreground/50 text-2xl" title="Không có Giá (2)">
                                                    ⊘
                                                  </span>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-right px-1 text-[15px]">
                                                {coin.price3 !== undefined ? (
                                                  <span className="text-muted-foreground tabular-nums">{coin.price3.toLocaleString()}</span>
                                                ) : (
                                                  <span className="inline-flex text-muted-foreground/50 text-2xl" title="Không có Giá (3)">
                                                    ⊘
                                                  </span>
                                                )}
                                              </TableCell>
                                              <TableCell
                                                className={`text-right px-1 text-[15px] font-medium ${
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
                                                          <TrendingUp className="h-3 w-3" />
                                                        ) : (
                                                          <TrendingDown className="h-3 w-3" />
                                                        )}
                                                        {normalizedDiff >= 0 ? "+" : ""}
                                                        {normalizedDiff.toFixed(2)}%
                                                      </div>
                                                    );
                                                  })()
                                                ) : (
                                                <span className="inline-flex text-muted-foreground/50 text-2xl" title="Không có Giá (3)">
                                                  ⊘
                                                </span>
                                                )}
                                              </TableCell>
                                              <TableCell className="whitespace-nowrap px-1 text-[15px]">
                                                {time}
                                              </TableCell>
                                              <TableCell className="whitespace-nowrap px-1 text-[15px]">
                                                {date}
                                              </TableCell>
                                              <TableCell className="text-right px-1 text-[15px]">
                                                <Button variant="ghost" size="sm">
                                                  {/* <Trash2 className="h-4 w-4 text-red-600" /> */}
                                                </Button>
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredHistory.length)} trong tổng số {filteredHistory.length} lần quét
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Trước
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className="min-w-[40px]"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Sau
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

