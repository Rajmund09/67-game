import { useState, useEffect, useCallback } from 'react';
import { translations } from '../translations';

// Global cache to avoid re-fetching multiple times
let cachedLanguage = null;

export default function useLanguage() {
  const lang = 'en';

  const t = useCallback((key) => {
    return translations[lang]?.[key] || key;
  }, [lang]);

  return { lang, t };
}
