"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={`h-[34px] w-[64px] ${className || ""}`} />; // placeholder
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`relative inline-flex h-[34px] w-[64px] shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all duration-500 ease-in-out ${
        isDark
          ? "border-[#1f2d32] bg-[#0b1d25]/90 shadow-[inset_0_2px_12px_rgba(0,0,0,0.4)]"
          : "border-[#E2E8F0] bg-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.02)]"
      } ${className || ""}`}
    >
      <span className="sr-only">Toggle theme</span>
      
      {/* Sun icon (Light mode) */}
      <span className={`absolute left-2.5 z-10 transition-opacity duration-300 ${isDark ? "opacity-30" : "opacity-100 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"}`}>
        <Sun size={14} className={isDark ? "text-[#5e8500]" : "text-amber-400"} strokeWidth={2.5} />
      </span>
      
      {/* Moon icon (Dark mode) */}
      <span className={`absolute right-2.5 z-10 transition-opacity duration-300 ${isDark ? "opacity-100 drop-shadow-[0_0_8px_rgba(182,255,0,0.5)]" : "opacity-30"}`}>
        <Moon size={14} className={isDark ? "text-[#B6FF00]" : "text-[#475569]"} strokeWidth={2.5} />
      </span>

      {/* Sliding thumb */}
      <span
        className={`pointer-events-none absolute left-[3px] top-[3px] h-[26px] w-[26px] transform rounded-full transition-all duration-500 ease-out shadow-sm ${
          isDark
            ? "translate-x-[30px] bg-[#1a2f3a] shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
            : "translate-x-0 bg-[#F8FAFC] border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        }`}
      />
    </button>
  );
}
