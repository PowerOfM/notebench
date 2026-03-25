import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { undoAtom } from '../store/actions';

/**
 * Registers global Cmd/Ctrl+Z (undo) keyboard shortcut.
 * Attach once at the app root.
 */
export function useUndoRedo() {
  const undo = useSetAtom(undoAtom);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);
}
