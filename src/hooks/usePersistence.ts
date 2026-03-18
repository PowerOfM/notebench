import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { db } from '../lib/db';
import type { NodeData, NodeMap } from '../types/node';

const SETTINGS_KEYS = ['projectColumns', 'dailyColumns'] as const;
type SettingsKey = typeof SETTINGS_KEYS[number];

/**
 * Loads data from IndexedDB on mount, then subscribes to store changes
 * and debounces saves back to IndexedDB.
 */
export function usePersistence() {
  const loadNodes = useStore((s) => s.loadNodes);
  const setActiveProject = useStore((s) => s.setActiveProject);
  const setProjectColumns = useStore((s) => s.setProjectColumns);
  const setDailyColumns = useStore((s) => s.setDailyColumns);
  const dirtyRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevNodesRef = useRef<NodeMap>({});
  const prevRootIdsRef = useRef<string[]>([]);

  // Load from DB on mount
  useEffect(() => {
    async function load() {
      const [allNodes, rootIdsMeta, ...settingsMetas] = await Promise.all([
        db.nodes.toArray(),
        db.meta.get('rootIds'),
        ...SETTINGS_KEYS.map((k) => db.meta.get(k)),
      ]);
      const rootIds: string[] = rootIdsMeta ? (rootIdsMeta.value as string[]) : [];
      loadNodes(allNodes, rootIds);

      // Restore settings
      const setters: Record<SettingsKey, (n: number) => void> = {
        projectColumns: setProjectColumns,
        dailyColumns: setDailyColumns,
      };
      SETTINGS_KEYS.forEach((key, i) => {
        const meta = settingsMetas[i];
        if (meta?.value != null) setters[key](meta.value as number);
      });

      // Auto-activate first root node as project if any
      if (rootIds.length > 0) {
        setActiveProject(rootIds[0]);
      }
    }
    load();
  }, [loadNodes, setActiveProject, setProjectColumns, setDailyColumns]);

  // Save settings to meta when they change
  useEffect(() => {
    const unsub = useStore.subscribe((state, prev) => {
      const saves: Promise<unknown>[] = [];
      for (const key of SETTINGS_KEYS) {
        if (state[key] !== prev[key]) {
          saves.push(db.meta.put({ key, value: state[key] }));
        }
      }
      if (saves.length > 0) Promise.all(saves);
    });
    return () => unsub();
  }, []);

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
