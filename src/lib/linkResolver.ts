import type { NodeData, NodeMap } from '../types/node';

const MAX_DEPTH = 10;

/**
 * Walk the linkedNodeId chain starting from `nodeId`, returning the first
 * node in the chain that is NOT itself a link (or null if the chain is broken).
 *
 * Stops at depth 10 to prevent infinite loops from circular references.
 */
export function resolveLink(nodeId: string, nodes: NodeMap): NodeData | null {
  let current = nodes[nodeId];
  let depth = 0;

  while (current?.linkedNodeId && depth < MAX_DEPTH) {
    const next = nodes[current.linkedNodeId];
    if (!next) return null; // broken — target deleted
    current = next;
    depth++;
  }

  return current ?? null;
}
