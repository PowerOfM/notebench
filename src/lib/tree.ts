import type { NodeData, NodeMap } from '../types/node';
import { resolveLink } from './linkResolver';

export interface FlatNode {
  id: string;
  depth: number;
}

/**
 * Flatten the visible tree (respecting collapsed) into an ordered array.
 */
export function flattenVisible(
  ids: string[],
  nodes: NodeMap,
  depth = 0
): FlatNode[] {
  const result: FlatNode[] = [];
  for (const id of ids) {
    const node = nodes[id];
    if (!node) continue;
    result.push({ id, depth });
    // Link nodes use their own collapsed state but show the target's children
    const effectiveChildren = node.linkedNodeId
      ? (resolveLink(node.linkedNodeId, nodes)?.childrenIds ?? [])
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
  rootIds: string[]
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
