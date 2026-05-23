import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, ThemeType } from '../theme';
import '../i18n';
import i18n from '../i18n';
import { setCardLanguage } from '../db/queries/cards';

type Language = 'en' | 'it';

interface AppSettings {
  language: Language;
  setLanguage: (lang: Language) => void;
  isDark: boolean;
  toggleTheme: () => void;
  theme: ThemeType;
}

const AppSettingsContext = createContext<AppSettings>({
  language: 'en',
  setLanguage: () => {},
  isDark: true,
  toggleTheme: () => {},
  theme: darkTheme,
});

const STORAGE_LANG  = '@bss_language';
const STORAGE_THEME = '@bss_theme';

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isDark, setIsDark]          = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_LANG, STORAGE_THEME]).then(pairs => {
      const lang  = pairs[0][1] as Language | null;
      const theme = pairs[1][1];
      if (lang === 'en' || lang === 'it') {
        setLanguageState(lang);
        i18n.changeLanguage(lang);
        setCardLanguage(lang);
      }
      if (theme !== null) setIsDark(theme === 'dark');
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    setCardLanguage(lang);
    AsyncStorage.setItem(STORAGE_LANG, lang);
  };

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_THEME, next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <AppSettingsContext.Provider value={{
      language,
      setLanguage,
      isDark,
      toggleTheme,
      theme: isDark ? darkTheme : lightTheme,
    }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
