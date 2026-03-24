export interface ISettings {
  projectColumns: number;
  dailyColumns: number;
}

export interface UIState {
  activeParentId: string | null;
  activeView: "project" | "workbench";
  activeId: string | null;
  focusCursorAtEnd: boolean;
  sidebarCollapsed: boolean;
  settings: ISettings;
  settingsOpen: boolean;
}

export interface UIActions {
  setActive: (id: string | null, cursorAtEnd?: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveView: (view: "project" | "workbench") => void;
  setActiveParent: (id: string | null) => void;
  setSettings: (settings: ISettings) => void;
  setSettingsPanelOpen: (open: boolean) => void;
}
