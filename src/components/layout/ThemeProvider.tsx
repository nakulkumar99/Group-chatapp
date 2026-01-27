import { createContext, useContext, ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useWallpaper, WallpaperConfig } from "@/hooks/useWallpaper";

interface ThemeContextType {
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
  wallpaper: WallpaperConfig;
  presets: { id: string; name: string; url: string }[];
  getWallpaperStyle: () => React.CSSProperties;
  setPreset: (presetId: string) => void;
  setCustom: (imageUrl: string) => void;
  setOpacity: (opacity: number) => void;
  clearWallpaper: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeHook = useTheme();
  const wallpaperHook = useWallpaper();

  return (
    <ThemeContext.Provider value={{ ...themeHook, ...wallpaperHook }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return context;
}
