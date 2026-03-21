import { useEffect } from 'react';
import { useStore } from '../store';

/**
 * Registers global Cmd/Ctrl+Z (undo) and Cmd/Ctrl+Shift+Z / Cmd/Ctrl+Y (redo)
 * keyboard shortcuts. Attach once at the app root.
 */
export function useUndoRedo() {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
}
