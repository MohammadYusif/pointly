'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Direction = 'ltr' | 'rtl';
export type Language = 'en' | 'ar';

interface DirectionContextType {
  direction: Direction;
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleDirection: () => void;
  isRTL: boolean;
}

const DirectionContext = createContext<DirectionContextType | undefined>(undefined);

const STORAGE_KEY = 'pointly-language';

interface DirectionProviderProps {
  children: React.ReactNode;
  defaultLanguage?: Language;
}

function getStoredLanguage(fallback: Language): Language {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'ar') return stored;
  } catch {}
  return fallback;
}

export function DirectionProvider({
  children,
  defaultLanguage = 'ar', // Default to Arabic for Saudi market
}: DirectionProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => getStoredLanguage(defaultLanguage));
  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';

  // Sync document attributes on mount
  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [direction, language]);

  const setLanguage = useCallback(
    (lang: Language) => {
      if (lang === language) return;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, lang);
        setLanguageState(lang);
      }
    },
    [language],
  );

  const toggleDirection = useCallback(() => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
  }, [language, setLanguage]);

  const isRTL = direction === 'rtl';

  const value = useMemo(
    () => ({
      direction,
      language,
      setLanguage,
      toggleDirection,
      isRTL,
    }),
    [direction, language, setLanguage, toggleDirection, isRTL],
  );

  return <DirectionContext.Provider value={value}>{children}</DirectionContext.Provider>;
}

export function useDirection() {
  const context = useContext(DirectionContext);
  if (context === undefined) {
    throw new Error('useDirection must be used within a DirectionProvider');
  }
  return context;
}
