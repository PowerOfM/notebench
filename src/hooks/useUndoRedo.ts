import { useAtom, useSetAtom } from "jotai";
import { useEffect } from "react";
import { nodeActionAtom } from "../store/dispatch";
import { undoStackAtom, redoStackAtom } from "../store/atoms";

/**
 * Registers global Cmd/Ctrl+Z (undo) and Cmd/Ctrl+Shift+Z / Cmd/Ctrl+Y (redo)
 * keyboard shortcuts. Attach once at the app root.
 */
export function useUndoRedo() {
  const dispatch = useSetAtom(nodeActionAtom);
  const [undoStack, setUndoStack] = useAtom(undoStackAtom);
  const [redoStack, setRedoStack] = useAtom(redoStackAtom);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (undoStack.length === 0) return;
        const event = undoStack[undoStack.length - 1];
        setUndoStack((prev) => prev.slice(0, -1));
        // Dispatch the inverse event (marked as undo so handlers push to redo)
        dispatch({ ...event, isUndo: true });
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        if (redoStack.length === 0) return;
        const event = redoStack[redoStack.length - 1];
        setRedoStack((prev) => prev.slice(0, -1));
        dispatch({ ...event, isUndo: false });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoStack, redoStack, dispatch, setUndoStack, setRedoStack]);
}
