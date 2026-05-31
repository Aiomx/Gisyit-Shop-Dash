import type { PreferenceValueMap } from "@/lib/preferences/preferences-config";

declare global {
  interface Window {
    __PREFERENCES__?: {
      themeMode?: PreferenceValueMap["theme_mode"];
      themePreset?: PreferenceValueMap["theme_preset"];
      contentLayout?: PreferenceValueMap["content_layout"];
      navbarStyle?: PreferenceValueMap["navbar_style"];
      sidebarVariant?: PreferenceValueMap["sidebar_variant"];
      sidebarCollapsible?: PreferenceValueMap["sidebar_collapsible"];
    };
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      onWindowStateChange: (callback: (isMaximized: boolean) => void) => () => void;
      platform: string;
      isElectron: boolean;
    };
  }
}
