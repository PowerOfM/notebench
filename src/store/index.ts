import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { NodeData } from '../types/node';
import { generateId } from '../lib/id';
import { getSiblings } from '../lib/tree';
import type { UIState, UIActions } from './slices/uiSlice';
import type { TreeState, TreeActions } from './slices/treeSlice';

type StoreState = TreeState & TreeActions & UIState & UIActions;

export const useStore = create<StoreState>()(
  immer((set, _get) => ({
    // --- Tree State ---
    nodes: {},
    rootIds: [],

    loadNodes(nodes: NodeData[], rootIds: string[]) {
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
      set((state) => {
        state.nodes[id] = {
          id,
          parentId,
          content: '',
          mentions: [],
          statusType: 'none',
          projectStatus: null,
          checked: false,
          collapsed: false,
          childrenIds: [],
          createdAt: now,
          updatedAt: now,
          isDaily: false,
          dailyDate: null,
          linkedNodeId: null,
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

    updateContent(id: string, content: string, mentions?: import('../types/node').MentionRef[]) {
      set((state) => {
        if (state.nodes[id]) {
          state.nodes[id].content = content;
          if (mentions !== undefined) state.nodes[id].mentions = mentions;
          state.nodes[id].updatedAt = Date.now();
        }
      });
    },

    deleteNode(id: string) {
      set((state) => {
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
      set((state) => {
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
      set((state) => {
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
      set((state) => {
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
      set((state) => {
        const node = state.nodes[id];
        if (node) {
          node.collapsed = !node.collapsed;
          node.updatedAt = Date.now();
        }
      });
    },

    toggleChecked(id: string) {
      set((state) => {
        const node = state.nodes[id];
        if (!node) return;
        if (node.statusType !== 'checkable') {
          node.statusType = 'checkable';
          node.checked = true;
        } else {
          node.checked = !node.checked;
        }
        node.updatedAt = Date.now();
      });
    },

    cycleProjectStatus(id: string) {
      set((state) => {
        const node = state.nodes[id];
        if (!node) return;
        if (node.statusType !== 'project') {
          node.statusType = 'project';
          node.projectStatus = 'todo';
        } else {
          const order = ['todo', 'in-progress', 'done', 'archived'] as const;
          const idx = order.indexOf(node.projectStatus ?? 'todo');
          node.projectStatus = order[(idx + 1) % order.length];
        }
        node.updatedAt = Date.now();
      });
    },

    setStatusType(id: string, statusType: import('../types/node').StatusType) {
      set((state) => {
        const node = state.nodes[id];
        if (!node) return;
        node.statusType = statusType;
        if (statusType === 'none') {
          node.checked = false;
          node.projectStatus = null;
        } else if (statusType === 'checkable') {
          node.projectStatus = null;
        } else if (statusType === 'project') {
          node.checked = false;
          node.projectStatus = node.projectStatus ?? 'todo';
        }
        node.updatedAt = Date.now();
      });
    },

    createLinkNode(targetId: string, afterSiblingId: string): string {
      const id = generateId();
      const now = Date.now();
      set((state) => {
        const afterNode = state.nodes[afterSiblingId];
        if (!afterNode) return;
        state.nodes[id] = {
          id,
          parentId: afterNode.parentId,
          content: '',
          mentions: [],
          statusType: 'none',
          projectStatus: null,
          checked: false,
          collapsed: false,
          childrenIds: [],
          createdAt: now,
          updatedAt: now,
          isDaily: false,
          dailyDate: null,
          linkedNodeId: targetId,
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

    unlinkNode(linkNodeId: string) {
      set((state) => {
        const node = state.nodes[linkNodeId];
        if (!node?.linkedNodeId) return;
        const target = state.nodes[node.linkedNodeId];
        if (target) {
          node.content = target.content;
          node.mentions = [...target.mentions];
          node.statusType = target.statusType;
          node.projectStatus = target.projectStatus;
          node.checked = target.checked;
        }
        node.linkedNodeId = null;
        node.updatedAt = Date.now();
      });
    },

    // --- UI State ---
    activeNodeId: null,
    focusCursorAtEnd: false,
    sidebarCollapsed: false,
    activeView: 'project',
    activeProjectId: null,
    projectColumns: 2,
    dailyColumns: 2,
    settingsPanelOpen: false,

    setActiveNode(id: string | null, cursorAtEnd = false) {
      set((state) => {
        state.activeNodeId = id;
        state.focusCursorAtEnd = cursorAtEnd;
      });
    },

    setSidebarCollapsed(collapsed: boolean) {
      set((state) => {
        state.sidebarCollapsed = collapsed;
      });
    },

    setActiveView(view: 'project' | 'workbench') {
      set((state) => {
        state.activeView = view;
      });
    },

    setActiveProject(id: string | null) {
      set((state) => {
        state.activeProjectId = id;
        state.activeView = 'project';
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
  }))
);

// Convenience selectors
export const selectNode = (id: string) => (state: StoreState) =>
  state.nodes[id];
export const selectRootIds = (state: StoreState) => state.rootIds;
export const selectNodes = (state: StoreState) => state.nodes;
export const selectActiveNodeId = (state: StoreState) => state.activeNodeId;
export const selectActiveProjectId = (state: StoreState) =>
  state.activeProjectId;
export const selectActiveView = (state: StoreState) => state.activeView;

// Export get for use outside components
export const getStore = () => useStore.getState();
