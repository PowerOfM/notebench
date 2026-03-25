import { Getter, Setter } from "jotai";
import { makeAction } from "./actions";
import type {
  IDispatchEvent,
  IDispatchEventGeneric,
  INodeAddAction,
  INodeMoveAction,
  INodeRemoveAction,
  INodeUpdateAction,
} from "../types/actions";
import type { INode, INodeMap } from "../types/node";
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
  if (!node) {
    console.error(`Node ${action.nodeId} not found while updating`);
    return;
  }
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

// ── Move helpers ─────────────────────────────────────────────────────────────

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
  mutableList.splice(newIndex ?? mutableList.length, 0, nodeId);
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
  const node = nodes[action.nodeId];
  if (!node) {
    console.error(`Node ${action.nodeId} not found while moving`);
    return;
  }
  let nodesState = { ...nodes };
  let pinnedIdsState = [...get(pinnedIdsAtom)];

  let prevParentId = node.parentId;
  let prevIndex: number | undefined;

  if (prevParentId == null) {
    const idx = pinnedIdsState.indexOf(node.id);
    prevIndex = idx >= 0 ? idx : undefined;
    pinnedIdsState = pinnedIdsState.filter((id) => id !== node.id);
  } else {
    const prevParent = nodes[prevParentId];
    if (!prevParent) {
      console.error(`Parent node ${prevParentId} not found while moving node`);
      return;
    }
    const idx = prevParent.childrenIds?.indexOf(node.id) ?? -1;
    prevIndex = idx >= 0 ? idx : undefined;
    nodesState[prevParentId] = {
      ...prevParent,
      childrenIds: prevParent.childrenIds?.filter((id) => id !== node.id),
      updatedAt: Date.now(),
    };
  }

  // Update node's parentId
  nodesState[action.nodeId] = { ...nodesState[action.nodeId], parentId: action.parentId };

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

export function handleMoveNode(
  get: Getter,
  set: Setter,
  action: INodeMoveAction,
) {
  const nodes = get(nodesAtom);
  const node = nodes[action.nodeId];
  if (!node) {
    console.error(`Node ${action.nodeId} not found while moving node`, action);
    return;
  }

  if (node.parentId == null && action.parentId == null) {
    moveWithinPinnedEffect(get, set, node.id, action.index);
  } else if (node.parentId === action.parentId) {
    moveWithinParentEffect(get, set, nodes, action);
  } else {
    moveNodeEffect(get, set, nodes, action);
  }
}

export function handleRemoveNode(
  get: Getter,
  set: Setter,
  action: INodeRemoveAction,
) {
  const state = { ...get(nodesAtom) };
  const prev = state[action.node.id];
  if (!prev) {
    console.error(`Node ${action.node.id} not found while removing`);
    return;
  }

  let prevParentId = prev.parentId;
  let prevIndex: number | undefined;

  if (prevParentId) {
    const parent = state[prevParentId];
    if (!parent) {
      prevParentId = null;
    } else {
      const idx = parent.childrenIds?.indexOf(prev.id) ?? -1;
      if (idx === -1) {
        console.error(
          `Node ${prev.id} not found in parent ${prevParentId} while removing node`,
          action,
        );
      } else {
        prevIndex = idx;
        state[prevParentId] = {
          ...parent,
          childrenIds: parent.childrenIds?.filter((id) => id !== prev.id),
          updatedAt: Date.now(),
        };
      }
    }
  }

  if (prevParentId == null) {
    const list = [...get(pinnedIdsAtom)];
    const idx = list.indexOf(prev.id);
    if (idx === -1) {
      console.error(
        `Node ${prev.id} not found in pinned list while removing node`,
        action,
      );
    } else {
      prevIndex = idx;
      list.splice(idx, 1);
      set(pinnedIdsAtom, list);
    }
  }

  delete state[action.node.id];
  set(nodesAtom, state);

  const undoAction = makeAction.create(prevParentId ?? null, prev, prevIndex);
  set(undoStackAtom, [...get(undoStackAtom), undoAction]);
}
