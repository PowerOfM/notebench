export interface UIState {
  activeNodeId: string | null;
  focusCursorAtEnd: boolean;
  sidebarCollapsed: boolean;
  activeView: 'project' | 'workbench';
  activeProjectId: string | null;
}

export interface UIActions {
  setActiveNode: (id: string | null, cursorAtEnd?: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveView: (view: 'project' | 'workbench') => void;
  setActiveProject: (id: string | null) => void;
}

export function createUISlice(): UIState & UIActions {
  return {
    activeNodeId: null,
    focusCursorAtEnd: false,
    sidebarCollapsed: false,
    activeView: 'project',
    activeProjectId: null,

    setActiveNode(id, cursorAtEnd = false) {
      this.activeNodeId = id;
      this.focusCursorAtEnd = cursorAtEnd;
    },

    setSidebarCollapsed(collapsed) {
      this.sidebarCollapsed = collapsed;
    },

    setActiveView(view) {
      this.activeView = view;
    },

    setActiveProject(id) {
      this.activeProjectId = id;
      this.activeView = 'project';
    },
  };
}
