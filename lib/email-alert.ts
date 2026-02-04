/**
 * Helper function to check alerts and send email notification
 * Can be called from both API route and server action
 */
import type { CoinRSI } from '@/lib/binance';
import { getAlertStatus, getPrice3AlertRange } from '@/lib/alerts';
import { sendAlertNotification } from './email';

const TIMEZONE = "Asia/Ho_Chi_Minh";

const formatVietnamTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString("vi-VN", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

/** Điều kiện gửi email: Giá (3) trong khoảng 300-2100 + RSI >= 70 + Funding 0.005% - 2% */
function isPrice3FundingAlert(coin: CoinRSI): boolean {
  const price3Range = getPrice3AlertRange(coin.price3);
  if (!price3Range) return false;
  if (coin.rsi < 70) return false;
  const fr = coin.fundingRate ?? 0;
  return fr >= 0.00005 && fr <= 0.02; // 0.005% - 2%
}

export type AlertStatusForEmail = 'red' | 'yellow' | 'green' | 'pink' | 'black' | 'price3_funding';

export async function checkAndSendAlertEmail(coins: CoinRSI[]): Promise<{
  sent: boolean;
  alertCount: number;
  error?: string;
}> {
  try {
    // Check for alerts on all coins (red, yellow, green, pink, black)
    const alertCoins: Array<CoinRSI & { alertStatus: AlertStatusForEmail }> = [];
    for (const coin of coins) {
      const alertStatus = getAlertStatus(coin);
      if (alertStatus) {
        alertCoins.push({ ...coin, alertStatus });
      }
      // Thêm điều kiện gửi email: báo động Giá (3) (100-2100) + RSI >= 70 + Funding 0.005%-2%
      if (isPrice3FundingAlert(coin)) {
        alertCoins.push({ ...coin, alertStatus: 'price3_funding' });
      }
    }

    if (alertCoins.length === 0) {
      console.log(`[Email Alert] ℹ️ No alerts found, skipping email notification`);
      return { sent: false, alertCount: 0 };
    }

    const price3Count = alertCoins.filter((c) => c.alertStatus === 'price3_funding').length;
    if (price3Count > 0) {
      console.log(`[Email Alert] 🟠 Báo động Giá (3): ${price3Count} coin`);
    }
    console.log(`[Email Alert] 🔔 Found ${alertCoins.length} coins with alerts, sending email notification...`);
    const scanTime = formatVietnamTime(Date.now());
    
    const emailResult = await sendAlertNotification({
      alertCoins,
      scanTime,
    });

    if (emailResult.success) {
      console.log(`[Email Alert] ✅ Email notification sent successfully: ${emailResult.messageId}`);
      return { sent: true, alertCount: alertCoins.length };
    } else {
      console.error(`[Email Alert] ❌ Failed to send email notification: ${emailResult.error}`);
      return { sent: false, alertCount: alertCoins.length, error: emailResult.error };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Email Alert] ❌ Error checking/sending alert email:`, error);
    return { sent: false, alertCount: 0, error: errorMessage };
  }
}

