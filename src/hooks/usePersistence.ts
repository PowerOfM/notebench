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
  const createDailyNode = useStore((s) => s.createDailyNode);

  // Accumulated dirty state — persists across subscription calls so the
  // debounced timer always sees the full picture regardless of which
  // subscription invocation last reset the timer.
  const dirtyRef = useRef<Set<string>>(new Set());
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const rootIdsDirtyRef = useRef(false);
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

      // Auto-create today's daily node if it doesn't exist yet
      const todayDate = new Date().toISOString().slice(0, 10);
      const hasTodayNode = allNodes.some(
        (n) => n.isDaily && n.dailyDate === todayDate
      );
      if (!hasTodayNode) {
        createDailyNode(todayDate);
      }

      // Auto-activate first non-daily root node, or fall back to today's daily
      const firstProjectId = rootIds.find((id) => {
        const n = allNodes.find((x) => x.id === id);
        return n && !n.isDaily;
      });
      if (firstProjectId) {
        setActiveProject(firstProjectId);
      } else if (rootIds.length > 0) {
        setActiveProject(rootIds[0]);
      }
    }
    load();
  }, [loadNodes, setActiveProject, setProjectColumns, setDailyColumns, createDailyNode]);

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

      // Accumulate changed nodes into the dirty ref
      for (const id in nodes) {
        if (nodes[id] !== prevNodesRef.current[id]) {
          dirtyRef.current.add(id);
        }
      }

      // Accumulate deleted nodes into the deleted ref
      for (const id in prevNodesRef.current) {
        if (!nodes[id]) {
          deletedIdsRef.current.add(id);
          // A deleted node is definitely no longer dirty
          dirtyRef.current.delete(id);
        }
      }

      // Accumulate rootIds changes
      if (JSON.stringify(rootIds) !== JSON.stringify(prevRootIdsRef.current)) {
        rootIdsDirtyRef.current = true;
      }

      prevNodesRef.current = nodes;
      prevRootIdsRef.current = rootIds;

      if (
        dirtyRef.current.size === 0 &&
        deletedIdsRef.current.size === 0 &&
        !rootIdsDirtyRef.current
      ) {
        return;
      }

      // Debounce the actual DB write
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        // Drain all accumulated dirty state
        const dirty = [...dirtyRef.current];
        dirtyRef.current.clear();
        const deletedIds = [...deletedIdsRef.current];
        deletedIdsRef.current.clear();
        const shouldSaveRootIds = rootIdsDirtyRef.current;
        rootIdsDirtyRef.current = false;

        // Use the live store state for nodes/rootIds so we always write
        // the latest values rather than stale closure data.
        const liveState = useStore.getState();

        const toSave: NodeData[] = [];
        for (const id of dirty) {
          if (liveState.nodes[id]) toSave.push(liveState.nodes[id]);
        }

        await Promise.all([
          toSave.length > 0 ? db.nodes.bulkPut(toSave) : Promise.resolve(),
          deletedIds.length > 0 ? db.nodes.bulkDelete(deletedIds) : Promise.resolve(),
          shouldSaveRootIds
            ? db.meta.put({ key: 'rootIds', value: liveState.rootIds })
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
