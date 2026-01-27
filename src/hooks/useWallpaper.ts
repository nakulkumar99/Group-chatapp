import { useState, useEffect } from "react";

export interface WallpaperConfig {
  type: "preset" | "custom" | "none";
  value: string;
  opacity: number;
}

const PRESET_WALLPAPERS = [
  { id: "whatsapp-pattern", name: "WhatsApp Pattern", url: "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23334155' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E" },
  { id: "bubbles", name: "Bubbles", url: "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='25' cy='25' r='20' fill='%23334155' fill-opacity='0.1'/%3E%3Ccircle cx='75' cy='75' r='15' fill='%23334155' fill-opacity='0.08'/%3E%3Ccircle cx='80' cy='20' r='12' fill='%23334155' fill-opacity='0.06'/%3E%3Ccircle cx='20' cy='80' r='18' fill='%23334155' fill-opacity='0.1'/%3E%3C/svg%3E" },
  { id: "dots", name: "Dots", url: "data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1' fill='%23334155' fill-opacity='0.2'/%3E%3C/svg%3E" },
  { id: "grid", name: "Grid", url: "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1v38h38V1H1z' fill='%23334155' fill-opacity='0.08'/%3E%3C/svg%3E" },
  { id: "waves", name: "Waves", url: "data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q25 0 50 10 T100 10' stroke='%23334155' stroke-opacity='0.1' fill='none' stroke-width='2'/%3E%3C/svg%3E" },
  { id: "hexagons", name: "Hexagons", url: "data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23334155' fill-opacity='0.08'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9z'/%3E%3C/g%3E%3C/svg%3E" },
];

const DEFAULT_CONFIG: WallpaperConfig = {
  type: "preset",
  value: "whatsapp-pattern",
  opacity: 100,
};

export function useWallpaper() {
  const [wallpaper, setWallpaper] = useState<WallpaperConfig>(() => {
    const stored = localStorage.getItem("chat-wallpaper");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem("chat-wallpaper", JSON.stringify(wallpaper));
  }, [wallpaper]);

  const getWallpaperStyle = (): React.CSSProperties => {
    if (wallpaper.type === "none") {
      return {};
    }

    let backgroundImage = "";
    
    if (wallpaper.type === "preset") {
      const preset = PRESET_WALLPAPERS.find((p) => p.id === wallpaper.value);
      if (preset) {
        backgroundImage = `url("${preset.url}")`;
      }
    } else if (wallpaper.type === "custom") {
      backgroundImage = `url("${wallpaper.value}")`;
    }

    return {
      backgroundImage,
      backgroundSize: wallpaper.type === "custom" ? "cover" : "auto",
      backgroundPosition: "center",
      backgroundRepeat: wallpaper.type === "custom" ? "no-repeat" : "repeat",
    };
  };

  const setPreset = (presetId: string) => {
    setWallpaper({ type: "preset", value: presetId, opacity: wallpaper.opacity });
  };

  const setCustom = (imageUrl: string) => {
    setWallpaper({ type: "custom", value: imageUrl, opacity: wallpaper.opacity });
  };

  const setOpacity = (opacity: number) => {
    setWallpaper((prev) => ({ ...prev, opacity }));
  };

  const clearWallpaper = () => {
    setWallpaper({ type: "none", value: "", opacity: 100 });
  };

  return {
    wallpaper,
    presets: PRESET_WALLPAPERS,
    getWallpaperStyle,
    setPreset,
    setCustom,
    setOpacity,
    clearWallpaper,
  };
}
