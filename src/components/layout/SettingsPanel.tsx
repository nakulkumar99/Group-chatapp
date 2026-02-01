import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sun, Moon, Image, Upload, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useThemeContext } from "./ThemeProvider";
import { AdminSettingsPanel } from "@/components/AdminSettingsPanel";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  groupId?: string | null;
}

export function SettingsPanel({ isOpen, onClose, groupId }: SettingsPanelProps) {
  const { user } = useAuth();
  const {
    theme,
    toggleTheme,
    wallpaper,
    presets,
    setPreset,
    setCustom,
    setOpacity,
    clearWallpaper,
  } = useThemeContext();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCustom(dataUrl);
      setUploading(false);
      toast.success("Wallpaper updated!");
    };
    reader.onerror = () => {
      toast.error("Failed to load image");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-y-0 right-0 w-80 bg-card/95 backdrop-blur-xl border-l border-border z-50 flex flex-col shadow-2xl lg:relative lg:w-80"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Settings</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-accent rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Admin Controls - only show if groupId is provided */}
            {groupId && user && (
              <>
                <AdminSettingsPanel groupId={groupId} currentUserId={user.id} />
                <Separator />
              </>
            )}

            {/* Theme Toggle */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">
                Appearance
              </Label>
              <div className="flex gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => theme === "dark" && toggleTheme()}
                  className="flex-1 gap-2 transition-all duration-300"
                >
                  <Sun className="w-4 h-4" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => theme === "light" && toggleTheme()}
                  className="flex-1 gap-2 transition-all duration-300"
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </Button>
              </div>
            </div>

            <Separator />

            {/* Wallpaper Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Image className="w-4 h-4" />
                Chat Wallpaper
              </Label>
              
              {/* Preset Wallpapers */}
              <div className="grid grid-cols-3 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setPreset(preset.id)}
                    className={`relative h-16 rounded-lg border-2 transition-all duration-200 overflow-hidden ${
                      wallpaper.type === "preset" && wallpaper.value === preset.id
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    }`}
                    style={{
                      backgroundImage: `url("${preset.url}")`,
                      backgroundColor: theme === "dark" ? "hsl(var(--muted))" : "hsl(var(--background))",
                    }}
                  >
                    {wallpaper.type === "preset" && wallpaper.value === preset.id && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Upload */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload Custom Wallpaper"}
                </Button>
              </div>

              {/* Custom Preview */}
              {wallpaper.type === "custom" && (
                <div className="relative h-20 rounded-lg border border-primary overflow-hidden">
                  <img
                    src={wallpaper.value}
                    alt="Custom wallpaper"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                </div>
              )}

              {/* Clear Wallpaper */}
              <Button
                variant="ghost"
                onClick={clearWallpaper}
                className="w-full gap-2 text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="w-4 h-4" />
                Remove Wallpaper
              </Button>
            </div>

            <Separator />

            {/* Opacity Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">
                  Wallpaper Opacity
                </Label>
                <span className="text-sm text-muted-foreground">
                  {wallpaper.opacity}%
                </span>
              </div>
              <Slider
                value={[wallpaper.opacity]}
                onValueChange={(v) => setOpacity(v[0])}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Preview
              </Label>
              <div
                className="h-32 rounded-lg border border-border overflow-hidden relative bg-background"
              >
                {wallpaper.type !== "none" && (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        wallpaper.type === "preset"
                          ? `url("${presets.find((p) => p.id === wallpaper.value)?.url}")`
                          : `url("${wallpaper.value}")`,
                      backgroundSize: wallpaper.type === "custom" ? "cover" : "auto",
                      backgroundPosition: "center",
                      opacity: wallpaper.opacity / 100,
                    }}
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col gap-2">
                    <div className="bg-accent text-foreground text-xs px-3 py-1.5 rounded-lg rounded-tl-none max-w-[120px]">
                      Hello there!
                    </div>
                    <div className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-lg rounded-tr-none max-w-[120px] self-end">
                      Hi! How are you?
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
