import { useCallback } from "react";
import { actions } from "../store/actions";
import { useDispatch } from "../store/dispatch";
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
  const dispatch = useDispatch();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (isRootTitle) {
          // Focus first child, or create one if none exists
          if (node.childrenIds && node.childrenIds.length > 0) {
            dispatch(actions.focus(node.childrenIds[0]));
          } else {
            dispatch(actions.create(node.id, {}, 0, true));
          }
          return;
        }

        // TODO: split current node at cursor position, and potentially move children
        dispatch(actions.create(node.parentId, {}, index + 1, false));
        return;
      }

      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (node.status?.type === "checkbox") {
          dispatch(
            actions.update(node.id, {
              status: { type: "checkbox", checked: !node.status.checked },
            }),
          );
        }
        return;
      }

      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        console.log("TODO: implement indentNode");
        // store.indentNode(nodeId);
        // store.setActiveNode(nodeId, true);
        return;
      }

      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        console.log("TODO: implement outdentNode");
        // Don't outdent if already a direct child of a root project node
        // const parent = node.parentId ? nodes[node.parentId] : null;
        // if (!parent || parent.parentId === null) return;
        // store.outdentNode(nodeId);
        // store.setActiveNode(nodeId, true);
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
          // const flat = flattenVisible(rootIds, nodes);
          // const idx = flat.findIndex((f) => f.id === nodeId);
          // if (idx > 0) {
          // store.setActiveNode(flat[idx - 1].id, true);
          // }
          dispatch(actions.remove(node));
          return;
        }
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        console.log("TODO: implement focusNodeUp");
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        console.log("TODO: implement focusNodeDown");
        return;
      }
    },
    [node, index, dispatch, divRef],
  );

  return { handleKeyDown };
}
