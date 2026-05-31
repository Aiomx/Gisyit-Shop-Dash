/**
 * User Preferences Database Operations
 * 
 * Handles saving and loading user preferences from Supabase.
 * Falls back to local storage/cookies when user is not authenticated.
 */

import { supabase } from "./client";
import type { PreferenceValueMap } from "../preferences/preferences-config";

export interface UserPreferences {
  id: string;
  user_id: string;
  theme_mode: string;
  theme_preset: string;
  content_layout: string;
  navbar_style: string;
  sidebar_variant: string;
  sidebar_collapsible: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get user preferences from database
 */
export async function getUserPreferences(userId: string): Promise<Partial<PreferenceValueMap> | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    theme_mode: data.theme_mode,
    theme_preset: data.theme_preset,
    content_layout: data.content_layout,
    navbar_style: data.navbar_style,
    sidebar_variant: data.sidebar_variant,
    sidebar_collapsible: data.sidebar_collapsible,
  } as Partial<PreferenceValueMap>;
}

/**
 * Save user preferences to database
 */
export async function saveUserPreferences(
  userId: string,
  preferences: Partial<PreferenceValueMap>
): Promise<boolean> {
  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  return !error;
}

/**
 * Update a single preference for a user
 */
export async function updateUserPreference(
  userId: string,
  key: keyof PreferenceValueMap,
  value: string
): Promise<boolean> {
  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        [key]: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  return !error;
}

/**
 * Delete user preferences (for account deletion)
 */
export async function deleteUserPreferences(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("user_preferences")
    .delete()
    .eq("user_id", userId);

  return !error;
}
