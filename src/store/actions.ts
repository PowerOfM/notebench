import { atom, Getter, Setter } from "jotai";
import { createNode } from "../lib/tree";
import type {
  INodeAction,
  INodeCreateAction,
  INodeFocusAction,
  INodeMoveAction,
  INodeRemoveAction,
  INodeUpdateAction,
} from "../types/actions";
import type { INode, INodeChanges, INodeMap } from "../types/node";
import {
  activeNodeIdAtom,
  nodesAtom,
  pinnedIdsAtom,
  undoStackAtom,
} from "./atoms";

export const makeAction = {
  create: (
    parentId: string | null,
    index?: number,
    payload: INodeChanges = {},
    autoFocus = true,
  ): INodeCreateAction => ({
    type: "create",
    parentId,
    index,
    payload,
    autoFocus,
  }),
  update: (nodeId: string, payload: INodeChanges): INodeUpdateAction => ({
    type: "update",
    nodeId,
    payload,
  }),
  move: (
    nodeId: string,
    parentId: string | null,
    index?: number,
  ): INodeMoveAction => ({
    type: "move",
    nodeId,
    parentId,
    index,
  }),
  remove: (node: INode): INodeRemoveAction => ({
    type: "remove",
    nodeId: node.id,
    payload: node,
  }),
  focus: (nodeId: string): INodeFocusAction => ({
    type: "focus",
    nodeId,
  }),
};

function pick<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
  return keys.reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {} as Partial<T>);
}

function updateParent(
  state: INodeMap,
  parentId: string,
  child: INode,
  index?: number,
) {
  const parent = state[parentId];
  if (!parent) {
    console.error(`Parent node ${parentId} not found`);
    return false;
  }

  const childrenIds = parent.childrenIds ? [...parent.childrenIds] : [];
  if (index != null && index >= 0 && index < childrenIds.length) {
    childrenIds.splice(index, 0, child.id);
  } else {
    childrenIds.push(child.id);
  }
  state[parentId] = { ...parent, childrenIds, updatedAt: Date.now() };
  return true;
}

function createNodeEffect(
  get: Getter,
  set: Setter,
  nodes: INodeMap,
  action: INodeCreateAction,
) {
  const state = { ...nodes };
  const node = createNode({ parentId: action.parentId });
  if (
    node.parentId &&
    !updateParent(state, node.parentId, node, action.index)
  ) {
    node.parentId = null;
  }

  if (node.parentId == null) {
    const list = get(pinnedIdsAtom);
    list.push(node.id);
    set(pinnedIdsAtom, list);
  }
  set(nodesAtom, state);

  const undoAction = makeAction.create(node.parentId, action.index, node);
  const undoStack = [...get(undoStackAtom), undoAction];
  if (action.autoFocus) {
    set(activeNodeIdAtom, node.id);
    undoStack.push(makeAction.focus(node.id));
  }
  set(undoStackAtom, undoStack);

  return node;
}

function updateNodeEffect(
  get: Getter,
  set: Setter,
  nodes: INodeMap,
  action: INodeUpdateAction,
) {
  const state = { ...nodes };
  const node = state[action.nodeId];
  const prev = pick(node, Object.keys(action.payload) as (keyof INode)[]);
  const next = {
    ...node,
    ...action.payload,
    updatedAt: Date.now(),
  };
  state[action.nodeId] = next;
  set(nodesAtom, state);

  const undoAction = makeAction.update(action.nodeId, prev);
  set(undoStackAtom, [...get(undoStackAtom), undoAction]);
  return next;
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

function removeNodeEffect(
  get: Getter,
  set: Setter,
  nodes: INodeMap,
  action: INodeRemoveAction,
) {
  const state = { ...nodes };
  const prev = state[action.nodeId];

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

export const nodeActionAtom = atom(null, (get, set, action: INodeAction) => {
  const nodes = get(nodesAtom);
  if ("nodeId" in action && !nodes[action.nodeId]) {
    console.error(
      `Node ${action.nodeId} not found while applying action`,
      action,
    );
    return;
  }

  switch (action.type) {
    case "create": {
      return createNodeEffect(get, set, nodes, action);
    }
    case "update": {
      return updateNodeEffect(get, set, nodes, action);
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
      const prev = get(activeNodeIdAtom);
      if (prev !== action.nodeId) {
        set(activeNodeIdAtom, action.nodeId);
        if (prev != null) {
          set(undoStackAtom, [...get(undoStackAtom), makeAction.focus(prev)]);
        }
      }
      break;
    }
  }
});

export const undoAtom = atom(null, (get, set) => {
  const stack = get(undoStackAtom);
  if (stack.length === 0) return;
  const action = stack[stack.length - 1];
  set(undoStackAtom, stack.slice(0, -1));
  // Re-apply the inverse action (which was pushed as the undo entry)
  const nodes = get(nodesAtom);
  switch (action.type) {
    case "create":
      createNodeEffect(get, set, nodes, action);
      break;
    case "update":
      updateNodeEffect(get, set, nodes, action);
      break;
    case "remove":
      removeNodeEffect(get, set, nodes, action);
      break;
    case "move": {
      const node = nodes[action.nodeId];
      if (!node) return;
      if (node.parentId == null && action.parentId == null) {
        moveWithinPinnedEffect(get, set, node.id, action.index);
      } else if (node.parentId === action.parentId) {
        moveWithinParentEffect(get, set, nodes, action);
      } else {
        moveNodeEffect(get, set, nodes, action);
      }
      break;
    }
    case "focus":
      set(activeNodeIdAtom, action.nodeId);
      break;
  }
});
