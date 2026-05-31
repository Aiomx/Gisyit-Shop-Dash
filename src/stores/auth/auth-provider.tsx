"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import type { User } from "@supabase/supabase-js";

import { useUserPreferences } from "@/hooks/use-user-preferences";
import type { PreferenceValueMap } from "@/lib/preferences/preferences-config";
import { supabase } from "@/lib/supabase/client";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isPreferencesLoaded: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get preference setters from store
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);
  const setThemePreset = usePreferencesStore((s) => s.setThemePreset);
  const setContentLayout = usePreferencesStore((s) => s.setContentLayout);
  const setNavbarStyle = usePreferencesStore((s) => s.setNavbarStyle);
  const setSidebarVariant = usePreferencesStore((s) => s.setSidebarVariant);
  const setSidebarCollapsible = usePreferencesStore((s) => s.setSidebarCollapsible);

  // Callback to update store when preferences are loaded from database
  const handlePreferencesLoaded = useCallback((preferences: Partial<PreferenceValueMap>) => {
    if (preferences.theme_mode) setThemeMode(preferences.theme_mode);
    if (preferences.theme_preset) setThemePreset(preferences.theme_preset);
    if (preferences.content_layout) setContentLayout(preferences.content_layout);
    if (preferences.navbar_style) setNavbarStyle(preferences.navbar_style);
    if (preferences.sidebar_variant) setSidebarVariant(preferences.sidebar_variant);
    if (preferences.sidebar_collapsible) setSidebarCollapsible(preferences.sidebar_collapsible);
  }, [setThemeMode, setThemePreset, setContentLayout, setNavbarStyle, setSidebarVariant, setSidebarCollapsible]);

  // Use the user preferences hook
  const { isLoaded: isPreferencesLoaded } = useUserPreferences({
    userId: user?.id ?? null,
    onPreferencesLoaded: handlePreferencesLoaded,
  });

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isPreferencesLoaded, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
