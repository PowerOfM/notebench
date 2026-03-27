import { atom, useSetAtom } from "jotai";
import { IDispatchEventGeneric, INodeAction } from "../types/actions";
import { focusedIdAtom } from "./atoms";
import {
  handleAddNode,
  handleMoveNode,
  handleRemove,
  handleUpdateNode,
} from "./handlers";

export const dispatchAtom = atom(
  null,
  (get, set, { action, focus }: IDispatchEventGeneric<INodeAction | null>) => {
    if (!action) {
      set(focusedIdAtom, focus);
      return;
    }

    switch (action.type) {
      case "add":
        return handleAddNode(get, set, { action, focus });
      case "update":
        return handleUpdateNode(get, set, { action, focus });
      case "move":
        return handleMoveNode(get, set, { action, focus });
      case "remove":
        return handleRemove(get, set, { action, focus });
    }
  },
);

export const useDispatch = () => useSetAtom(dispatchAtom);
