import { INodeMap, INode } from "../types/node";

export function addToParent(
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

export function removeFromParent(
  state: INodeMap,
  parentId: string,
  child: INode,
) {
  const parent = state[parentId];
  if (!parent) {
    console.error(`Parent node ${parentId} not found`);
    return -1;
  }

  const childrenIds = parent.childrenIds ? [...parent.childrenIds] : [];
  const index = childrenIds.indexOf(child.id);
  if (index !== -1) {
    childrenIds.splice(index, 1);
    state[parentId] = { ...parent, childrenIds, updatedAt: Date.now() };
  }

  return index;
}

export function addToPinned(state: string[], childId: string, index?: number) {
  if (index != null && index >= 0 && index < state.length) {
    state.splice(index, 0, childId);
  } else {
    state.push(childId);
  }
  return true;
}

export function removeFromPinned(state: string[], child: INode) {
  const index = state.indexOf(child.id);
  if (index !== -1) {
    state.splice(index, 1);
  }
  return index;
}
