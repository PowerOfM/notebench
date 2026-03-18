import { useCallback } from 'react';
import { useStore } from '../../store';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const nodes = useStore((s) => s.nodes);
  const rootIds = useStore((s) => s.rootIds);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const setActiveProject = useStore((s) => s.setActiveProject);
  const createNode = useStore((s) => s.createNode);
  const setActiveNode = useStore((s) => s.setActiveNode);

  const handleAddProject = useCallback(() => {
    const id = createNode(null);
    createNode(id); // auto-create first child node
    setActiveProject(id);
    setActiveNode(id, false);
  }, [createNode, setActiveProject, setActiveNode]);

  const rootNodes = rootIds.map((id) => nodes[id]).filter(Boolean);

  return (
    <aside className={styles.sidebar}>
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
        {rootNodes.length === 0 && (
          <p className={styles.empty}>No projects yet</p>
        )}
        {rootNodes.map((node) => (
          <div
            key={node.id}
            className={`${styles.item} ${activeProjectId === node.id ? styles.active : ''}`}
            onClick={() => setActiveProject(node.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveProject(node.id);
            }}
          >
            <span className={styles.itemIcon}>◈</span>
            <span className={styles.itemLabel}>
              {node.content || 'Untitled'}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
