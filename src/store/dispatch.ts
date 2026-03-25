import { atom } from "jotai";
import { useSetAtom } from "jotai/ts3.8/esm/react";
import {
  INodeAction,
  INodeAddAction,
  INodeUpdateAction,
  INodeMoveAction,
  INodeRemoveAction,
  INodeFocusAction,
  IDispatchEvent,
} from "../types/actions";
import { INode, INodeChanges } from "../types/node";
import { nodesAtom, focusedIdAtom, undoStackAtom } from "./atoms";
import { handleAddNode, handleUpdateNode, handleMoveNode } from "./handlers";

export const dispatchAtom = atom(null, (get, set, event: IDispatchEvent) => {
  if (!event.action) {
    set(focusedIdAtom, event.focus);
    return;
  }

  switch (event.action.type) {
    case "add":
      return handleAddNode(get, set, event);

    case "update": {
      return handleUpdateNode(get, set, event);
    }
    case "move": {
      const node = nodes[action.nodeId];
      if (!node) {
        console.error(
          `Node ${action.nodeId} not found while moving node`,
          action,
        );
        return;
      }
      if (node.parentId == null && action.parentId == null) {
        moveWithinPinnedEffect(get, set, node.id, action.index);
      } else if (node.parentId === action.parentId) {
        moveWithinParentEffect(get, set, nodes, action);
      } else {
        moveNodeEffect(get, set, nodes, action);
      }
      return;
    }
    case "remove": {
      removeNodeEffect(get, set, nodes, action);
      break;
    }
    case "focus": {
      const prev = get(focusedIdAtom);
      if (prev !== action.nodeId) {
        set(focusedIdAtom, action.nodeId);
        if (prev != null) {
          set(undoStackAtom, [...get(undoStackAtom), makeAction.focus(prev)]);
        }
      }
      break;
    }
  }
});

export const useDispatch = () => useSetAtom(dispatchAtom);
