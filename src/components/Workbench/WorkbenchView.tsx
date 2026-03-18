import { useStore } from '../../store';
import { NodeTree } from '../NodeTree/NodeTree';
import styles from './WorkbenchView.module.css';

/** A compact card showing one project's tree */
function ProjectCard({ projectId }: { projectId: string }) {
  const node = useStore((s) => s.nodes[projectId]);
  const setActiveProject = useStore((s) => s.setActiveProject);

  if (!node) return null;

  return (
    <div className={styles.card}>
      <div
        className={styles.cardHeader}
        onClick={() => setActiveProject(projectId)}
        title="Open project"
      >
        {node.content || 'Untitled'}
      </div>
      <div className={styles.cardBody}>
        {node.childrenIds.length === 0 ? (
          <div className={styles.emptyCard}>No notes yet</div>
        ) : (
          <NodeTree rootIds={node.childrenIds} />
        )}
      </div>
    </div>
  );
}

export function WorkbenchView() {
  const rootIds = useStore((s) => s.rootIds);
  const projectColumns = useStore((s) => s.projectColumns);
  const dailyColumns = useStore((s) => s.dailyColumns);

  // For now, all root nodes are projects (daily nodes arrive in Phase 6)
  const projectIds = rootIds;
  const dailyIds: string[] = []; // placeholder until Phase 6

  return (
    <div className={styles.workbench}>
      {/* Projects pane */}
      <div className={styles.pane}>
        <div className={styles.paneHeader}>
          <span className={styles.paneTitle}>Projects</span>
        </div>
        {projectIds.length === 0 ? (
          <div className={styles.emptyPane}>No projects yet</div>
        ) : (
          <div
            className={styles.scroller}
            style={
              {
                '--card-width': `calc((100% - ${(projectColumns + 1) * 12}px) / ${projectColumns})`,
              } as React.CSSProperties
            }
          >
            {projectIds.map((id) => (
              <ProjectCard key={id} projectId={id} />
            ))}
          </div>
        )}
      </div>

      {/* Daily notes pane */}
      <div className={styles.pane}>
        <div className={styles.paneHeader}>
          <span className={styles.paneTitle}>Daily Notes</span>
        </div>
        {dailyIds.length === 0 ? (
          <div className={styles.emptyPane}>No daily notes yet</div>
        ) : (
          <div
            className={styles.scroller}
            style={
              {
                '--card-width': `calc((100% - ${(dailyColumns + 1) * 12}px) / ${dailyColumns})`,
              } as React.CSSProperties
            }
          >
            {dailyIds.map((id) => (
              <ProjectCard key={id} projectId={id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
