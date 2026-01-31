'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

export type Direction = 'ltr' | 'rtl';
export type Language = 'en' | 'ar';

interface DirectionContextType {
  direction: Direction;
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleDirection: () => void;
  isRTL: boolean;
}

const DirectionContext = createContext<DirectionContextType | undefined>(
  undefined
);

const STORAGE_KEY = 'pointly-language';

interface DirectionProviderProps {
  children: React.ReactNode;
  defaultLanguage?: Language;
}

export function DirectionProvider({
  children,
  defaultLanguage = 'ar', // Default to Arabic for Saudi market
}: DirectionProviderProps) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [direction, setDirection] = useState<Direction>(
    defaultLanguage === 'ar' ? 'rtl' : 'ltr'
  );
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored && (stored === 'en' || stored === 'ar')) {
        setLanguageState(stored);
        setDirection(stored === 'ar' ? 'rtl' : 'ltr');
      }
    }
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
    [direction, language, setLanguage, toggleDirection, isRTL]
  );

  return (
    <DirectionContext.Provider value={value}>
      {children}
    </DirectionContext.Provider>
  );
}

export function useDirection() {
  const context = useContext(DirectionContext);
  if (context === undefined) {
    throw new Error('useDirection must be used within a DirectionProvider');
  }
  return context;
}
