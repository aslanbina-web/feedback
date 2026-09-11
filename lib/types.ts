export type AppUser = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: "member" | "admin";
  credit_balance: number;
  daily_give_limit: number;
  daily_receive_limit: number;
};

export type DiscoverBusiness = {
  id: string;
  category: string;
  city: string;
  district: string;
  generic_description: string;
};

export type QueueTask = {
  id: string;
  status: "accepted" | "submitted" | "completed" | "rejected" | "expired";
  accepted_at: string;
  submitted_at: string | null;
  completed_at: string | null;
  proof_url: string | null;
  business_name: string;
  business_category: string;
  business_city: string;
  business_district: string;
  review_url_snapshot: string;
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
