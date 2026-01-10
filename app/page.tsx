"use client";

import { useState, useTransition, useEffect } from "react";
import { scanRSI, scanBTCRSI, scanFunding } from "@/app/actions/binance";
import { saveScanHistory, deleteOldHistory } from "@/app/actions/history";
import type { CoinRSI } from "@/lib/binance";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, History } from "lucide-react";
import Link from "next/link";

// Components
import { TabSelector } from "@/components/scan/TabSelector";
import { RSIFilterPanel } from "@/components/scan/RSIFilterPanel";
import { RSIScanResults } from "@/components/scan/RSIScanResults";
import { FundingScanResults } from "@/components/scan/FundingScanResults";
import { BTCScanResult } from "@/components/scan/BTCScanResult";

// Constants and utilities
import {
  RATE_LIMIT_KEY,
  RATE_LIMIT_MS,
  FUNDING_RATE_LIMIT_KEY,
  FUNDING_RATE_LIMIT_MS,
  SCAN_DATA_KEY,
  FUNDING_SCAN_DATA_KEY,
} from "@/constants/scan";
import { formatVietnamTime } from "@/lib/formatters";
import { applyFilters } from "@/lib/filter-utils";

export default function Home() {
  const [coins, setCoins] = useState<CoinRSI[]>([]);
  const [filteredCoins, setFilteredCoins] = useState<CoinRSI[]>([]);
  const [selectedRSI, setSelectedRSI] = useState<string | null>(null);
  const [alertFilter, setAlertFilter] = useState<'red' | 'yellow' | 'green' | null>(null);
  const [isPending, startTransition] = useTransition();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [fundingTimeRemaining, setFundingTimeRemaining] = useState<number>(0);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [btcCoin, setBtcCoin] = useState<CoinRSI | null>(null);
  const [btcScanTime, setBtcScanTime] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scanDuration, setScanDuration] = useState<number | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [fundingCoins, setFundingCoins] = useState<CoinRSI[]>([]);
  const [fundingScanTime, setFundingScanTime] = useState<string | null>(null);
  const [fundingScanDuration, setFundingScanDuration] = useState<number | null>(null);
  const [fundingCurrentPage, setFundingCurrentPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'rsi' | 'funding'>('rsi');

  const copySymbol = async (symbol: string) => {
    try {
      await navigator.clipboard.writeText(symbol);
      console.log(`Copied: ${symbol}`);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Load saved scan data from sessionStorage on mount (tự động xóa khi tắt browser)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Load saved coins data from sessionStorage (tự động xóa khi đóng tab/browser)
    const savedData = sessionStorage.getItem(SCAN_DATA_KEY);
    if (savedData) {
      try {
        type SavedCoinData = {
          symbol: string;
          rsi: number;
          price: number;
          fundingRate?: number;
          priceDifference?: number;
        };
        
        type SavedScanData = {
          coins: SavedCoinData[];
          filteredCoins?: SavedCoinData[];
          selectedRSI?: string;
          lastScanTime?: string;
          scanDuration?: number;
        };
        
        const parsed = JSON.parse(savedData) as SavedScanData;
        if (parsed.coins && Array.isArray(parsed.coins) && parsed.coins.length > 0) {
          // Convert minimal data back to CoinRSI format
          const restoredCoins: CoinRSI[] = parsed.coins.map((c: SavedCoinData) => ({
            symbol: c.symbol,
            rsi: c.rsi,
            price: c.price,
            change24h: 0, // Không lưu change24h để giảm dung lượng
            fundingRate: c.fundingRate,
            priceDifference: c.priceDifference,
          }));
          const restoredFiltered: CoinRSI[] = (parsed.filteredCoins || []).map((c: SavedCoinData) => ({
            symbol: c.symbol,
            rsi: c.rsi,
            price: c.price,
            change24h: 0,
            fundingRate: c.fundingRate,
            priceDifference: c.priceDifference,
          }));
          
          setCoins(restoredCoins);
          setFilteredCoins(restoredFiltered.length > 0 ? restoredFiltered : restoredCoins.filter((c) => c.rsi >= 70 && c.rsi <= 100));
          setSelectedRSI(parsed.selectedRSI || ">=70");
          setLastScanTime(parsed.lastScanTime || null);
          setScanDuration(parsed.scanDuration || null);
        }
      } catch (e) {
        console.error("Error loading saved scan data:", e);
      }
    }

    // Load saved funding scan data from sessionStorage
    const savedFundingData = sessionStorage.getItem(FUNDING_SCAN_DATA_KEY);
    if (savedFundingData) {
      try {
        type SavedFundingCoinData = {
          symbol: string;
          price: number;
          fundingRate: number;
          change24h: number;
        };
        
        type SavedFundingScanData = {
          coins: SavedFundingCoinData[];
          lastScanTime?: string;
          scanDuration?: number;
          activeTab?: 'rsi' | 'funding';
        };
        
        const parsed = JSON.parse(savedFundingData) as SavedFundingScanData;
        if (parsed.coins && Array.isArray(parsed.coins) && parsed.coins.length > 0) {
          // Convert minimal data back to CoinRSI format
          const restoredFundingCoins: CoinRSI[] = parsed.coins.map((c: SavedFundingCoinData) => ({
            symbol: c.symbol,
            rsi: 0, // Not calculated for funding scan
            price: c.price,
            change24h: c.change24h,
            fundingRate: c.fundingRate,
          }));
          
          setFundingCoins(restoredFundingCoins);
          setFundingScanTime(parsed.lastScanTime || null);
          setFundingScanDuration(parsed.scanDuration || null);
          
          // Restore active tab if available, otherwise default to funding if only funding data exists
          if (parsed.activeTab) {
            setActiveTab(parsed.activeTab);
          } else if (!savedData) {
            // If no RSI data, switch to funding tab
            setActiveTab('funding');
          }
        }
      } catch (e) {
        console.error("Error loading saved funding scan data:", e);
      }
    }
    
    // Determine which tab should be active based on available data
    // (Only if activeTab wasn't already set from saved data)
    if (savedData && savedFundingData) {
      try {
        const rsiData = JSON.parse(savedData);
        const fundingData = JSON.parse(savedFundingData);
        const hasRSIData = rsiData.coins?.length > 0;
        const hasFundingData = fundingData.coins?.length > 0;
        
        // If both exist, keep default 'rsi', otherwise switch to the one that exists
        if (hasFundingData && !hasRSIData) {
          setActiveTab('funding');
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Rate limit check for RSI scan
  useEffect(() => {
    const checkRateLimit = () => {
      if (typeof window === "undefined") return;
      
      const lastTime = localStorage.getItem(RATE_LIMIT_KEY);
      if (lastTime) {
        const elapsed = Date.now() - parseInt(lastTime, 10);
        const remaining = Math.max(0, RATE_LIMIT_MS - elapsed);
        setTimeRemaining(remaining);
      }
    };

    checkRateLimit();
    const interval = setInterval(checkRateLimit, 1000);
    return () => clearInterval(interval);
  }, []);

  // Rate limit check for Funding scan
  useEffect(() => {
    const checkFundingRateLimit = () => {
      if (typeof window === "undefined") return;
      
      const lastTime = localStorage.getItem(FUNDING_RATE_LIMIT_KEY);
      if (lastTime) {
        const elapsed = Date.now() - parseInt(lastTime, 10);
        const remaining = Math.max(0, FUNDING_RATE_LIMIT_MS - elapsed);
        setFundingTimeRemaining(remaining);
      }
    };

    checkFundingRateLimit();
    const interval = setInterval(checkFundingRateLimit, 1000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for RSI scan
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining((prev) => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining]);

  // Countdown timer for Funding scan
  useEffect(() => {
    if (fundingTimeRemaining > 0) {
      const timer = setTimeout(() => {
        setFundingTimeRemaining((prev) => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [fundingTimeRemaining]);

  const updateFilteredCoins = (filtered: CoinRSI[]) => {
    setFilteredCoins(filtered);
    
    // Ensure currentPage doesn't exceed total pages after filtering
    const ITEMS_PER_PAGE = 20;
    const newTotalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    if (newTotalPages > 0 && currentPage > newTotalPages) {
      setCurrentPage(1);
    }
    
    // Update saved data when filter changes (chỉ update filter, không update toàn bộ data)
    if (typeof window !== "undefined" && coins.length > 0) {
      try {
        const savedData = sessionStorage.getItem(SCAN_DATA_KEY);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          // Chỉ update filteredCoins và selectedRSI, giữ nguyên coins
          const minimalFiltered = filtered.map((coin) => ({
            symbol: coin.symbol,
            rsi: coin.rsi,
            price: coin.price,
            fundingRate: coin.fundingRate,
            priceDifference: coin.priceDifference,
          }));
          sessionStorage.setItem(SCAN_DATA_KEY, JSON.stringify({
            ...parsed,
            filteredCoins: minimalFiltered,
            selectedRSI: selectedRSI,
          }));
        }
      } catch (e) {
        console.error("Error updating saved scan data:", e);
      }
    }
  };

  const handleRSIButtonClick = (filterKey: string) => {
    setSelectedRSI(filterKey);
    setCurrentPage(1); // Reset to first page when filter changes
    if (coins.length > 0) {
      const filtered = applyFilters(coins, filterKey, alertFilter);
      updateFilteredCoins(filtered);
    }
  };

  const handleAlertFilterChange = (newFilter: 'red' | 'yellow' | 'green' | null, filteredCoins: CoinRSI[]) => {
    setAlertFilter(newFilter);
    updateFilteredCoins(filteredCoins);
    setCurrentPage(1);
  };

  const handleScan = () => {
    if (timeRemaining > 0 || isPending) return;

    if (typeof window !== "undefined") {
      const now = Date.now();
      localStorage.setItem(RATE_LIMIT_KEY, now.toString());
      setTimeRemaining(RATE_LIMIT_MS);
    }

    const startTime = Date.now();
    setScanDuration(null);

    startTransition(async () => {
      const result = await scanRSI();
      const duration = Date.now() - startTime;
      setScanDuration(duration);
      
      setCoins(result.coins);
      setCurrentPage(1);
      const scanTime = formatVietnamTime(Date.now());
      setLastScanTime(scanTime);
      
      setSelectedRSI(">=70");
      setAlertFilter(null); // Reset alert filter when scanning new data
      
      // Auto switch to RSI tab when scan completes
      setActiveTab('rsi');
      
      const filtered = applyFilters(result.coins, ">=70", null);
      setFilteredCoins(filtered);
      
      // Save scan data to sessionStorage (tự động xóa khi tắt browser)
      // Chỉ lưu data cần thiết để giảm dung lượng
      // Xóa data cũ trước khi lưu data mới
      if (typeof window !== "undefined") {
        try {
          // Xóa data cũ trước
          sessionStorage.removeItem(SCAN_DATA_KEY);
          
          // Chỉ lưu các field cần thiết: symbol, rsi, price, fundingRate, priceDifference
          const minimalCoins = result.coins.map((coin) => ({
            symbol: coin.symbol,
            rsi: coin.rsi,
            price: coin.price,
            fundingRate: coin.fundingRate,
            priceDifference: coin.priceDifference,
          }));
          const minimalFiltered = filtered.map((coin) => ({
            symbol: coin.symbol,
            rsi: coin.rsi,
            price: coin.price,
            fundingRate: coin.fundingRate,
            priceDifference: coin.priceDifference,
          }));
          
          // Lưu data mới (ghi đè lên data cũ nếu có)
          sessionStorage.setItem(SCAN_DATA_KEY, JSON.stringify({
            coins: minimalCoins,
            filteredCoins: minimalFiltered,
            selectedRSI: ">=70",
            lastScanTime: scanTime,
            scanDuration: duration,
          }));
        } catch (e) {
          console.error("Error saving scan data to sessionStorage:", e);
          // Nếu data quá lớn, thử xóa và lưu lại
          try {
            sessionStorage.removeItem(SCAN_DATA_KEY);
            const minimalCoins = result.coins.slice(0, 100).map((coin) => ({
              symbol: coin.symbol,
              rsi: coin.rsi,
              price: coin.price,
              fundingRate: coin.fundingRate,
              priceDifference: coin.priceDifference,
            }));
            const minimalFiltered = filtered.slice(0, 100).map((coin) => ({
              symbol: coin.symbol,
              rsi: coin.rsi,
              price: coin.price,
              fundingRate: coin.fundingRate,
              priceDifference: coin.priceDifference,
            }));
            sessionStorage.setItem(SCAN_DATA_KEY, JSON.stringify({
              coins: minimalCoins,
              filteredCoins: minimalFiltered,
              selectedRSI: ">=70",
              lastScanTime: scanTime,
            }));
          } catch (e2) {
            console.error("Error saving minimal scan data:", e2);
          }
        }
      }
      
      // Save to history - only coins with RSI >= 70, only symbol, rsi, price, fundingRate, priceDifference
      const coinsToSave = filtered.map((coin) => ({
        symbol: coin.symbol,
        rsi: coin.rsi,
        price: coin.price,
        fundingRate: coin.fundingRate,
        priceDifference: coin.priceDifference,
      }));
      
      await saveScanHistory({
        scan_time: scanTime,
        coins_data: coinsToSave,
      });

      // Delete old history entries (older than 2 hours)
      await deleteOldHistory();
    });
  };

  const handleScanBTC = () => {
    if (isPending) return;

    startTransition(async () => {
      const result = await scanBTCRSI();
      if (result) {
        setBtcCoin(result.coin);
        setBtcScanTime(formatVietnamTime(Date.now()));
      } else {
        setBtcCoin(null);
        setBtcScanTime(null);
      }
    });
  };

  const handleScanFunding = () => {
    if (fundingTimeRemaining > 0 || isPending) return;

    if (typeof window !== "undefined") {
      const now = Date.now();
      localStorage.setItem(FUNDING_RATE_LIMIT_KEY, now.toString());
      setFundingTimeRemaining(FUNDING_RATE_LIMIT_MS);
    }

    const startTime = Date.now();
    setFundingScanDuration(null);

    startTransition(async () => {
      const result = await scanFunding();
      const duration = Date.now() - startTime;
      setFundingScanDuration(duration);
      
      setFundingCoins(result.coins);
      setFundingCurrentPage(1);
      const scanTime = formatVietnamTime(Date.now());
      setFundingScanTime(scanTime);
      
      // Auto switch to funding tab when scan completes
      setActiveTab('funding');

      // Save funding scan data to sessionStorage (tự động xóa khi tắt browser)
      if (typeof window !== "undefined") {
        try {
          // Xóa data cũ trước
          sessionStorage.removeItem(FUNDING_SCAN_DATA_KEY);
          
          // Chỉ lưu các field cần thiết: symbol, price, fundingRate, change24h
          const minimalFundingCoins = result.coins.map((coin) => ({
            symbol: coin.symbol,
            price: coin.price,
            fundingRate: coin.fundingRate ?? 0,
            change24h: coin.change24h,
          }));
          
          // Lưu data mới
          sessionStorage.setItem(FUNDING_SCAN_DATA_KEY, JSON.stringify({
            coins: minimalFundingCoins,
            lastScanTime: scanTime,
            scanDuration: duration,
            activeTab: 'funding',
          }));
        } catch (e) {
          console.error("Error saving funding scan data to sessionStorage:", e);
          // Nếu data quá lớn, thử xóa và lưu lại với ít data hơn
          try {
            sessionStorage.removeItem(FUNDING_SCAN_DATA_KEY);
            const minimalFundingCoins = result.coins.slice(0, 100).map((coin) => ({
              symbol: coin.symbol,
              price: coin.price,
              fundingRate: coin.fundingRate ?? 0,
              change24h: coin.change24h,
            }));
            sessionStorage.setItem(FUNDING_SCAN_DATA_KEY, JSON.stringify({
              coins: minimalFundingCoins,
              lastScanTime: scanTime,
              activeTab: 'funding',
            }));
          } catch (e2) {
            console.error("Error saving minimal funding scan data:", e2);
          }
        }
      }
    });
  };

  const canScan = timeRemaining === 0 && !isPending;
  const secondsRemaining = Math.ceil(timeRemaining / 1000);
  const canScanFunding = fundingTimeRemaining === 0 && !isPending;
  const fundingSecondsRemaining = Math.ceil(fundingTimeRemaining / 1000);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Binance Futures RSI Screener</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Quét RSI khung 30 phút cho các cặp Binance Futures USDT Perpetual (200 nến)
          </p>
          </div>
          <Link href="/history">
            <Button variant="outline">
              <History className="mr-2 h-4 w-4" />
              Lịch sử
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex gap-2">
              <Button onClick={handleScan} disabled={!canScan} className="flex-1">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang quét...
                  </>
                ) : timeRemaining > 0 ? (
                  `Chờ ${secondsRemaining}s`
                ) : (
                  "Quét RSI"
                )}
              </Button>
              <Button
                onClick={handleScanFunding}
                disabled={!canScanFunding}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang quét...
                  </>
                ) : fundingTimeRemaining > 0 ? (
                  `Chờ ${fundingSecondsRemaining}s`
                ) : (
                  "Quét Funding"
                )}
              </Button>
              <Button
                onClick={handleScanBTC}
                disabled={isPending}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang quét...
                  </>
                ) : (
                  "RSI BTC"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <RSIFilterPanel
          selectedRSI={selectedRSI}
          expandedCategory={expandedCategory}
          isPending={isPending}
          onCategoryToggle={setExpandedCategory}
          onFilterClick={handleRSIButtonClick}
        />

        <TabSelector
          activeTab={activeTab}
          onTabChange={setActiveTab}
          rsiCount={filteredCoins.length}
          rsiTotal={coins.length}
          fundingCount={fundingCoins.length}
        />

        {/* RSI Results */}
        {activeTab === 'rsi' && (filteredCoins.length > 0 || (alertFilter !== null && coins.length > 0)) && (
          <RSIScanResults
            coins={coins}
            filteredCoins={filteredCoins}
            selectedRSI={selectedRSI}
            alertFilter={alertFilter}
            lastScanTime={lastScanTime}
            scanDuration={scanDuration}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onAlertFilterChange={handleAlertFilterChange}
            onCopySymbol={copySymbol}
          />
              )}

        {/* BTC Result */}
        {btcCoin && (
          <BTCScanResult
            coin={btcCoin}
            scanTime={btcScanTime}
            onCopySymbol={copySymbol}
          />
        )}

        {/* Funding Results */}
        {activeTab === 'funding' && fundingCoins.length > 0 && (
          <FundingScanResults
            coins={fundingCoins}
            fundingScanTime={fundingScanTime}
            fundingScanDuration={fundingScanDuration}
            currentPage={fundingCurrentPage}
            onPageChange={setFundingCurrentPage}
            onCopySymbol={copySymbol}
          />
        )}

        {!isPending && filteredCoins.length === 0 && coins.length === 0 && !btcCoin && fundingCoins.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nhấn &quot;Quét RSI&quot; hoặc &quot;Quét Funding&quot; để bắt đầu quét các cặp giao dịch
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
