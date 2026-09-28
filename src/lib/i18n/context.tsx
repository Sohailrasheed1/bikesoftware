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

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "skander_app_language_v1";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("roman");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved === "ur" || saved === "roman") {
        setLanguageState(saved);
      }
    } catch {
      // LocalStorage not available
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
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
  const t = translations[language];

  // Update HTML dir and lang attributes dynamically
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
