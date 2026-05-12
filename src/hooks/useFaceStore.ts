import { useState, useCallback, useEffect } from 'react';

const FACE_KEYS = {
  top: 'vb_customImg_top',
  side: 'vb_customImg_side',
  bottom: 'vb_customImg_bottom',
} as const;

type FaceName = 'top' | 'side' | 'bottom';

const CHANGE_EVENT = 'facestore-change';

export function setFaceImage(face: FaceName, dataUrl: string) {
  localStorage.setItem(FACE_KEYS[face], dataUrl);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: face }));
}

export function clearFaceImage(face: FaceName) {
  localStorage.removeItem(FACE_KEYS[face]);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: face }));
}

export function getFaceImage(face: FaceName): string | null {
  return localStorage.getItem(FACE_KEYS[face]);
}

export function useFaceImages() {
  const [top, setTop] = useState<string | null>(() => getFaceImage('top'));
  const [side, setSide] = useState<string | null>(() => getFaceImage('side'));
  const [bottom, setBottom] = useState<string | null>(() => getFaceImage('bottom'));

  useEffect(() => {
    const handler = () => {
      setTop(getFaceImage('top'));
      setSide(getFaceImage('side'));
      setBottom(getFaceImage('bottom'));
    };
    window.addEventListener(CHANGE_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const clear = useCallback((face: FaceName) => clearFaceImage(face), []);

  return { top, side, bottom, clear };
}
