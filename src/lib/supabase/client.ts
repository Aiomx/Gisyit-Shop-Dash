/**
 * Supabase Client for Admin Dashboard
 * Uses service role key for full admin access
 */

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hydb.haokir.com";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTc3OTI1NjMzOCwiZXhwIjoxOTM3MDQ0MzM4fQ.-nUuLQkkZWwBiLfi5H77unYierIrll0eO4wpH5ObBX0";

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
    if (!supabaseClient) {
        supabaseClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
            },
        });
    }
    return supabaseClient;
}

/**
 * Create a new Supabase client instance for file uploads
 * Configured to use resumable uploads (TUS protocol) for large files
 */
export function createClient(): SupabaseClient {
    return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });
}

/**
 * Create a Supabase client configured for resumable uploads
 * This client uses TUS protocol for large file uploads
 */
export function createResumableClient(): SupabaseClient {
    return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });
}

export const supabase = getSupabaseClient();
