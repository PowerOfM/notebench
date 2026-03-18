import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { db } from '../lib/db';
import type { NodeData, NodeMap } from '../types/node';

/**
 * Loads data from IndexedDB on mount, then subscribes to store changes
 * and debounces saves back to IndexedDB.
 */
export function usePersistence() {
  const loadNodes = useStore((s) => s.loadNodes);
  const setActiveProject = useStore((s) => s.setActiveProject);
  const dirtyRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevNodesRef = useRef<NodeMap>({});
  const prevRootIdsRef = useRef<string[]>([]);

  // Load from DB on mount
  useEffect(() => {
    async function load() {
      const [allNodes, rootIdsMeta] = await Promise.all([
        db.nodes.toArray(),
        db.meta.get('rootIds'),
      ]);
      const rootIds: string[] = rootIdsMeta ? (rootIdsMeta.value as string[]) : [];
      loadNodes(allNodes, rootIds);

      // Auto-activate first root node as project if any
      if (rootIds.length > 0) {
        setActiveProject(rootIds[0]);
      }
    }
    load();
  }, [loadNodes, setActiveProject]);

  // Subscribe to changes and debounce writes
  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      const { nodes, rootIds } = state;

      // Find changed nodes
      for (const id in nodes) {
        if (nodes[id] !== prevNodesRef.current[id]) {
          dirtyRef.current.add(id);
        }
      }

      // Find deleted nodes
      const deletedIds: string[] = [];
      for (const id in prevNodesRef.current) {
        if (!nodes[id]) {
          deletedIds.push(id);
        }
      }

      const rootIdsChanged =
        JSON.stringify(rootIds) !== JSON.stringify(prevRootIdsRef.current);

      prevNodesRef.current = nodes;
      prevRootIdsRef.current = rootIds;

      if (dirtyRef.current.size === 0 && deletedIds.length === 0 && !rootIdsChanged) return;

      // Debounce the actual DB write
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const dirty = [...dirtyRef.current];
        dirtyRef.current.clear();

        const toSave: NodeData[] = [];
        for (const id of dirty) {
          if (nodes[id]) toSave.push(nodes[id]);
        }

        await Promise.all([
          toSave.length > 0 ? db.nodes.bulkPut(toSave) : Promise.resolve(),
          deletedIds.length > 0 ? db.nodes.bulkDelete(deletedIds) : Promise.resolve(),
          rootIdsChanged
            ? db.meta.put({ key: 'rootIds', value: state.rootIds })
            : Promise.resolve(),
        ]);
      }, 300);
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
