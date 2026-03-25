import { atom, Getter, Setter } from "jotai";
import { createNode } from "../lib/tree";
import type {
  IDispatchEvent,
  IDispatchEventGeneric,
  INodeAction,
  INodeAddAction,
  INodeFocusAction,
  INodeMoveAction,
  INodeRemoveAction,
  INodeUpdateAction,
} from "../types/actions";
import type { INode, INodeChanges, INodeMap } from "../types/node";
import {
  focusedIdAtom,
  nodesAtom,
  pinnedIdsAtom,
  undoStackAtom,
} from "./atoms";
import { pick } from "../lib/pick";
import { addToParent, addToPinned } from "./handlerHelpers";

export function handleAddNode(
  get: Getter,
  set: Setter,
  { action, focus }: IDispatchEventGeneric<INodeAddAction>,
) {
  const nodesState = { ...get(nodesAtom) };
  nodesState[action.node.id] = action.node;

  if (
    action.node.parentId &&
    !addToParent(nodesState, action.node.parentId, action.node, action.index)
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

function moveWithinPinnedEffect(
  get: Getter,
  set: Setter,
  nodeId: string,
  newIndex?: number,
) {
  const list = [...get(pinnedIdsAtom)];
  const prevIndex = moveWithinList(list, nodeId, newIndex);
  if (prevIndex === -1) {
    console.error(`Failed to move node ${nodeId} within pinned list`);
    return;
  }
  set(pinnedIdsAtom, list);
  const undoAction = makeAction.move(nodeId, null, prevIndex);
  set(undoStackAtom, [...get(undoStackAtom), undoAction]);
}

function moveWithinParentEffect(
  get: Getter,
  set: Setter,
  nodes: INodeMap,
  action: INodeMoveAction,
) {
  if (action.parentId == null) {
    throw new Error(`Parent ID is null while moving node within parent`);
  }

  const parent = nodes[action.parentId];
  if (!parent) {
    console.error(`Parent node ${action.parentId} not found while moving node`);
    return;
  }

  const childrenIds = parent.childrenIds ? [...parent.childrenIds] : [];
  const prevIndex = moveWithinList(childrenIds, action.nodeId, action.index);
  if (prevIndex === -1) {
    console.error(
      `Failed to move node ${action.nodeId} within parent ${action.parentId}`,
    );
    return;
  }
  const nextState = { ...nodes };
  nextState[action.parentId] = {
    ...parent,
    childrenIds,
    updatedAt: Date.now(),
  };
  set(nodesAtom, nextState);

  const undoAction = makeAction.move(action.nodeId, action.parentId, prevIndex);
  set(undoStackAtom, [...get(undoStackAtom), undoAction]);
}

function moveNodeEffect(
  get: Getter,
  set: Setter,
  nodes: INodeMap,
  action: INodeMoveAction,
) {
  // Validate
  const node = nodes[action.nodeId];
  let nodesState = { ...nodes };
  let pinnedIdsState = [...get(pinnedIdsAtom)];

  let prevParentId = node.parentId;
  let prevIndex = undefined;
  if (prevParentId == null) {
    prevIndex = pinnedIdsState.indexOf(node.id);
    if (prevIndex === -1) {
      prevIndex = undefined;
      console.warn(
        `Node ${node.id} not found in pinned list while moving node`,
      );
    }
    pinnedIdsState = pinnedIdsState.filter((id) => id !== node.id);
  } else {
    const prevParent = nodes[prevParentId];
    if (!prevParent) {
      console.error(`Parent node ${prevParentId} not found while moving node`);
      return;
    }
    prevIndex = prevParent.childrenIds?.indexOf(node.id);
    if (prevIndex != null && prevIndex >= 0) {
      prevIndex = undefined;
    }
    nodesState[prevParentId] = {
      ...prevParent,
      childrenIds: prevParent.childrenIds?.filter((id) => id !== node.id),
      updatedAt: Date.now(),
    };
  }

  if (action.parentId == null) {
    if (
      action.index != null &&
      action.index >= 0 &&
      action.index < pinnedIdsState.length
    ) {
      pinnedIdsState.splice(action.index, 0, node.id);
    } else {
      pinnedIdsState.push(node.id);
    }
  } else {
    const nextParent = nodesState[action.parentId];
    if (!nextParent) {
      console.error(`Cannot move to unknown parent node ${action.parentId}`);
      return;
    }

    const nextParentChildrenIds = nextParent.childrenIds
      ? [...nextParent.childrenIds]
      : [];
    if (
      action.index != null &&
      action.index >= 0 &&
      action.index < nextParentChildrenIds.length
    ) {
      nextParentChildrenIds.splice(action.index, 0, node.id);
    } else {
      nextParentChildrenIds.push(node.id);
    }
    nodesState[action.parentId] = {
      ...nodesState[action.parentId],
      childrenIds: nextParentChildrenIds,
      updatedAt: Date.now(),
    };
  }

  set(nodesAtom, nodesState);
  set(pinnedIdsAtom, pinnedIdsState);

  const undoAction = makeAction.move(action.nodeId, prevParentId, prevIndex);
  set(undoStackAtom, [...get(undoStackAtom), undoAction]);
}

function handleRemoveAction(
  get: Getter,
  set: Setter,
  action: INodeRemoveAction,
) {
  const state = { ...get(nodesAtom) };
  const prev = state[action.node.id];

  let prevParentId = prev.parentId;
  let prevIndex = undefined;
  if (prevParentId) {
    const parent = state[prevParentId];
    if (!parent) {
      prevParentId = null;
    } else {
      prevIndex = parent.childrenIds?.indexOf(prev.id);
      if (prevIndex === -1) {
        console.error(
          `Node ${prev.id} not found in parent ${prevParentId} while removing node`,
          action,
        );
        prevIndex = undefined;
      } else {
        state[prevParentId] = {
          ...parent,
          childrenIds: parent.childrenIds?.filter((id) => id !== prev.id),
          updatedAt: Date.now(),
        };
      }
    }
  }

  if (prevParentId == null) {
    const list = get(pinnedIdsAtom);
    prevIndex = list.indexOf(prev.id);
    if (prevIndex === -1) {
      console.error(
        `Node ${prev.id} not found in pinned list while removing node`,
        action,
      );
      prevIndex = undefined;
    } else {
      const nextList = [...list];
      nextList.splice(prevIndex, 1);
      set(pinnedIdsAtom, nextList);
    }
  }

  delete state[action.nodeId];
  set(nodesAtom, state);

  const undoAction = makeAction.create(prevParentId, prevIndex, prev);
  set(undoStackAtom, [...get(undoStackAtom), undoAction]);
}

export function handleFocusAction(get: Getter, set: Setter, action: I) {
  const focusedState = get(focusedIdAtom);
  set(focusedIdAtom, action.nodeId);
}
