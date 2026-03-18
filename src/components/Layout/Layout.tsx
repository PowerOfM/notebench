import { useCallback } from 'react';
import { useStore } from '../../store';
import { Sidebar } from './Sidebar';
import { NodeTree } from '../NodeTree/NodeTree';
import { NodeContent } from '../NodeContent/NodeContent';
import styles from './Layout.module.css';

export function Layout() {
  const activeProjectId = useStore((s) => s.activeProjectId);
  const nodes = useStore((s) => s.nodes);
  const createNode = useStore((s) => s.createNode);
  const setActiveNode = useStore((s) => s.setActiveNode);
  const setActiveProject = useStore((s) => s.setActiveProject);

  const activeProject = activeProjectId ? nodes[activeProjectId] : null;

  const handleAddProject = useCallback(() => {
    const id = createNode(null);
    setActiveProject(id);
    setActiveNode(id, false);
  }, [createNode, setActiveProject, setActiveNode]);

  const handleAddFirstNode = useCallback(() => {
    if (!activeProjectId) return;
    const id = createNode(activeProjectId);
    setActiveNode(id, false);
  }, [activeProjectId, createNode, setActiveNode]);

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        {!activeProject ? (
          <div className={styles.emptyState}>
            <h2>No project selected</h2>
            <p>Create a project to get started</p>
            <button className={styles.emptyStateBtn} onClick={handleAddProject}>
              + New Project
            </button>
          </div>
        ) : (
          <div className={styles.projectView}>
            <div className={styles.projectHeader}>
              <NodeContent nodeId={activeProjectId!} />
            </div>
            <div className={styles.content}>
              {activeProject.childrenIds.length === 0 ? (
                <div
                  className={styles.emptyState}
                  style={{ height: 'auto', paddingTop: 32 }}
                >
                  <p>No nodes yet</p>
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
        )}
      </main>
    </div>
  );
}
