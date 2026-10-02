"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, TranslationDictionary, translations } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: TranslationDictionary;
  isUrdu: boolean;
  dir: "rtl" | "ltr";
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const APP_LANGUAGE_STORAGE_KEY = "jilani_autos_app_language_v1";

interface LanguageProviderProps {
  children: React.ReactNode;
  initialLanguage?: Language;
}

export function LanguageProvider({ children, initialLanguage = "roman" }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(APP_LANGUAGE_STORAGE_KEY) as Language | null;
      if (saved === "ur" || saved === "roman") {
        setLanguageState(saved);
      }
    } catch {
      // LocalStorage not available
    }
    setMounted(true);

    // Cross-tab synchronization: keep language state in sync across multiple browser tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === APP_LANGUAGE_STORAGE_KEY && (e.newValue === "ur" || e.newValue === "roman")) {
        setLanguageState(e.newValue as Language);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, lang);
      // Also persist to cookie for server-side layout and initial paint alignment
      document.cookie = `${APP_LANGUAGE_STORAGE_KEY}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === "roman" ? "ur" : "roman";
    setLanguage(nextLang);
  };

  const isUrdu = language === "ur";
  const dir = isUrdu ? "rtl" : "ltr";
  const t = translations[language] || translations.roman;

  // Update HTML dir and lang attributes dynamically without stale layout classes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = isUrdu ? "ur" : "ur-Latn";
      document.documentElement.dir = dir;
      if (isUrdu) {
        document.body.classList.add("font-urdu");
      } else {
        document.body.classList.remove("font-urdu");
      }
    }
  }, [isUrdu, dir]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isUrdu,
        dir,
      }}
    >
      <div dir={dir} className={isUrdu ? "font-urdu" : ""}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
