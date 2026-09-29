import { createBrowserClient } from "@supabase/ssr";

import { parsePublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export function createBrowserSupabaseClient() {
  const env = parsePublicEnv(process.env);

  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
