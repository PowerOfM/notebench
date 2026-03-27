import { INodeMap } from "../types/node";

export function addToParent(
  mutableState: INodeMap,
  parentId: string,
  childId: string,
  index?: number,
) {
  const parent = mutableState[parentId];
  if (!parent) {
    console.error(`Parent node ${parentId} not found`);
    return false;
  }

  const childrenIds = parent.childrenIds ? [...parent.childrenIds] : [];
  if (index != null && index >= 0 && index < childrenIds.length) {
    childrenIds.splice(index, 0, childId);
  } else {
    childrenIds.push(childId);
  }
  mutableState[parentId] = { ...parent, childrenIds, updatedAt: Date.now() };
  return true;
}

export function removeFromParent(
  mutableState: INodeMap,
  parentId: string,
  childId: string,
) {
  const parent = mutableState[parentId];
  if (!parent) {
    console.error(`Parent node ${parentId} not found`);
    return undefined;
  }

  const childrenIds = parent.childrenIds ? [...parent.childrenIds] : [];
  const index = childrenIds.indexOf(childId);
  if (index === -1) {
    return undefined;
  }

  childrenIds.splice(index, 1);
  mutableState[parentId] = { ...parent, childrenIds, updatedAt: Date.now() };
  return index;
}

export function addToPinned(
  mutableState: string[],
  childId: string,
  index?: number,
) {
  if (index != null && index >= 0 && index < mutableState.length) {
    mutableState.splice(index, 0, childId);
  } else {
    mutableState.push(childId);
  }
  return true;
}

export function removeFromPinned(mutableState: string[], childId: string) {
  const index = mutableState.indexOf(childId);
  if (index === -1) {
    return undefined;
  }

  mutableState.splice(index, 1);
  return index;
}
