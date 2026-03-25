import { atom } from "jotai";
import { useSetAtom } from "jotai";
import { IDispatchEvent } from "../types/actions";
import { focusedIdAtom } from "./atoms";
import {
  handleAddNode,
  handleUpdateNode,
  handleMoveNode,
  handleRemoveNode,
} from "./handlers";

export const dispatchAtom = atom(null, (get, set, event: IDispatchEvent) => {
  if (!event.action) {
    set(focusedIdAtom, event.focus);
    return;
  }

  switch (event.action.type) {
    case "add":
      return handleAddNode(get, set, event as any);

    case "update":
      return handleUpdateNode(get, set, event as any);

    case "move":
      return handleMoveNode(get, set, event.action);

    case "remove":
      return handleRemoveNode(get, set, event.action);
  }
});

/** Alias for backwards compatibility with components that import nodeActionAtom */
export { dispatchAtom as nodeActionAtom };

export const useDispatch = () => useSetAtom(dispatchAtom);
