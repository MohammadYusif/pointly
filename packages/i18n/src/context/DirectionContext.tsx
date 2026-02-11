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

function getInitialLanguage(fallback: Language): Language {
  if (typeof window === 'undefined') return fallback;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'ar') return stored;
  return fallback;
}

interface DirectionProviderProps {
  children: React.ReactNode;
  defaultLanguage?: Language;
}

export function DirectionProvider({
  children,
  defaultLanguage = 'ar', // Default to Arabic for Saudi market
}: DirectionProviderProps) {
  const [language, setLanguageState] = useState<Language>(() =>
    getInitialLanguage(defaultLanguage),
  );
  const [direction, setDirection] = useState<Direction>(() =>
    getInitialLanguage(defaultLanguage) === 'ar' ? 'rtl' : 'ltr',
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update document attributes when direction/language changes
  useEffect(() => {
    if (mounted && typeof document !== 'undefined') {
      document.documentElement.dir = direction;
      document.documentElement.lang = language;
    }
  }, [direction, language, mounted]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    const newDirection = lang === 'ar' ? 'rtl' : 'ltr';
    setDirection(newDirection);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }, []);

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
