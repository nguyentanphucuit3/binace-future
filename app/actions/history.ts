"use server";

import { supabaseAdmin } from "@/lib/supabase";

// Simplified coin data structure - only store what we need
export interface SimpleCoinData {
  symbol: string;
  rsi: number;
  price: number;
  fundingRate?: number;
  priceDifference?: number; // Hiệu số phần trăm: ((currentPrice - first1mPrice) / first1mPrice) * 100
  isShortSignal?: boolean; // Tín hiệu SHORT
  price2?: number; // Giá tại một trong 5 nến 30m gần nhất mà RSI 45-55
  price3?: number; // Chữ số sau dấu thập phân của |price2 - price|
}

export interface ScanHistory {
  id?: string;
  created_at?: string;
  scan_time: string;
  coins_data: SimpleCoinData[];
}

/**
 * Save scan history to Supabase
 * Only saves coins with RSI >= 70
 */
export async function saveScanHistory(data: Omit<ScanHistory, "id" | "created_at">): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[saveScanHistory] Attempting to save scan history: scan_time=${data.scan_time}, coins_count=${data.coins_data.length}`);
    
    // Check if we have service role key (for better error messages)
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!hasServiceKey) {
      console.error("[saveScanHistory] ❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY not found!");
      console.error("[saveScanHistory] This will likely cause insert to fail. Please set SUPABASE_SERVICE_ROLE_KEY in environment variables.");
      console.error("[saveScanHistory] Falling back to anon key (will likely fail due to RLS)");
    } else {
      console.log("[saveScanHistory] ✅ SUPABASE_SERVICE_ROLE_KEY is available");
    }
    
    const { data: insertData, error } = await supabaseAdmin
      .from("scan_history")
      .insert([
        {
          scan_time: data.scan_time,
          coins_data: data.coins_data,
        },
      ])
      .select();

    if (error) {
      console.error("[saveScanHistory] ❌ ERROR saving scan history:");
      console.error("[saveScanHistory] Error code:", error.code);
      console.error("[saveScanHistory] Error message:", error.message);
      console.error("[saveScanHistory] Error details:", JSON.stringify(error, null, 2));
      console.error("[saveScanHistory] Has Service Role Key:", hasServiceKey);
      console.error("[saveScanHistory] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Missing");
      
      // Provide helpful error message
      let helpfulError = error.message;
      if (error.code === '42501' || error.message.includes('row-level security')) {
        helpfulError = `RLS (Row Level Security) is enabled. Run: ALTER TABLE scan_history DISABLE ROW LEVEL SECURITY;`;
      } else if (!hasServiceKey) {
        helpfulError = `Missing SUPABASE_SERVICE_ROLE_KEY. Please set it in environment variables.`;
      }
      
      return { success: false, error: helpfulError };
    }

    console.log(`[saveScanHistory] Successfully saved scan history with ID: ${insertData?.[0]?.id || 'unknown'}`);
    return { success: true };
  } catch (error) {
    console.error("[saveScanHistory] Exception saving scan history:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Fetch scan history from Supabase
 * No limit - fetches all records
 */
export async function getScanHistory(): Promise<{ data: ScanHistory[] | null; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from("scan_history")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching scan history:", error);
      return { data: null, error: error.message };
    }

    return { data: data as ScanHistory[] };
  } catch (error) {
    console.error("Error fetching scan history:", error);
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Delete a scan history entry
 */
export async function deleteScanHistory(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("scan_history")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting scan history:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting scan history:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Delete scan history entries older than 48 hours
 */
export async function deleteOldHistory(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    // Calculate timestamp 48 hours ago
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    const fortyEightHoursAgoISO = fortyEightHoursAgo.toISOString();

    // First, get count of records to be deleted (for logging)
    const { data: oldRecords, error: selectError } = await supabaseAdmin
      .from("scan_history")
      .select("id")
      .lt("created_at", fortyEightHoursAgoISO);

    if (selectError) {
      console.error("Error querying old scan history:", selectError);
      return { success: false, error: selectError.message };
    }

    const deletedCount = oldRecords?.length || 0;

    if (deletedCount === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Delete records older than 48 hours
    const { error: deleteError } = await supabaseAdmin
      .from("scan_history")
      .delete()
      .lt("created_at", fortyEightHoursAgoISO);

    if (deleteError) {
      console.error("Error deleting old scan history:", deleteError);
      return { success: false, error: deleteError.message };
    }

    console.log(`Deleted ${deletedCount} old scan history entries (older than 48 hours)`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error("Error deleting old scan history:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

