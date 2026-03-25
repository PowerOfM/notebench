import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { flattenVisible } from "../lib/tree";
import { makeAction, nodeActionAtom } from "../store/actions";
import { nodesAtom, pinnedIdsAtom } from "../store/atoms";
import { INode } from "../types/node";

interface UseNodeKeyboardOptions {
  node: INode;
  index: number;
  divRef: React.RefObject<HTMLDivElement | null>;
  isRootTitle?: boolean;
}

export function useNodeKeyboard({
  node,
  index,
  divRef,
  isRootTitle = false,
}: UseNodeKeyboardOptions) {
  const dispatch = useSetAtom(nodeActionAtom);
  const nodes = useAtomValue(nodesAtom);
  const pinnedIds = useAtomValue(pinnedIdsAtom);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (isRootTitle) {
          // Focus first child, or create one if none exists
          if (node.childrenIds && node.childrenIds.length > 0) {
            dispatch(makeAction.focus(node.childrenIds[0]));
          } else {
            dispatch(makeAction.create(node.id, 0, {}, false));
          }
          return;
        }

        // TODO: split current node at cursor position, and potentially move children
        dispatch(makeAction.create(node.parentId, index + 1, {}, false));
        return;
      }

      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
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
        // Indent: make this node a child of its previous sibling
        const siblings =
          node.parentId == null
            ? pinnedIds
            : (nodes[node.parentId]?.childrenIds ?? []);
        const currentIndex = siblings.indexOf(node.id);
        if (currentIndex > 0) {
          const prevSiblingId = siblings[currentIndex - 1];
          const prevSibling = nodes[prevSiblingId];
          if (prevSibling) {
            dispatch(
              makeAction.move(
                node.id,
                prevSiblingId,
                prevSibling.childrenIds?.length ?? 0,
              ),
            );
          }
        }
        return;
      }

      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        // Outdent: move node to be a sibling of its parent (after the parent)
        if (node.parentId == null) return; // already root
        const parent = nodes[node.parentId];
        if (!parent) return;
        const grandparentId = parent.parentId;
        const grandparentChildren =
          grandparentId == null
            ? pinnedIds
            : (nodes[grandparentId]?.childrenIds ?? []);
        const parentIndexInGrandparent = grandparentChildren.indexOf(
          node.parentId,
        );
        if (parentIndexInGrandparent === -1) return;
        dispatch(
          makeAction.move(
            node.id,
            grandparentId,
            parentIndexInGrandparent + 1,
          ),
        );
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
          // Navigate to previous node before deleting
          const flat = flattenVisible(pinnedIds, nodes);
          const idx = flat.findIndex((f) => f.id === node.id);
          if (idx > 0) {
            dispatch(makeAction.focus(flat[idx - 1].id));
          }
          dispatch(makeAction.remove(node));
          return;
        }
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const flat = flattenVisible(pinnedIds, nodes);
        const idx = flat.findIndex((f) => f.id === node.id);
        if (idx > 0) {
          dispatch(makeAction.focus(flat[idx - 1].id));
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const flat = flattenVisible(pinnedIds, nodes);
        const idx = flat.findIndex((f) => f.id === node.id);
        if (idx !== -1 && idx < flat.length - 1) {
          dispatch(makeAction.focus(flat[idx + 1].id));
        }
        return;
      }
    },
    [node, index, dispatch, divRef, nodes, pinnedIds],
  );

  return { handleKeyDown };
}
