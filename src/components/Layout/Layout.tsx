import clsx from "clsx";
import { Menu } from "lucide-react";
import { useCallback } from "react";
import { useStore } from "../../store";
import { FloatingToolbar } from "../FloatingToolbar/FloatingToolbar";
import { ProjectsView } from "../ProjectsView/ProjectsView";
import { SettingsPanel } from "../Settings/SettingsPanel";
import { WorkbenchView } from "../Workbench/WorkbenchView";
import styles from "./Layout.module.css";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const activeProjectId = useStore((s) => s.activeProjectId);
  const activeView = useStore((s) => s.activeView);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useStore((s) => s.setSidebarCollapsed);
  const nodes = useStore((s) => s.nodes);
  const createNode = useStore((s) => s.createNode);
  const setActiveNode = useStore((s) => s.setActiveNode);
  const setActiveProject = useStore((s) => s.setActiveProject);

  const activeProject = activeProjectId ? nodes[activeProjectId] : null;

  const handleAddProject = useCallback(() => {
    const id = createNode(null);
    createNode(id);
    setActiveProject(id);
    setActiveNode(id, false);
  }, [createNode, setActiveProject, setActiveNode]);

  return (
    <div
      className={`${styles.layout}${sidebarCollapsed ? ` ${styles.sidebarCollapsed}` : ""}`}
    >
      {/* Mobile backdrop — closes sidebar when tapping outside */}
      {!sidebarCollapsed && (
        <div
          className={styles.sidebarBackdrop}
          onClick={() => setSidebarCollapsed(true)}
          aria-hidden="true"
        />
      )}

      <div
        className={clsx(
          styles.sidebarWrapper,
          sidebarCollapsed && styles.sidebarHidden,
        )}
      >
        <Sidebar />
      </div>

      <main className={styles.main}>
        {/* Mobile hamburger toggle */}
        <button
          className={styles.menuToggle}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
          aria-expanded={!sidebarCollapsed}
        >
          <Menu size={12} />
        </button>

        {activeView === "workbench" ? (
          <WorkbenchView />
        ) : !activeProject ? (
          <div className={styles.emptyState}>
            <h2>No project selected</h2>
            <p>Create a project to get started</p>
            <button className={styles.emptyStateBtn} onClick={handleAddProject}>
              + New Project
            </button>
          </div>
        ) : (
          <ProjectsView />
        )}

        <FloatingToolbar />
      </main>
      <SettingsPanel />
    </div>
  );
}
