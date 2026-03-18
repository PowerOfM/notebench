import { useCallback } from 'react';
import { useStore } from '../../store';
import { NodeContent } from '../NodeContent/NodeContent';
import { StatusIndicator } from '../StatusIndicator/StatusIndicator';
import styles from './NodeItem.module.css';

interface NodeItemProps {
  nodeId: string;
  depth: number;
}

export function NodeItem({ nodeId, depth }: NodeItemProps) {
  const node = useStore((s) => s.nodes[nodeId]);
  const toggleCollapsed = useStore((s) => s.toggleCollapsed);

  const handleCollapseClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleCollapsed(nodeId);
    },
    [nodeId, toggleCollapsed]
  );

  if (!node) return null;

  const hasChildren = node.childrenIds.length > 0;

  return (
    <div
      className={styles.row}
      style={{ '--depth': depth } as React.CSSProperties}
    >
      <div className={styles.gutter}>
        {hasChildren ? (
          <button
            className={`${styles.collapseBtn} ${!node.collapsed ? styles.expanded : ''} ${styles.visible}`}
            onClick={handleCollapseClick}
            tabIndex={-1}
            aria-label={node.collapsed ? 'Expand' : 'Collapse'}
          >
            ▶
          </button>
        ) : (
          <span className={styles.bullet} />
        )}
      </div>
      <StatusIndicator nodeId={nodeId} />
      <NodeContent
        nodeId={nodeId}
        strikethrough={node.statusType === 'checkable' && node.checked}
      />
    </div>
  );
}
