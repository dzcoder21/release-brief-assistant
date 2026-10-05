import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext(null);
const KEY = 'rba_theme';

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem(KEY) || 'system');

  const apply = useCallback((value) => {
    document.documentElement.classList.toggle('dark', value === 'dark' || (value === 'system' && systemDark()));
  }, []);

  useEffect(() => {
    apply(theme);
    if (theme !== 'system') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme, apply]);

  const setTheme = (value) => {
    localStorage.setItem(KEY, value);
    setThemeState(value);
  };
  const isDark = theme === 'dark' || (theme === 'system' && systemDark());
  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  return <ThemeContext.Provider value={{ theme, setTheme, toggle, isDark }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
