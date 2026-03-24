import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { generateId } from "../lib/id";
import { createNode, getSiblings, ROOT_ID } from "../lib/tree";
import type { INode, INodeMap } from "../types/node";
import type { TreeActions, TreeState } from "./slices/treeSlice";
import type { UIActions, UIState } from "./slices/uiSlice";

type StoreState = TreeState & TreeActions & UIState & UIActions;

// ── History ──────────────────────────────────────────────────────────────────
// Stored outside Zustand/Immer state to avoid draft-proxy complications when
// restoring previous snapshots. canUndo/canRedo stay in reactive state for UI.
interface Snapshot {
  nodes: INodeMap;
  rootIds: string[];
}
const past: Snapshot[] = [];
const future: Snapshot[] = [];
const MAX_HISTORY = 50;
let lastTextSnapshotAt = 0;

function takeSnapshot(nodes: INodeMap, rootIds: string[]) {
  past.push({ nodes, rootIds: [...rootIds] });
  if (past.length > MAX_HISTORY) past.shift();
  future.length = 0;
}

export const useTreeStore = create<TreeState>()(
  immer((set, _get) => ({
    nodes: createNode(ROOT_ID),
    pinnedIds: [ROOT_ID],
    dailyIds: [],

    load: (tree: INode, dailyIds: string[], pinnedIds: string[]) => {
      set((state) => {
        state.tree = tree;
        state.dailyIds = dailyIds;
        state.pinnedIds = pinnedIds;
      });
    },

    update: (nodeId: string, changes: Partial<INode>) => {
      set((state) => {
        if (!state.tree[nodeId]) {
          console.error(`Node ${nodeId} not found while applying update`, {});
          return;
        }
        state.tree[nodeId] = { ...state.tree[nodeId], ...content };
      });
    },
  })),
);

export const useStore = create<StoreState>()(
  immer((set, _get) => ({
    // --- Tree State ---
    tree: createNode(ROOT_ID),
    pinnedIds: [ROOT_ID],
    dailyIds: [],

    loadNodes(nodes: INode[], rootIds: string[]) {
      set((state) => {
        state.nodes = {};
        for (const n of nodes) {
          state.nodes[n.id] = n;
        }
        state.rootIds = rootIds;
      });
    },

    createNode(parentId: string | null, afterId?: string): string {
      const id = generateId();
      const now = Date.now();
      const { nodes, rootIds } = _get();
      takeSnapshot(nodes, rootIds);
      set((state) => {
        state.canUndo = true;
        state.canRedo = false;
        state.nodes[id] = {
          id,
          parentId,
          content: "",
          mentions: [],
          statusType: "none",
          projectStatus: null,
          checked: false,
          collapsed: false,
          childrenIds: [],
          createdAt: now,
          updatedAt: now,
          isDaily: false,
          dailyDate: null,
          linkId: null,
        };
        const siblings =
          parentId === null
            ? state.rootIds
            : (state.nodes[parentId]?.childrenIds ?? state.rootIds);
        if (afterId) {
          const idx = siblings.indexOf(afterId);
          siblings.splice(idx + 1, 0, id);
        } else {
          siblings.push(id);
        }
      });
      return id;
    },

    updateContent(
      id: string,
      content: string,
      mentions?: import("../types/node").IMention[],
    ) {
      const now = Date.now();
      const shouldSnapshot = now - lastTextSnapshotAt >= 1000;
      if (shouldSnapshot) {
        lastTextSnapshotAt = now;
        const { nodes, rootIds } = _get();
        takeSnapshot(nodes, rootIds);
      }
      set((state) => {
        if (state.nodes[id]) {
          state.nodes[id].content = content;
          if (mentions !== undefined) state.nodes[id].mentions = mentions;
          state.nodes[id].updatedAt = now;
          if (shouldSnapshot) {
            state.canUndo = true;
            state.canRedo = false;
          }
        }
      });
    },

    deleteNode(id: string) {
      const { nodes, rootIds } = _get();
      takeSnapshot(nodes, rootIds);
      set((state) => {
        state.canUndo = true;
        state.canRedo = false;
        const node = state.nodes[id];
        if (!node) return;
        const siblings =
          node.parentId === null
            ? state.rootIds
            : (state.nodes[node.parentId]?.childrenIds ?? state.rootIds);
        const idx = siblings.indexOf(id);
        if (idx !== -1) siblings.splice(idx, 1);
        const deleteRecursive = (nid: string) => {
          const n = state.nodes[nid];
          if (!n) return;
          for (const cid of [...n.childrenIds]) deleteRecursive(cid);
          delete state.nodes[nid];
        };
        deleteRecursive(id);
      });
    },

    indentNode(id: string) {
      const { nodes, rootIds } = _get();
      takeSnapshot(nodes, rootIds);
      set((state) => {
        state.canUndo = true;
        state.canRedo = false;
        const node = state.nodes[id];
        if (!node) return;
        const siblings = getSiblings(node, state.nodes, state.rootIds);
        const idx = siblings.indexOf(id);
        if (idx <= 0) return;
        const prevSiblingId = siblings[idx - 1];
        const prevSibling = state.nodes[prevSiblingId];
        if (!prevSibling) return;
        siblings.splice(idx, 1);
        prevSibling.childrenIds.push(id);
        node.parentId = prevSiblingId;
        prevSibling.collapsed = false;
        node.updatedAt = Date.now();
      });
    },

    outdentNode(id: string) {
      const { nodes, rootIds } = _get();
      takeSnapshot(nodes, rootIds);
      set((state) => {
        state.canUndo = true;
        state.canRedo = false;
        const node = state.nodes[id];
        if (!node || node.parentId === null) return;
        const parent = state.nodes[node.parentId];
        if (!parent) return;
        const parentSiblings = getSiblings(parent, state.nodes, state.rootIds);
        const parentIdx = parentSiblings.indexOf(node.parentId);
        const nodeIdx = parent.childrenIds.indexOf(id);
        parent.childrenIds.splice(nodeIdx, 1);
        parentSiblings.splice(parentIdx + 1, 0, id);
        node.parentId = parent.parentId;
        node.updatedAt = Date.now();
      });
    },

    moveNode(id: string, newParentId: string | null, newIndex: number) {
      const { nodes, rootIds } = _get();
      takeSnapshot(nodes, rootIds);
      set((state) => {
        state.canUndo = true;
        state.canRedo = false;
        const node = state.nodes[id];
        if (!node) return;
        const oldSiblings =
          node.parentId === null
            ? state.rootIds
            : (state.nodes[node.parentId]?.childrenIds ?? state.rootIds);
        const oldIdx = oldSiblings.indexOf(id);
        if (oldIdx !== -1) oldSiblings.splice(oldIdx, 1);
        const newSiblings =
          newParentId === null
            ? state.rootIds
            : (state.nodes[newParentId]?.childrenIds ?? state.rootIds);
        newSiblings.splice(newIndex, 0, id);
        node.parentId = newParentId;
        node.updatedAt = Date.now();
      });
    },

    toggleCollapsed(id: string) {
      // Collapse is a view-only toggle — not worth undoing
      set((state) => {
        const node = state.nodes[id];
        if (node) {
          node.collapsed = !node.collapsed;
          node.updatedAt = Date.now();
        }
      });
    },

    toggleChecked(id: string) {
      const { nodes, rootIds } = _get();
      takeSnapshot(nodes, rootIds);
      set((state) => {
        state.canUndo = true;
        state.canRedo = false;
        const node = state.nodes[id];
        if (!node) return;
        if (node.statusType !== "checkable") {
          node.statusType = "checkable";
          node.checked = true;
        } else {
          node.checked = !node.checked;
        }
        node.updatedAt = Date.now();
      });
    },

    cycleProjectStatus(id: string) {
      const { nodes, rootIds } = _get();
      takeSnapshot(nodes, rootIds);
      set((state) => {
        state.canUndo = true;
        state.canRedo = false;
        const node = state.nodes[id];
        if (!node) return;
        if (node.statusType !== "project") {
          node.statusType = "project";
          node.projectStatus = "todo";
        } else {
          const order = ["todo", "in-progress", "done", "archived"] as const;
          const idx = order.indexOf(node.projectStatus ?? "todo");
          node.projectStatus = order[(idx + 1) % order.length];
        }
        node.updatedAt = Date.now();
      });
    },

    setStatusType(id: string, statusType: import("../types/node").StatusType) {
      const { nodes, rootIds } = _get();
      takeSnapshot(nodes, rootIds);
      set((state) => {
        state.canUndo = true;
        state.canRedo = false;
        const node = state.nodes[id];
        if (!node) return;
        node.statusType = statusType;
        if (statusType === "none") {
          node.checked = false;
          node.projectStatus = null;
        } else if (statusType === "checkable") {
          node.projectStatus = null;
        } else if (statusType === "project") {
          node.checked = false;
          node.projectStatus = node.projectStatus ?? "todo";
        }
        node.updatedAt = Date.now();
      });
    },

    createLinkNode(targetId: string, afterSiblingId: string): string {
      const id = generateId();
      const now = Date.now();
      const { nodes, rootIds } = _get();
      takeSnapshot(nodes, rootIds);
      set((state) => {
        state.canUndo = true;
        state.canRedo = false;
        const afterNode = state.nodes[afterSiblingId];
        if (!afterNode) return;
        state.nodes[id] = {
          id,
          parentId: afterNode.parentId,
          content: "",
          mentions: [],
          statusType: "none",
          projectStatus: null,
          checked: false,
          collapsed: false,
          childrenIds: [],
          createdAt: now,
          updatedAt: now,
          isDaily: false,
          dailyDate: null,
          linkId: targetId,
        };
        const siblings =
          afterNode.parentId === null
            ? state.rootIds
            : (state.nodes[afterNode.parentId]?.childrenIds ?? state.rootIds);
        const idx = siblings.indexOf(afterSiblingId);
        siblings.splice(idx + 1, 0, id);
      });
      return id;
    },

    createDailyNode(date: string): string {
      const id = generateId();
      const now = Date.now();
      const [year, month, day] = date.split("-").map(Number);
      const d = new Date(year, month - 1, day);
      const content = d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      // System-initiated — do not snapshot
      set((state) => {
        state.nodes[id] = {
          id,
          parentId: null,
          content,
          mentions: [],
          statusType: "none",
          projectStatus: null,
          checked: false,
          collapsed: false,
          childrenIds: [],
          createdAt: now,
          updatedAt: now,
          isDaily: true,
          dailyDate: date,
          linkId: null,
        };
        state.rootIds.push(id);
      });
      return id;
    },

    unlinkNode(linkNodeId: string) {
      const { nodes, rootIds } = _get();
      takeSnapshot(nodes, rootIds);
      set((state) => {
        state.canUndo = true;
        state.canRedo = false;
        const node = state.nodes[linkNodeId];
        if (!node?.linkId) return;
        const target = state.nodes[node.linkId];
        if (target) {
          node.content = target.content;
          node.mentions = [...(target.mentions ?? [])];
          node.statusType = target.statusType;
          node.projectStatus = target.projectStatus;
          node.checked = target.checked;
        }
        node.linkId = null;
        node.updatedAt = Date.now();
      });
    },

    // --- UI State ---
    activeNodeId: null,
    focusCursorAtEnd: false,
    sidebarCollapsed: false,
    activeView: "project",
    activeProjectId: null,
    projectColumns: 2,
    dailyColumns: 2,
    settingsPanelOpen: false,
    canUndo: false,
    canRedo: false,

    setActiveNode(id: string | null, cursorAtEnd = false) {
      set((state) => {
        state.activeId = id;
        state.focusCursorAtEnd = cursorAtEnd;
      });
    },

    setSidebarCollapsed(collapsed: boolean) {
      set((state) => {
        state.sidebarCollapsed = collapsed;
      });
    },

    setActiveView(view: "project" | "workbench") {
      set((state) => {
        state.activeView = view;
      });
    },

    setActiveProject(id: string | null) {
      set((state) => {
        state.activeProjectId = id;
        state.activeView = "project";
      });
    },

    setProjectColumns(n: number) {
      set((state) => {
        state.projectColumns = Math.max(1, Math.min(4, n));
      });
    },

    setDailyColumns(n: number) {
      set((state) => {
        state.dailyColumns = Math.max(1, Math.min(4, n));
      });
    },

    setSettingsPanelOpen(open: boolean) {
      set((state) => {
        state.settingsPanelOpen = open;
      });
    },

    undo() {
      if (past.length === 0) return;
      const prev = past.pop()!;
      const { nodes, rootIds } = _get();
      future.push({ nodes, rootIds: [...rootIds] });
      // Pass a plain object to bypass Immer's produce — the immer middleware
      // only wraps function updaters; plain objects go straight to zustand set.
      (set as unknown as (s: Partial<StoreState>) => void)({
        nodes: prev.nodes,
        rootIds: prev.rootIds,
        canUndo: past.length > 0,
        canRedo: true,
      });
      // Reset so the next typing burst gets a fresh snapshot
      lastTextSnapshotAt = 0;
    },

    redo() {
      if (future.length === 0) return;
      const next = future.pop()!;
      const { nodes, rootIds } = _get();
      past.push({ nodes, rootIds: [...rootIds] });
      (set as unknown as (s: Partial<StoreState>) => void)({
        nodes: next.nodes,
        rootIds: next.rootIds,
        canUndo: true,
        canRedo: future.length > 0,
      });
      lastTextSnapshotAt = 0;
    },
  })),
);

// Convenience selectors
export const selectNode = (id: string) => (state: StoreState) =>
  state.nodes[id];
export const selectRootIds = (state: StoreState) => state.rootIds;
export const selectNodes = (state: StoreState) => state.nodes;
export const selectActiveNodeId = (state: StoreState) => state.activeId;
export const selectActiveProjectId = (state: StoreState) =>
  state.activeProjectId;
export const selectActiveView = (state: StoreState) => state.activeView;

// Export get for use outside components
export const getStore = () => useStore.getState();
