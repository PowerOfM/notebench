export interface UIState {
  activeNodeId: string | null;
  focusCursorAtEnd: boolean;
  sidebarCollapsed: boolean;
  activeView: 'project' | 'workbench';
  activeProjectId: string | null;
  projectColumns: number;
  dailyColumns: number;
  settingsPanelOpen: boolean;
}

export interface UIActions {
  setActiveNode: (id: string | null, cursorAtEnd?: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveView: (view: 'project' | 'workbench') => void;
  setActiveProject: (id: string | null) => void;
  setProjectColumns: (n: number) => void;
  setDailyColumns: (n: number) => void;
  setSettingsPanelOpen: (open: boolean) => void;
}
