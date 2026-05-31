/**
 * Supabase Admin Client for Server-side Operations
 * Uses service role key for bypassing RLS
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hydb.haokir.com";
// Service role key for admin operations (bypasses RLS)
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let adminClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
    if (!adminClient) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY;

        if (!key) {
            throw new Error("supabaseKey is required. Please set SUPABASE_SERVICE_ROLE_KEY environment variable.");
        }

        adminClient = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
            },
        });
    }
    return adminClient;
}

// Lazy initialization - only create client when actually used
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        return Reflect.get(getAdminClient(), prop);
    },
});
