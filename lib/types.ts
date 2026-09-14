export type AppUser = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: "member" | "admin";
  credit_balance: number;
  daily_give_limit: number;
  daily_receive_limit: number;
  plan_expires_at: string;
  referral_code: string;
};

export type DiscoverBusiness = {
  assignment_id: string;
  id: string;
  category: string;
  city: string;
  district: string;
  generic_description: string;
  assigned_until: string;
};

export type QueueTask = {
  id: string;
  status: "accepted" | "submitted" | "completed" | "rejected" | "expired";
  accepted_at: string;
  expires_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  proof_url: string | null;
  business_name: string;
  business_category: string;
  business_city: string;
  business_district: string;
  review_url_snapshot: string;
  sample_review_text: string | null;
};

export type HistoryData = {
  given: QueueTask[];
  received: QueueTask[];
};

export type DailyStats = {
  gives: number;
  receives: number;
  giveAllowance: number;
  receiveAllowance: number;
  skips: number;
  skipsRemaining: number;
};

export type MonthlyStats = {
  gives: number;
  receives: number;
};

export type AdminSubmission = {
  id: string;
  status: "submitted";
  submitted_at: string;
  proof_url: string;
  business_name: string;
  giver: { display_name: string };
};

export type AdminUser = {
  id: string;
  display_name: string;
  credit_balance: number;
  role: "member" | "admin";
  created_at: string;
};

export type AdminTaskReport = {
  id: string;
  reason: "review_missing" | "wrong_business" | "other";
  details: string | null;
  created_at: string;
  task: { business_name: string };
  reporter: { display_name: string };
};
