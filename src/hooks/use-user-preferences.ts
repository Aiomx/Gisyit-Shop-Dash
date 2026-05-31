"use client";

import { useCallback, useEffect, useState } from "react";

import { applyContentLayout, applyNavbarStyle, applySidebarCollapsible, applySidebarVariant } from "@/lib/preferences/layout-utils";
import { PREFERENCE_DEFAULTS, type PreferenceValueMap } from "@/lib/preferences/preferences-config";
import { setCurrentUserId } from "@/lib/preferences/preferences-storage";
import { applyThemeMode, applyThemePreset } from "@/lib/preferences/theme-utils";
import { getUserPreferences, saveUserPreferences } from "@/lib/supabase/user-preferences";

interface UseUserPreferencesOptions {
  userId: string | null;
  onPreferencesLoaded?: (preferences: Partial<PreferenceValueMap>) => void;
}

/**
 * Hook to manage user preferences synchronization with database
 * 
 * - Loads preferences from database when user logs in
 * - Applies preferences to the UI
 * - Provides methods to save preferences
 */
export function useUserPreferences({ userId, onPreferencesLoaded }: UseUserPreferencesOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences when user ID changes
  useEffect(() => {
    setCurrentUserId(userId);

    if (!userId) {
      setIsLoaded(false);
      return;
    }

    const loadPreferences = async () => {
      setIsLoading(true);
      try {
        const preferences = await getUserPreferences(userId);
        
        if (preferences) {
          // Apply preferences to UI
          applyPreferencesToUI(preferences);
          onPreferencesLoaded?.(preferences);
        }
        
        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to load user preferences:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [userId, onPreferencesLoaded]);

  // Save all current preferences to database
  const savePreferences = useCallback(async (preferences: Partial<PreferenceValueMap>) => {
    if (!userId) return false;
    
    try {
      return await saveUserPreferences(userId, preferences);
    } catch (error) {
      console.error("Failed to save user preferences:", error);
      return false;
    }
  }, [userId]);

  return {
    isLoading,
    isLoaded,
    savePreferences,
  };
}

/**
 * Apply preferences to the UI
 */
function applyPreferencesToUI(preferences: Partial<PreferenceValueMap>) {
  if (preferences.theme_mode) {
    applyThemeMode(preferences.theme_mode);
  }
  if (preferences.theme_preset) {
    applyThemePreset(preferences.theme_preset);
  }
  if (preferences.content_layout) {
    applyContentLayout(preferences.content_layout);
  }
  if (preferences.navbar_style) {
    applyNavbarStyle(preferences.navbar_style);
  }
  if (preferences.sidebar_variant) {
    applySidebarVariant(preferences.sidebar_variant);
  }
  if (preferences.sidebar_collapsible) {
    applySidebarCollapsible(preferences.sidebar_collapsible);
  }
}

/**
 * Get default preferences
 */
export function getDefaultPreferences(): PreferenceValueMap {
  return { ...PREFERENCE_DEFAULTS };
}
