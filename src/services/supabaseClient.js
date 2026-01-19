import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// DEBUG LOGGING
console.log("🔌 Initializing Supabase Client...");
console.log("   URL:", supabaseUrl || "MISSING ❌");
console.log(
  "   KEY:",
  supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + "..." : "MISSING ❌",
);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase URL or Anon Key is missing. Please check your .env file. Ensure variables start with VITE_",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
