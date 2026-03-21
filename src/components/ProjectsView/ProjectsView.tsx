import { useCallback } from "react";
import { useStore } from "../../store";
import { NodeContent } from "../NodeContent/NodeContent";
import { NodeTree } from "../NodeTree/NodeTree";
import styles from "./ProjectsView.module.css";

export function ProjectsView() {
  const activeProjectId = useStore((s) => s.activeProjectId);
  const activeProject = useStore((s) => s.nodes[activeProjectId!]);
  const createNode = useStore((s) => s.createNode);
  const setActiveNode = useStore((s) => s.setActiveNode);

  const handleAddFirstNode = useCallback(() => {
    if (!activeProjectId) return;
    const id = createNode(activeProjectId);
    setActiveNode(id, false);
  }, [activeProjectId, createNode, setActiveNode]);

  return (
    <div className={styles.projectView}>
      <div className={styles.projectHeader}>
        <NodeContent
          nodeId={activeProjectId!}
          isProjectTitle
          placeholder="Project name..."
        />
        {activeProject.isDaily && (
          <p className={styles.dailyHint}>
            Use <kbd>@</kbd> to reference and link project nodes inline.
          </p>
        )}
      </div>
      <div className={styles.content}>
        {activeProject.childrenIds.length === 0 ? (
          <div
            className={styles.emptyState}
            style={{ height: "auto", paddingTop: 32 }}
          >
            <button
              className={styles.emptyStateBtn}
              onClick={handleAddFirstNode}
            >
              + Add note
            </button>
          </div>
        ) : (
          <NodeTree rootIds={activeProject.childrenIds} />
        )}
      </div>
    </div>
  );
}
