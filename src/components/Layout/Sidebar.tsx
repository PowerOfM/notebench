import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import { nodesAtom, pinnedIdsAtom } from "../../store/atoms";
import styles from "./Sidebar.module.css";
import { makeAction, nodeActionAtom } from "../../store/actions";

/** Close the sidebar on narrow screens after a navigation action. */
// function useCloseSidebarOnMobile() {
//   const setSidebarCollapsed = useStore((s) => s.setSidebarCollapsed);
//   return useCallback(() => {
//     if (window.matchMedia("(max-width: 768px)").matches) {
//       setSidebarCollapsed(true);
//     }
//   }, [setSidebarCollapsed]);
// }

interface IProps {
  activeId: string | null;
  onSelectId: (value: string | null) => void;
}

export function Sidebar({ activeId, onSelectId }: IProps) {
  const dispatch = useSetAtom(nodeActionAtom);
  const [activeView, setActiveView] = useState<"project" | "workbench">(
    "project",
  );
  const nodes = useAtomValue(nodesAtom);
  const pinnedIds = useAtomValue(pinnedIdsAtom);

  const handleAddProject = () => dispatch(makeAction.create(null));

  console.log("nodes", nodes);
  console.log("pinnedIds", pinnedIds);

  // const handleTodayClick = useCallback(() => {
  //   const todayNode = Object.values(nodes).find(
  //     (n) => n.isDaily && n.dailyDate === todayDate,
  //   );
  //   if (todayNode) {
  //     setActiveProject(todayNode.id);
  //   } else {
  //     const id = createDailyNode(todayDate);
  //     setActiveProject(id);
  //   }
  //   closeSidebar();
  // }, [nodes, todayDate, createDailyNode, setActiveProject, closeSidebar]);

  // const rootNodes = rootIds.map((id) => nodes[id]).filter(Boolean);
  // const projectNodes = rootNodes.filter((n) => !n.isDaily);
  // const dailyNodes = rootNodes
  //   .filter((n) => n.isDaily)
  //   .sort((a, b) => (b.dailyDate ?? "").localeCompare(a.dailyDate ?? ""));
  // const pastDailyNodes = dailyNodes.filter((n) => n.dailyDate !== todayDate);

  // const isTodayActive =
  //   activeView === "project" &&
  //   nodes[activeProjectId ?? ""]?.dailyDate === todayDate;

  return (
    <aside className={styles.sidebar}>
      {/* View switcher */}
      <div className={styles.viewSwitcher}>
        <button
          className={`${styles.viewBtn} ${activeView === "project" ? styles.viewBtnActive : ""}`}
          // onClick={() => {}}
          title="Project view"
        >
          Projects
        </button>
        <button
          className={`${styles.viewBtn} ${activeView === "workbench" ? styles.viewBtnActive : ""}`}
          // onClick={() => setActiveView("workbench")}
          title="Workbench overview"
        >
          Workbench
        </button>
      </div>

      {/* Today button */}
      {/* <div className={styles.todaySection}>
        <button
          className={`${styles.todayBtn} ${isTodayActive ? styles.todayBtnActive : ""}`}
          onClick={handleTodayClick}
        >
          <span className={styles.todayIcon}>📅</span>
          Today
        </button>
      </div> */}

      {/* Projects section */}
      <div className={styles.header}>
        <span className={styles.title}>Projects</span>
        <button
          className={styles.addBtn}
          onClick={handleAddProject}
          title="New project"
          aria-label="New project"
        >
          +
        </button>
      </div>
      <div className={styles.list}>
        {pinnedIds.length === 0 && (
          <p className={styles.empty}>No projects yet</p>
        )}
        {pinnedIds.map((id) => {
          const node = nodes[id];
          if (!node) return null;

          return (
            <div
              key={id}
              className={clsx(styles.item, activeId === id && styles.active)}
              onClick={() => {
                onSelectId(id);
                // setActiveProject(node.id);
                // closeSidebar();
              }}
              role="button"
              tabIndex={0}
              // onKeyDown={(e) => {
              //   if (e.key === "Enter" || e.key === " ") {
              //     setActiveProject(node.id);
              //     closeSidebar();
              //   }
              // }}
            >
              <span className={styles.itemIcon}>◈</span>
              <span className={styles.itemLabel}>
                {node.content || "Untitled"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Past daily notes section */}
      {/* {pastDailyNodes.length > 0 && (
        <>
          <div className={styles.header}>
            <span className={styles.title}>Daily Notes</span>
          </div>
          <div className={styles.list}>
            {pastDailyNodes.slice(0, 7).map((node) => (
              <div
                key={node.id}
                className={`${styles.item} ${activeProjectId === node.id && activeView === "project" ? styles.active : ""}`}
                onClick={() => {
                  setActiveProject(node.id);
                  closeSidebar();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActiveProject(node.id);
                    closeSidebar();
                  }
                }}
              >
                <span className={styles.itemIcon}>◷</span>
                <span className={styles.itemLabel}>
                  {node.dailyDate ?? node.content}
                </span>
              </div>
            ))}
          </div>
        </>
      )} */}

      {/* Footer */}
      <div className={styles.footer}>
        <button
          className={styles.settingsBtn}
          // onClick={() => setSettingsPanelOpen(true)}
          title="Settings"
          aria-label="Open settings"
        >
          ⚙
        </button>
      </div>
    </aside>
  );
}
