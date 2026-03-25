import { useAtomValue, getDefaultStore } from "jotai";
import { useEffect, useRef } from "react";
import { db } from "../lib/db";
import { nodesAtom, pinnedIdsAtom } from "../store/atoms";
import type { INode, INodeMap } from "../types/node";

const jotaiStore = getDefaultStore();

/**
 * Loads data from IndexedDB on mount, then subscribes to atom changes
 * and debounces saves back to IndexedDB.
 */
export function usePersistence() {
  const nodes = useAtomValue(nodesAtom);
  const pinnedIds = useAtomValue(pinnedIdsAtom);

  // Track previous snapshots so we can detect deltas
  const prevNodesRef = useRef<INodeMap>({});
  const prevPinnedIdsRef = useRef<string[]>([]);
  const dirtyRef = useRef<Set<string>>(new Set());
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const pinnedDirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  // ── Load from DB on mount ──────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [allNodes, pinnedIdsMeta] = await Promise.all([
        db.nodes.toArray(),
        db.meta.get("pinnedIds"),
      ]);

      const savedPinnedIds: string[] = pinnedIdsMeta
        ? (pinnedIdsMeta.value as string[])
        : [];

      // Build node map
      const nodeMap: INodeMap = {};
      for (const node of allNodes) {
        nodeMap[node.id] = node;
      }

      // Set atoms directly via the global store (bypasses dispatch to avoid undo entries)
      jotaiStore.set(nodesAtom, nodeMap);
      jotaiStore.set(pinnedIdsAtom, savedPinnedIds);

      loadedRef.current = true;
      prevNodesRef.current = nodeMap;
      prevPinnedIdsRef.current = savedPinnedIds;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Debounced auto-save ────────────────────────────────────────────────────
  useEffect(() => {
    if (!loadedRef.current) return;

    // Compute delta from previous snapshot
    for (const id in nodes) {
      if (nodes[id] !== prevNodesRef.current[id]) {
        dirtyRef.current.add(id);
      }
    }
    for (const id in prevNodesRef.current) {
      if (!nodes[id]) {
        deletedIdsRef.current.add(id);
        dirtyRef.current.delete(id);
      }
    }
    prevNodesRef.current = nodes;

    if (pinnedIds !== prevPinnedIdsRef.current) {
      pinnedDirtyRef.current = true;
      prevPinnedIdsRef.current = pinnedIds;
    }

    if (
      dirtyRef.current.size === 0 &&
      deletedIdsRef.current.size === 0 &&
      !pinnedDirtyRef.current
    ) {
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const dirty = [...dirtyRef.current];
      dirtyRef.current.clear();
      const deletedIds = [...deletedIdsRef.current];
      deletedIdsRef.current.clear();
      const shouldSavePinnedIds = pinnedDirtyRef.current;
      pinnedDirtyRef.current = false;

      // Read latest from ref (not stale closure)
      const liveNodes = prevNodesRef.current;
      const toSave: INode[] = [];
      for (const id of dirty) {
        if (liveNodes[id]) toSave.push(liveNodes[id]);
      }

      await Promise.all([
        toSave.length > 0 ? db.nodes.bulkPut(toSave) : Promise.resolve(),
        deletedIds.length > 0
          ? db.nodes.bulkDelete(deletedIds)
          : Promise.resolve(),
        shouldSavePinnedIds
          ? db.meta.put({ key: "pinnedIds", value: prevPinnedIdsRef.current })
          : Promise.resolve(),
      ]);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [nodes, pinnedIds]);
}
