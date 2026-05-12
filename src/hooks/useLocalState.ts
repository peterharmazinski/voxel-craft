import { useState, useCallback, useRef } from 'react';

export function useLocalState<T>(key: string, defaultValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValueRaw] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) return JSON.parse(saved);
    } catch { /* ignore parse errors */ }
    return defaultValue;
  });

  const valueRef = useRef(value);
  valueRef.current = value;

  const setValue = useCallback((v: T | ((prev: T) => T)) => {
    setValueRaw(prev => {
      const next = typeof v === 'function' ? (v as (prev: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }, [key]);

  return [value, setValue];
}
