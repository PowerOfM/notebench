import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import { nodesAtom, pinnedIdsAtom, activeParentIdAtom } from "../../store/atoms";
import { nodeActionAtom, makeAction } from "../../store/actions";
import styles from "./Sidebar.module.css";

export function Sidebar() {
  const nodes = useAtomValue(nodesAtom);
  const pinnedIds = useAtomValue(pinnedIdsAtom);
  const activeParentId = useAtomValue(activeParentIdAtom);
  const setActiveParentId = useSetAtom(activeParentIdAtom);
  const dispatch = useSetAtom(nodeActionAtom);

  const handleAddProject = () => {
    dispatch(makeAction.create(null, undefined, { isPinned: 1 }, true));
  };

  return (
    <aside className={styles.sidebar}>
      {/* View switcher */}
      <div className={styles.viewSwitcher}>
        <button
          className={`${styles.viewBtn} ${styles.viewBtnActive}`}
          title="Project view"
        >
          Projects
        </button>
        <button
          className={styles.viewBtn}
          title="Workbench overview"
        >
          Workbench
        </button>
      </div>

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
              className={clsx(
                styles.item,
                activeParentId === id && styles.active,
              )}
              onClick={() => setActiveParentId(node.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setActiveParentId(node.id);
                }
              }}
            >
              <span className={styles.itemIcon}>◈</span>
              <span className={styles.itemLabel}>
                {node.content || "Untitled"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button
          className={styles.settingsBtn}
          title="Settings"
          aria-label="Open settings"
        >
          ⚙
        </button>
      </div>
    </aside>
  );
}
