import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createAuthHelpersClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Client-side Supabase client for use in Client Components.
 */
export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Server-side Supabase client for use in Server Components and Route Handlers.
 * Uses @supabase/auth-helpers-nextjs for cookie-based session management.
 */
export function createServerClient() {
  const cookieStore = cookies();
  return createAuthHelpersClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options: any) {
        cookieStore.set(name, "", { ...options, maxAge: 0 });
      },
    },
  });
}
