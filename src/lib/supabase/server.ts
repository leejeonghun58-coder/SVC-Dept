import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { parsePublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const env = parsePublicEnv(process.env);

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot write cookies. src/proxy.ts refreshes them.
          }
        },
      },
    },
  );
}
