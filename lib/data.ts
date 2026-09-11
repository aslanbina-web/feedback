import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AdminSubmission, AdminUser, DiscoverBusiness, QueueTask } from "@/lib/types";

export async function getDiscoverFeed(userId: string) {
  const { data, error } = await getSupabaseAdmin().rpc("get_discover_feed", {
    p_giver_id: userId,
    p_limit: 20,
  });
  if (error) throw error;
  return (data ?? []) as DiscoverBusiness[];
}

export async function getQueue(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("tasks")
    .select("id,status,accepted_at,submitted_at,completed_at,proof_url,business_name,business_category,business_city,business_district,review_url_snapshot")
    .eq("giver_id", userId)
    .in("status", ["accepted", "submitted"])
    .order("accepted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as QueueTask[];
}

export async function getHistory(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("tasks")
    .select("id,status,accepted_at,submitted_at,completed_at,proof_url,business_name,business_category,business_city,business_district,review_url_snapshot")
    .eq("giver_id", userId)
    .in("status", ["completed", "rejected", "expired"])
    .order("accepted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as QueueTask[];
}

export async function getOwnedBusiness(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("businesses")
    .select("id,name,category,city,district,generic_description,review_url,active")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDailyStats(userId: string) {
  const { data, error } = await getSupabaseAdmin().rpc("get_daily_stats", { p_user_id: userId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { gives: Number(row?.gives ?? 0), receives: Number(row?.receives ?? 0) };
}

export async function getAdminSubmissions() {
  const { data, error } = await getSupabaseAdmin()
    .from("tasks")
    .select("id,status,submitted_at,proof_url,business_name,giver:users!tasks_giver_id_fkey(display_name)")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AdminSubmission[];
}

export async function getAdminUsers() {
  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .select("id,display_name,credit_balance,role,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as AdminUser[];
}
