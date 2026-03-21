import { createClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

logger.info("🔌 Initializing Supabase Client...");

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn(
    "⚠️ Supabase URL or Anon Key is missing. Please check your .env file. Ensure variables start with VITE_",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      logger.info("🔄 Document visible: triggering token refresh/check...");
      supabase.auth.getSession();
    }
  });
}
