/**
 * Helper function to check alerts and send email notification
 * Can be called from both API route and server action
 */
import type { CoinRSI } from '@/lib/binance';
import { getAlertStatus } from '@/lib/alerts';
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

export async function checkAndSendAlertEmail(coins: CoinRSI[]): Promise<{
  sent: boolean;
  alertCount: number;
  error?: string;
}> {
  try {
    // Check for alerts on all coins
    const alertCoins: Array<CoinRSI & { alertStatus: 'red' | 'yellow' | 'green' | 'pink' | 'black' }> = [];
    for (const coin of coins) {
      const alertStatus = getAlertStatus(coin);
      if (alertStatus) {
        alertCoins.push({ ...coin, alertStatus });
      }
    }

    if (alertCoins.length === 0) {
      console.log(`[Email Alert] ℹ️ No alerts found, skipping email notification`);
      return { sent: false, alertCount: 0 };
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

