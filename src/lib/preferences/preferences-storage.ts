"use client";

import { setValueToCookie } from "@/server/server-actions";

import { setClientCookie } from "../cookie.client";
import { setLocalStorageValue } from "../local-storage.client";
import { updateUserPreference } from "../supabase/user-preferences";
import { PREFERENCE_PERSISTENCE, type PreferenceKey, type PreferenceValueMap } from "./preferences-config";

// Store current user ID for preference sync
let currentUserId: string | null = null;

/**
 * Set the current user ID for preference synchronization
 * Call this when user logs in
 */
export function setCurrentUserId(userId: string | null) {
  currentUserId = userId;
}

/**
 * Get the current user ID
 */
export function getCurrentUserId(): string | null {
  return currentUserId;
}

/**
 * Persist a preference value
 * - Always saves to local storage (cookie/localStorage) for immediate effect
 * - If user is logged in, also syncs to database for persistence across devices
 */
export async function persistPreference(key: PreferenceKey, value: string) {
  const mode = PREFERENCE_PERSISTENCE[key];

  // First, save locally for immediate effect
  switch (mode) {
    case "none":
      break;

    case "client-cookie":
      setClientCookie(key, value);
      break;

    case "server-cookie":
      await setValueToCookie(key, value);
      break;

    case "localStorage":
      setLocalStorageValue(key, value);
      break;
  }

  // If user is logged in, also sync to database
  if (currentUserId) {
    await updateUserPreference(currentUserId, key, value);
  }
}

/**
 * Persist multiple preferences at once
 */
export async function persistPreferences(preferences: Partial<PreferenceValueMap>) {
  const entries = Object.entries(preferences) as [PreferenceKey, string][];
  
  for (const [key, value] of entries) {
    await persistPreference(key, value);
  }
}
