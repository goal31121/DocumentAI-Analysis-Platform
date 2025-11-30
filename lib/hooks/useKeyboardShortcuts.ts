import { useEffect, useCallback } from 'react';

export type KeyboardShortcut = {
  key: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
};

/**
 * Hook for handling keyboard shortcuts
 * @param shortcuts - Array of keyboard shortcuts
 * @param enabled - Whether shortcuts are enabled (default: true)
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      for (const shortcut of shortcuts) {
        const { key, ctrlOrCmd, shift, alt, action } = shortcut;

        // Check if modifier keys match
        const isCtrlOrCmd = ctrlOrCmd ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const isShift = shift ? event.shiftKey : !event.shiftKey;
        const isAlt = alt ? event.altKey : !event.altKey;

        // Check if the key matches (case-insensitive)
        const keyMatches = event.key.toLowerCase() === key.toLowerCase();

        if (isCtrlOrCmd && isShift && isAlt && keyMatches) {
          event.preventDefault();
          action();
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Common keyboard shortcuts for the application
 */
export const COMMON_SHORTCUTS = {
  SEARCH: {
    key: 'k',
    ctrlOrCmd: true,
    description: 'Open search',
  },
  NEW_DOCUMENT: {
    key: 'n',
    ctrlOrCmd: true,
    description: 'New document',
  },
  UPLOAD: {
    key: 'u',
    ctrlOrCmd: true,
    description: 'Upload document',
  },
  SAVE: {
    key: 's',
    ctrlOrCmd: true,
    description: 'Save',
  },
  CLOSE: {
    key: 'Escape',
    description: 'Close modal/dialog',
  },
  REFRESH: {
    key: 'r',
    ctrlOrCmd: true,
    shift: true,
    description: 'Hard refresh',
  },
} as const;
