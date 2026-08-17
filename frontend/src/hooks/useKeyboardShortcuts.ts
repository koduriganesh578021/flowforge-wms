import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const SHORTCUTS: Record<string, string> = {
  'g,c': '/',
  'g,o': '/orders',
  'g,i': '/inventory',
  'g,f': '/fulfillment',
  'g,e': '/exceptions',
};

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const keySequence = useRef<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      keySequence.current.push(key);

      // Keep only last 2 keys
      if (keySequence.current.length > 2) {
        keySequence.current = keySequence.current.slice(-2);
      }

      const sequence = keySequence.current.join(',');
      if (SHORTCUTS[sequence]) {
        e.preventDefault();
        navigate(SHORTCUTS[sequence]);
        keySequence.current = [];
      }

      // Reset sequence after delay
      setTimeout(() => {
        keySequence.current = [];
      }, 1000);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}
