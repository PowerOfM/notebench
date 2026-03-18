import { useCallback } from 'react';
import { useStore } from '../store';
import { flattenVisible } from '../lib/tree';

interface UseNodeKeyboardOptions {
  nodeId: string;
  divRef: React.RefObject<HTMLDivElement | null>;
  isProjectTitle?: boolean;
}

export function useNodeKeyboard({ nodeId, divRef, isProjectTitle = false }: UseNodeKeyboardOptions) {
  const store = useStore();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const { nodes, rootIds } = store;
      const node = nodes[nodeId];
      if (!node) return;

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isProjectTitle) {
          // Focus first child, or create one if none exists
          if (node.childrenIds.length > 0) {
            store.setActiveNode(node.childrenIds[0], false);
          } else {
            const newId = store.createNode(nodeId);
            store.setActiveNode(newId, false);
          }
        } else {
          const newId = store.createNode(node.parentId, nodeId);
          // New sibling inherits the status type (but not the value)
          if (node.statusType !== 'none') {
            store.setStatusType(newId, node.statusType);
          }
          store.setActiveNode(newId, false);
        }
        return;
      }

      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const { statusType } = node;
        if (statusType === 'checkable') {
          store.toggleChecked(nodeId);
        } else if (statusType === 'project') {
          store.cycleProjectStatus(nodeId);
        } else {
          // Default: make it a checkable and check it
          store.toggleChecked(nodeId);
        }
        return;
      }

      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        store.indentNode(nodeId);
        store.setActiveNode(nodeId, true);
        return;
      }

      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        // Don't outdent if already a direct child of a root project node
        const parent = node.parentId ? nodes[node.parentId] : null;
        if (!parent || parent.parentId === null) return;
        store.outdentNode(nodeId);
        store.setActiveNode(nodeId, true);
        return;
      }

      if (e.key === 'Backspace') {
        const div = divRef.current;
        if (!div) return;
        const sel = window.getSelection();
        const isEmpty = div.textContent === '';
        const atStart =
          sel?.anchorOffset === 0 && sel?.focusOffset === 0;

        if (isEmpty || atStart) {
          e.preventDefault();
          // Navigate to previous node before deleting
          const flat = flattenVisible(rootIds, nodes);
          const idx = flat.findIndex((f) => f.id === nodeId);
          if (idx > 0) {
            store.setActiveNode(flat[idx - 1].id, true);
          }
          if (isEmpty) {
            store.deleteNode(nodeId);
          }
          return;
        }
      }

      if (e.key === 'ArrowUp') {
        const div = divRef.current;
        if (!div) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        // Check if cursor is at start of div
        const preRange = document.createRange();
        preRange.selectNodeContents(div);
        preRange.setEnd(range.startContainer, range.startOffset);
        const atStart = preRange.toString().length === 0;
        if (atStart) {
          e.preventDefault();
          const flat = flattenVisible(rootIds, nodes);
          const idx = flat.findIndex((f) => f.id === nodeId);
          if (idx > 0) {
            store.setActiveNode(flat[idx - 1].id, true);
          }
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        const div = divRef.current;
        if (!div) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        const postRange = document.createRange();
        postRange.selectNodeContents(div);
        postRange.setStart(range.endContainer, range.endOffset);
        const atEnd = postRange.toString().length === 0;
        if (atEnd) {
          e.preventDefault();
          const flat = flattenVisible(rootIds, nodes);
          const idx = flat.findIndex((f) => f.id === nodeId);
          if (idx < flat.length - 1) {
            store.setActiveNode(flat[idx + 1].id, false);
          }
        }
        return;
      }
    },
    [nodeId, store, divRef]
  );

  return { handleKeyDown };
}
