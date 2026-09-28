"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface LanguageSwitchProps {
  className?: string;
  compact?: boolean;
}

export function LanguageSwitch({ className, compact = false }: LanguageSwitchProps) {
  const { language, setLanguage, toggleLanguage, isUrdu } = useLanguage();

  return (
    <div
      dir="ltr"
      role="switch"
      aria-checked={isUrdu}
      aria-label="Toggle language between Roman Urdu and Urdu"
      onClick={toggleLanguage}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleLanguage();
        }
      }}
      className={cn(
        "relative inline-flex items-center select-none cursor-pointer rounded-full p-0.5 flex-shrink-0",
        "bg-slate-200/90 hover:bg-slate-300/80 active:scale-95 transition-all duration-200 ease-out",
        "border border-slate-300/80 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500/30",
        compact ? "h-7 w-[88px] text-[10px]" : "h-8 w-[104px] text-[11px]",
        className
      )}
    >
      {/* Sliding Active Pill Background */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-0.5 bottom-0.5 rounded-full transition-all duration-200 ease-out shadow-xs",
          compact
            ? isUrdu
              ? "left-[44px] w-[42px] bg-blue-600 shadow-blue-600/30"
              : "left-[2px] w-[42px] bg-white border border-slate-200/80 shadow-xs"
            : isUrdu
              ? "left-[52px] w-[50px] bg-blue-600 shadow-blue-600/30"
              : "left-[2px] w-[50px] bg-white border border-slate-200/80 shadow-xs"
        )}
      />

      {/* Left Option: Roman Urdu */}
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          setLanguage("roman");
        }}
        className={cn(
          "relative z-10 w-1/2 py-0.5 font-black text-center transition-colors duration-200 whitespace-nowrap leading-none",
          !isUrdu ? "text-blue-700" : "text-slate-500 hover:text-slate-700"
        )}
      >
        Roman
      </button>

      {/* Right Option: Urdu */}
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          setLanguage("ur");
        }}
        className={cn(
          "relative z-10 w-1/2 py-0.5 font-black text-center transition-colors duration-200 whitespace-nowrap leading-none",
          isUrdu ? "text-white" : "text-slate-500 hover:text-slate-700"
        )}
      >
        اردو
      </button>
    </div>
  );
}
