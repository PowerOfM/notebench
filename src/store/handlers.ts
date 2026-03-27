import { Getter, Setter } from "jotai";
import { pick } from "../lib/pick";
import type {
  IDispatchEvent,
  IDispatchEventGeneric,
  INodeAddAction,
  INodeMoveAction,
  INodeRemoveAction,
  INodeUpdateAction,
} from "../types/actions";
import type { INode } from "../types/node";
import { actions } from "./actions";
import {
  focusedIdAtom,
  nodesAtom,
  pinnedIdsAtom,
  undoStackAtom,
} from "./atoms";
import {
  addToParent,
  addToPinned,
  removeFromParent,
  removeFromPinned,
} from "./handlerHelpers";

export function handleAddNode(
  get: Getter,
  set: Setter,
  { action, focus }: IDispatchEventGeneric<INodeAddAction>,
) {
  const nodesState = { ...get(nodesAtom) };
  nodesState[action.node.id] = action.node;

  if (
    action.node.parentId &&
    !addToParent(nodesState, action.node.parentId, action.node.id, action.index)
  ) {
    action.node.parentId = null;
  }

  if (action.node.parentId == null) {
    const pinnedState = [...get(pinnedIdsAtom)];
    addToPinned(pinnedState, action.node.id, action.index);
    set(pinnedIdsAtom, pinnedState);
  }

  const focusedState = get(focusedIdAtom);
  const undoAction: IDispatchEvent = {
    action: { type: "remove", node: action.node },
    focus: focusedState,
  };
  const undoStack = [...get(undoStackAtom), undoAction];

  set(focusedIdAtom, focus);
  set(nodesAtom, nodesState);
  set(undoStackAtom, undoStack);
}

export function handleUpdateNode(
  get: Getter,
  set: Setter,
  { action, focus }: IDispatchEventGeneric<INodeUpdateAction>,
) {
  const state = { ...get(nodesAtom) };
  const node = state[action.nodeId];
  const prev = pick(node, Object.keys(action.payload) as (keyof INode)[]);

  state[action.nodeId] = { ...node, ...action.payload, updatedAt: Date.now() };

  const focusedState = get(focusedIdAtom);
  const undoAction: IDispatchEvent = {
    action: { type: "update", nodeId: action.nodeId, payload: prev },
    focus: focusedState,
  };
  if (focus !== focusedState) {
    set(focusedIdAtom, focus);
  }
  set(undoStackAtom, [...get(undoStackAtom), undoAction]);
  set(nodesAtom, state);
}

function moveWithinList(
  mutableList: string[],
  nodeId: string,
  newIndex?: number,
) {
  const prevIndex = mutableList.indexOf(nodeId);
  if (prevIndex === -1) {
    return -1;
  }

  mutableList.splice(prevIndex, 1);
  mutableList.splice(newIndex ?? mutableList.length - 1, 0, nodeId);
  return prevIndex;
}

function handleMoveWithinPinnedIds(
  get: Getter,
  set: Setter,
  nodeId: string,
  newIndex?: number,
) {
  const pinnedIdsState = [...get(pinnedIdsAtom)];
  const prevIndex = moveWithinList(pinnedIdsState, nodeId, newIndex);
  if (prevIndex === -1) {
    console.error(`Failed to move node ${nodeId} within pinned list`);
    return;
  }
  set(pinnedIdsAtom, pinnedIdsState);
  const undoAction = actions.move(nodeId, null, prevIndex);
  set(undoStackAtom, [...get(undoStackAtom), undoAction]);
}

function handleMoveWithinParent(
  get: Getter,
  set: Setter,
  parentId: string,
  nodeId: string,
  newIndex?: number,
) {
  const nodesState = { ...get(nodesAtom) };
  const parent = nodesState[parentId];
  if (!parent) {
    console.error(`Parent node ${parentId} not found while moving node`);
    return;
  }

  const childrenIds = parent.childrenIds ? [...parent.childrenIds] : [];
  const prevIndex = moveWithinList(childrenIds, nodeId, newIndex);
  if (prevIndex === -1) {
    console.error(`Failed to move node ${nodeId} within parent ${parentId}`);
    return;
  }

  nodesState[parentId] = {
    ...parent,
    childrenIds,
    updatedAt: Date.now(),
  };
  set(nodesAtom, nodesState);

  const undoAction = actions.move(nodeId, parentId, prevIndex);
  set(undoStackAtom, [...get(undoStackAtom), undoAction]);
}

export function handleMoveNode(
  get: Getter,
  set: Setter,
  { action, focus }: IDispatchEventGeneric<INodeMoveAction>,
) {
  const nodes = get(nodesAtom);
  const prev = nodes[action.nodeId];

  let prevParentId = prev.parentId;
  if (prevParentId == null && action.parentId == null) {
    return handleMoveWithinPinnedIds(get, set, action.nodeId, action.index);
  } else if (prevParentId != null && prevParentId === action.parentId) {
    return handleMoveWithinParent(
      get,
      set,
      prevParentId,
      action.nodeId,
      action.index,
    );
  }

  const nodesState = { ...nodes };
  const pinnedIdsState = [...get(pinnedIdsAtom)];
  let prevIndex = undefined;
  if (prevParentId == null) {
    prevIndex = removeFromPinned(pinnedIdsState, action.nodeId);
  } else {
    prevIndex = removeFromParent(nodesState, prevParentId, action.nodeId);
  }

  if (action.parentId == null) {
    addToPinned(pinnedIdsState, action.nodeId, action.index);
  } else {
    addToParent(nodesState, action.parentId, action.nodeId, action.index);
  }

  nodesState[action.nodeId] = {
    ...prev,
    parentId: action.parentId,
    updatedAt: Date.now(),
  };

  const undoAction = actions.move(action.nodeId, prevParentId, prevIndex);
  const focusedState = get(focusedIdAtom);
  if (focusedState !== focus) {
    undoAction.focus = focusedState;
    set(focusedIdAtom, focus);
  }

  set(nodesAtom, nodesState);
  set(pinnedIdsAtom, pinnedIdsState);
  set(undoStackAtom, [...get(undoStackAtom), undoAction]);
}

export function handleRemove(
  get: Getter,
  set: Setter,
  { action, focus }: IDispatchEventGeneric<INodeRemoveAction>,
) {
  const nodesState = { ...get(nodesAtom) };
  const prev = nodesState[action.node.id];

  let prevParentId = prev.parentId;
  let prevIndex: number | undefined = undefined;
  if (prevParentId != null) {
    prevIndex = removeFromParent(nodesState, prevParentId, action.node.id);
  } else {
    const pinnedIdsState = [...get(pinnedIdsAtom)];
    prevIndex = removeFromPinned(pinnedIdsState, action.node.id);
    set(pinnedIdsAtom, pinnedIdsState);
  }

  delete nodesState[action.node.id];

  const undoAction = actions.create(prevParentId, prev, prevIndex);
  const focusedState = get(focusedIdAtom);
  if (focusedState !== focus) {
    undoAction.focus = focusedState;
    set(focusedIdAtom, focus);
  }
  set(nodesAtom, nodesState);
  set(undoStackAtom, [...get(undoStackAtom), undoAction]);
}

export function handleFocus(get: Getter, set: Setter, event: IDispatchEvent) {
  const focusedState = get(focusedIdAtom);
  set(focusedIdAtom, event.focus);
  set(undoStackAtom, [...get(undoStackAtom), actions.focus(focusedState)]);
}
