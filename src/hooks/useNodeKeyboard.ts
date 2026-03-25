import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { makeAction } from "../store/actions";
import { nodeActionAtom } from "../store/dispatch";
import { nodesAtom, pinnedIdsAtom } from "../store/atoms";
import { flattenVisible } from "../lib/tree";

interface UseNodeKeyboardOptions {
  nodeId: string;
  divRef: React.RefObject<HTMLDivElement | null>;
  isRootTitle?: boolean;
}

export function useNodeKeyboard({
  nodeId,
  divRef,
  isRootTitle = false,
}: UseNodeKeyboardOptions) {
  const dispatch = useSetAtom(nodeActionAtom);
  const nodes = useAtomValue(nodesAtom);
  const pinnedIds = useAtomValue(pinnedIdsAtom);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const node = nodes[nodeId];
      if (!node) return;

      // Compute sibling list and index on demand
      const siblings: string[] =
        node.parentId == null
          ? pinnedIds
          : (nodes[node.parentId]?.childrenIds ?? []);
      const siblingIndex = siblings.indexOf(nodeId);

      if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (isRootTitle) {
          // Focus first child, or create one if none exists
          if (node.childrenIds && node.childrenIds.length > 0) {
            dispatch(makeAction.focus(node.childrenIds[0]));
          } else {
            dispatch(makeAction.create(node.id, {}, 0));
          }
          return;
        }

        // Create sibling below current node
        dispatch(makeAction.create(node.parentId, {}, siblingIndex + 1));
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (node.status?.type === "checkbox") {
          dispatch(
            makeAction.update(node.id, {
              status: { type: "checkbox", checked: !node.status.checked },
            }),
          );
        }
        return;
      }

      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        // Indent: become last child of previous sibling
        if (siblingIndex > 0) {
          const prevSiblingId = siblings[siblingIndex - 1];
          const prevSibling = nodes[prevSiblingId];
          if (prevSibling) {
            const newIndex = prevSibling.childrenIds?.length ?? 0;
            dispatch(makeAction.move(nodeId, prevSiblingId, newIndex));
          }
        }
        return;
      }

      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        // Outdent: become next sibling of parent
        if (node.parentId != null) {
          const parent = nodes[node.parentId];
          if (parent) {
            const grandParentId = parent.parentId;
            const parentSiblings: string[] =
              grandParentId == null
                ? pinnedIds
                : (nodes[grandParentId]?.childrenIds ?? []);
            const parentIndex = parentSiblings.indexOf(node.parentId);
            dispatch(makeAction.move(nodeId, grandParentId, parentIndex + 1));
          }
        }
        return;
      }

      if (e.key === "Backspace") {
        const div = divRef.current;
        if (!div) return;
        const sel = window.getSelection();
        const isEmpty =
          div.textContent === "" &&
          (node.childrenIds == null || node.childrenIds.length === 0);
        const atStart = sel?.anchorOffset === 0 && sel?.focusOffset === 0;

        if (isEmpty || atStart) {
          e.preventDefault();
          // Focus previous visible node before deleting
          const flat = flattenVisible(pinnedIds, nodes);
          const idx = flat.findIndex((f) => f.id === nodeId);
          if (idx > 0) {
            dispatch(makeAction.remove(node, flat[idx - 1].id));
          } else {
            dispatch(makeAction.remove(node, null));
          }
          return;
        }
      }

      if (e.key === "ArrowUp") {
        const div = divRef.current;
        if (!div) return;
        const sel = window.getSelection();
        const atStart = sel?.anchorOffset === 0 && sel?.focusOffset === 0;
        if (atStart) {
          e.preventDefault();
          const flat = flattenVisible(pinnedIds, nodes);
          const idx = flat.findIndex((f) => f.id === nodeId);
          if (idx > 0) {
            dispatch(makeAction.focus(flat[idx - 1].id));
          }
        }
        return;
      }

      if (e.key === "ArrowDown") {
        const div = divRef.current;
        if (!div) return;
        const sel = window.getSelection();
        if (!sel) return;
        const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
        const atEnd = range
          ? range.endOffset === (range.endContainer.textContent?.length ?? 0) &&
            !range.endContainer.nextSibling
          : false;
        if (atEnd) {
          e.preventDefault();
          const flat = flattenVisible(pinnedIds, nodes);
          const idx = flat.findIndex((f) => f.id === nodeId);
          if (idx >= 0 && idx < flat.length - 1) {
            dispatch(makeAction.focus(flat[idx + 1].id));
          }
        }
        return;
      }
    },
    [nodeId, nodes, pinnedIds, dispatch, divRef, isRootTitle],
  );

  return { handleKeyDown };
}
