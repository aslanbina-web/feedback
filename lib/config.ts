function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const config = {
  get appUrl() {
    const value = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const url = new URL(value);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
      throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS in production");
    }
    return url.origin;
  },
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get lineChannelId() {
    return required("LINE_LOGIN_CHANNEL_ID");
  },
  get lineChannelSecret() {
    return required("LINE_LOGIN_CHANNEL_SECRET");
  },
  get officialAccountUrl() {
    return process.env.LINE_OFFICIAL_ACCOUNT_URL || "https://line.me";
  },
  get requiresOfficialAccountFriend() {
    return process.env.SIGNUP_REQUIRES_OA_FRIEND !== "false";
  },
  get sessionSecret() {
    const value = required("SESSION_SECRET");
    if (value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
    return value;
  },
};
