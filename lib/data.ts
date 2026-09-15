import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { config } from "@/lib/config";
import type { AdminSubmission, AdminTaskReport, AdminUser, DailyStats, DiscoverBusiness, HistoryData, PlanStats, QueueTask } from "@/lib/types";

export async function expireOverdueTasks() {
  const { error } = await getSupabaseAdmin().rpc("expire_overdue_tasks" as never);
  if (error) throw error;
}

export async function getDiscoverFeed(userId: string) {
  const { data, error } = await getSupabaseAdmin().rpc("get_discover_feed", {
    p_giver_id: userId,
    p_limit: 3,
  });
  if (error) throw error;
  return (data ?? []) as DiscoverBusiness[];
}

export async function getAssignment(userId: string, assignmentId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("match_assignments" as never)
    .select("id,business_id,assigned_until,status,businesses!inner(category,city,district,generic_description)" as never)
    .eq("id" as never, assignmentId)
    .eq("giver_id" as never, userId)
    .eq("status" as never, "active")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as { id: string; business_id: string; assigned_until: string; businesses: { category: string; city: string; district: string; generic_description: string } };
  return { assignment_id: row.id, id: row.business_id, assigned_until: row.assigned_until, ...row.businesses } satisfies DiscoverBusiness;
}

export async function getQueue(userId: string) {
  const { data, error } = await getSupabaseAdmin().rpc("get_queue_tasks" as never, { p_user_id: userId } as never);
  if (error) throw error;
  return (data ?? []) as unknown as QueueTask[];
}

export async function getHistory(userId: string): Promise<HistoryData> {
  const columns = "id,status,accepted_at,expires_at,submitted_at,completed_at,proof_url,business_name,business_category,business_city,business_district,review_url_snapshot,sample_review_text";
  const [givenResult, receivedResult] = await Promise.all([
    getSupabaseAdmin()
      .from("tasks")
      .select(columns)
      .eq("giver_id", userId)
      .in("status", ["completed", "rejected", "expired"])
      .order("accepted_at", { ascending: false }),
    getSupabaseAdmin()
      .from("tasks")
      .select(`${columns},businesses!inner(owner_id)`)
      .eq("businesses.owner_id", userId)
      .in("status", ["completed", "rejected", "expired"])
      .order("accepted_at", { ascending: false }),
  ]);

  if (givenResult.error) throw givenResult.error;
  if (receivedResult.error) throw receivedResult.error;

  const received = (receivedResult.data ?? []).map((row) => {
    const { businesses: _business, ...task } = row;
    return task as unknown as QueueTask;
  });

  return {
    given: (givenResult.data ?? []) as unknown as QueueTask[],
    received,
  };
}

export async function getOwnedBusiness(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("businesses")
    .select("id,name,category,city,district,generic_description,review_url,active,business_review_samples(id,sample_text,created_at)")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDailyStats(userId: string): Promise<DailyStats> {
  const { data, error } = await getSupabaseAdmin().rpc("get_daily_stats", { p_user_id: userId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    gives: Number(row?.gives ?? 0),
    receives: Number(row?.receives ?? 0),
    giveAllowance: Number(row?.give_allowance ?? 0),
    receiveAllowance: Number(row?.receive_allowance ?? 0),
    skips: Number(row?.skips ?? 0),
    skipsRemaining: Number(row?.skips_remaining ?? 0),
  };
}

export async function getQueueTask(userId: string, taskId: string) {
  const { data, error } = await getSupabaseAdmin().rpc("get_queue_task" as never, { p_user_id: userId, p_task_id: taskId } as never);
  if (error) throw error;
  const rows = (data ?? []) as unknown as QueueTask[];
  return rows[0] ?? null;
}

export async function getPlanStats(userId: string): Promise<PlanStats> {
  const { data, error } = await getSupabaseAdmin().rpc("get_plan_stats" as never, { p_user_id: userId } as never);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  const stats = row as { gives?: number; receives?: number; give_limit?: number; receive_limit?: number; period_started_at?: string; period_ends_at?: string } | undefined;
  return {
    gives: Number(stats?.gives ?? 0),
    receives: Number(stats?.receives ?? 0),
    giveLimit: Number(stats?.give_limit ?? 30),
    receiveLimit: Number(stats?.receive_limit ?? 30),
    periodStartedAt: stats?.period_started_at ?? "",
    periodEndsAt: stats?.period_ends_at ?? "",
  };
}

export async function getOnboardingDestination(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("onboarding_tutorial_seen_at,onboarding_completed_at,oa_friend_verified_at,plan_activated_at")
    .eq("id", userId)
    .single();
  if (userError) throw userError;
  if (!user.onboarding_tutorial_seen_at) return "/onboarding";

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id,business_review_samples(id)")
    .eq("owner_id", userId)
    .maybeSingle();
  if (businessError) throw businessError;
  if (!business) return "/profile/edit?setup=1";
  if (config.requiresOfficialAccountFriend && !user.oa_friend_verified_at) return "/onboarding/line";
  if (!business.business_review_samples?.length) return "/samples?setup=1";

  if (!user.plan_activated_at) return "/onboarding/line";

  if (!user.onboarding_completed_at) {
    const { error: completeError } = await supabase
      .from("users")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", userId);
    if (completeError) throw completeError;
  }
  return "/discover";
}

export async function getReferralStats(userId: string) {
  const supabase = getSupabaseAdmin();
  const [rewardedResult, pendingResult, userResult] = await Promise.all([
    supabase.from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("inviter_id", userId).eq("reward_status", "rewarded"),
    supabase.from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("inviter_id", userId).eq("reward_status", "pending"),
    supabase.from("users").select("referral_reward_available_from").eq("id", userId).single(),
  ]);
  if (rewardedResult.error) throw rewardedResult.error;
  if (pendingResult.error) throw pendingResult.error;
  if (userResult.error) throw userResult.error;
  const availableFrom = userResult.data.referral_reward_available_from;
  return {
    rewarded: rewardedResult.count ?? 0,
    pending: pendingResult.count ?? 0,
    availableFrom,
    rewardAvailable: new Date(availableFrom).getTime() <= Date.now(),
  };
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

export async function getAdminTaskReports() {
  const { data, error } = await getSupabaseAdmin()
    .from("task_reports" as never)
    .select("id,reason,details,created_at,task:tasks!inner(business_name),reporter:users!task_reports_reporter_id_fkey(display_name)" as never)
    .eq("status" as never, "open")
    .order("created_at" as never, { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AdminTaskReport[];
}
