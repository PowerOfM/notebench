import Fuse from "fuse.js";
import { useMemo, useRef } from "react";
import type { INode, INodeMap } from "../types/node";

const FUSE_OPTIONS = {
  keys: ["content"],
  threshold: 0.4,
  minMatchCharLength: 1,
  isCaseSensitive: true,
};

export function useFuzzySearch(
  nodeMap: INodeMap,
  excludeNodeId: string,
  query: string,
): INode[] {
  const fuseRef = useRef<Fuse<INode> | null>(null);
  const candidates = useMemo(
    () => Object.values(nodeMap).filter((node) => node.id !== excludeNodeId),
    [nodeMap, excludeNodeId],
  );

  return useMemo(() => {
    if (!query.trim()) {
      return candidates.slice(0, 8);
    }

    if (!fuseRef.current) {
      fuseRef.current = new Fuse(candidates, FUSE_OPTIONS);
    }

    return fuseRef.current
      .search(query)
      .slice(0, 8)
      .map((r) => r.item);
  }, [query, candidates]);
}
