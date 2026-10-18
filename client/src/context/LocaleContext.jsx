import { createContext, useContext, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ru from '../locales/ru.json';
import en from '../locales/en.json';
import uz from '../locales/uz.json';

const translations = { ru, uz, en };
const LocaleContext = createContext(null);
const valid = (value) => Object.hasOwn(translations, value);
export function LocaleProvider({ children }) {
  const [params, setParams] = useSearchParams();
  let saved = 'ru';
  try { saved = localStorage.getItem('fc-language') || 'ru'; } catch { /* Storage can be unavailable. */ }
  const locale = valid(params.get('lang')) ? params.get('lang') : valid(saved) ? saved : 'ru';
  useEffect(() => {
    document.documentElement.lang = locale;
    try { localStorage.setItem('fc-language', locale); } catch { /* Language still works for this session. */ }
  }, [locale]);
  const setLocale = (next) => {
    if (!valid(next)) return;
    setParams((previous) => { const updated = new URLSearchParams(previous); updated.set('lang', next); return updated; }, { replace: true });
  };
  const t = useCallback((key) => key.split('.').reduce((value, part) => value?.[part], translations[locale]) ?? key, [locale]);
  const localized = useCallback((product, key) => product?.[`${key}${locale[0].toUpperCase()}${locale.slice(1)}`] || product?.[`${key}Ru`] || '', [locale]);
  const link = useCallback((url) => `${url}${url.includes('?') ? '&' : '?'}lang=${locale}`, [locale]);
  return <LocaleContext.Provider value={{ locale, setLocale, t, localized, link }}>{children}</LocaleContext.Provider>;
}
export const useLocale = () => useContext(LocaleContext);
