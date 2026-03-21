import type { NodeData, NodeMap } from "../types/node";
import { resolveLink } from "./linkResolver";

export interface FlatNode {
  id: string;
  depth: number;
}

export interface DragProjection {
  depth: number;
  parentId: string | null;
  index: number;
}

function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const copy = [...array];
  copy.splice(to < 0 ? copy.length + to : to, 0, copy.splice(from, 1)[0]);
  return copy;
}

/**
 * Compute where a dragged node will land given the current over target and
 * horizontal drag offset.
 */
export function getProjection(
  items: FlatNode[],
  activeId: string,
  overId: string,
  dragOffsetX: number,
  indentSize: number,
): DragProjection | null {
  const activeIndex = items.findIndex((i) => i.id === activeId);
  const overIndex = items.findIndex((i) => i.id === overId);
  if (activeIndex === -1 || overIndex === -1) return null;

  const activeItem = items[activeIndex];
  const newItems = arrayMove(items, activeIndex, overIndex);
  const newActiveIndex = overIndex;

  const previousItem = newItems[newActiveIndex - 1];
  const nextItem = newItems[newActiveIndex + 1];

  const depthDelta = Math.round(dragOffsetX / indentSize);
  const rawDepth = activeItem.depth + depthDelta;
  const maxDepth = previousItem ? previousItem.depth + 1 : 0;
  const minDepth = nextItem ? nextItem.depth : 0;
  const depth = Math.max(minDepth, Math.min(maxDepth, rawDepth));

  // Find parentId at the computed depth
  let parentId: string | null = null;
  if (depth > 0) {
    for (let i = newActiveIndex - 1; i >= 0; i--) {
      if (newItems[i].depth === depth - 1) {
        parentId = newItems[i].id;
        break;
      }
      if (newItems[i].depth < depth - 1) break;
    }
  }

  // Count siblings that precede active in the new order to get insertion index
  let index = 0;
  if (parentId !== null) {
    const parentPos = newItems.findIndex((i) => i.id === parentId);
    for (let i = parentPos + 1; i < newActiveIndex; i++) {
      if (newItems[i].depth < depth) break;
      if (newItems[i].depth === depth) index++;
    }
  } else {
    for (let i = 0; i < newActiveIndex; i++) {
      if (newItems[i].depth === 0) index++;
    }
  }

  return { depth, parentId, index };
}

/**
 * Flatten the visible tree (respecting collapsed) into an ordered array.
 */
export function flattenVisible(
  ids: string[],
  nodes: NodeMap,
  depth = 0,
): FlatNode[] {
  const result: FlatNode[] = [];
  for (const id of ids) {
    const node = nodes[id];
    if (!node) continue;
    result.push({ id, depth });
    // Link nodes use their own collapsed state but show the target's children
    const effectiveChildren = node.linkId
      ? (resolveLink(node.linkId, nodes)?.childrenIds ?? [])
      : node.childrenIds;
    if (!node.collapsed && effectiveChildren.length > 0) {
      result.push(...flattenVisible(effectiveChildren, nodes, depth + 1));
    }
  }
  return result;
}

/**
 * Get siblings of a node (children of its parent, or rootIds).
 */
export function getSiblings(
  node: NodeData,
  nodes: NodeMap,
  rootIds: string[],
): string[] {
  if (node.parentId === null) return rootIds;
  const parent = nodes[node.parentId];
  return parent ? parent.childrenIds : [];
}

/**
 * Get all descendant IDs of a node.
 */
export function getDescendantIds(id: string, nodes: NodeMap): string[] {
  const node = nodes[id];
  if (!node) return [];
  const result: string[] = [];
  for (const childId of node.childrenIds) {
    result.push(childId, ...getDescendantIds(childId, nodes));
  }
  return result;
}
