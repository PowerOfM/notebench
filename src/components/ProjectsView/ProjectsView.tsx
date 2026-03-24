import { useLiveQuery } from "dexie-react-hooks";
import { atom, useAtom } from "jotai";
import { useCallback } from "react";
import { db } from "../../lib/db";
import { NodeContent } from "../NodeContent/NodeContent";
import { NodeTree } from "../NodeTree/NodeTree";
import styles from "./ProjectsView.module.css";

const activeProjectIdAtom = atom<string | null>(null);

export function ProjectsView() {
  const pinnedNodes = useLiveQuery(() =>
    db.nodes.where("isPinned").equals(1).toArray(),
  );
  const [activeProjectId, setActiveProjectId] = useAtom(activeProjectIdAtom);

  const handleAddNode = useCallback(() => {
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
        <NodeTree rootIds={activeProject.childrenIds} />
      </div>
    </div>
  );
}
