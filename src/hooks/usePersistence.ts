import { useEffect, useRef } from "react";
import { getDefaultStore } from "jotai";
import { db } from "../lib/db";
import { nodesAtom, pinnedIdsAtom, dailyIdsAtom, activeParentIdAtom } from "../store/atoms";
import type { INode, INodeMap } from "../types/node";

export function usePersistence() {
  const store = getDefaultStore();
  const dirtyRef = useRef<Set<string>>(new Set());
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const pinnedDirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevNodesRef = useRef<INodeMap>({});

  // Load from DB on mount
  useEffect(() => {
    async function load() {
      const allNodes = await db.nodes.toArray();
      const nodeMap: INodeMap = {};
      const pinnedIds: string[] = [];
      const dailyIds: string[] = [];

      for (const node of allNodes) {
        nodeMap[node.id] = node;
        if (node.isPinned) pinnedIds.push(node.id);
        if (node.isDaily) dailyIds.push(node.id);
      }

      // Restore pinned order from meta
      const pinnedMeta = await db.meta.get("pinnedIds");
      const orderedPinned = pinnedMeta?.value as string[] | undefined;
      const finalPinned = orderedPinned
        ? orderedPinned.filter((id) => nodeMap[id])
        : pinnedIds;

      store.set(nodesAtom, nodeMap);
      store.set(pinnedIdsAtom, finalPinned);
      store.set(dailyIdsAtom, dailyIds);

      if (finalPinned.length > 0) {
        store.set(activeParentIdAtom, finalPinned[0]);
      }
    }
    load();
  }, []);

  // Subscribe to atom changes and debounce saves
  useEffect(() => {
    const unsub = store.sub(nodesAtom, () => {
      const nodes = store.get(nodesAtom);
      const prev = prevNodesRef.current;

      for (const id in nodes) {
        if (nodes[id] !== prev[id]) dirtyRef.current.add(id);
      }
      for (const id in prev) {
        if (!nodes[id]) {
          deletedIdsRef.current.add(id);
          dirtyRef.current.delete(id);
        }
      }
      prevNodesRef.current = nodes;
      scheduleSave();
    });

    const unsubPinned = store.sub(pinnedIdsAtom, () => {
      pinnedDirtyRef.current = true;
      scheduleSave();
    });

    function scheduleSave() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const dirty = [...dirtyRef.current];
        dirtyRef.current.clear();
        const deletedIds = [...deletedIdsRef.current];
        deletedIdsRef.current.clear();
        const savePinned = pinnedDirtyRef.current;
        pinnedDirtyRef.current = false;

        const nodes = store.get(nodesAtom);
        const toSave: INode[] = dirty.filter((id) => nodes[id]).map((id) => nodes[id]);

        await Promise.all([
          toSave.length > 0 ? db.nodes.bulkPut(toSave) : Promise.resolve(),
          deletedIds.length > 0 ? db.nodes.bulkDelete(deletedIds as "id"[]) : Promise.resolve(),
          savePinned ? db.meta.put({ key: "pinnedIds", value: store.get(pinnedIdsAtom) }) : Promise.resolve(),
        ]);
      }, 300);
    }

    return () => {
      unsub();
      unsubPinned();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
