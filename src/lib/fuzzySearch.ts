import Fuse from 'fuse.js';
import type { NodeData } from '../types/node';

const FUSE_OPTIONS = {
  keys: ['content'],
  threshold: 0.4,
  minMatchCharLength: 1,
};

export function fuzzySearchNodes(query: string, candidates: NodeData[]): NodeData[] {
  if (!query.trim()) return candidates.slice(0, 8);
  const fuse = new Fuse(candidates, FUSE_OPTIONS);
  return fuse.search(query).slice(0, 8).map((r) => r.item);
}
