import { useStore } from '../../store';
import { resolveLink } from '../../lib/linkResolver';
import styles from './DragOverlayNode.module.css';

interface DragOverlayNodeProps {
  nodeId: string;
  depth: number;
}

export function DragOverlayNode({ nodeId, depth }: DragOverlayNodeProps) {
  const node = useStore((s) => s.nodes[nodeId]);
  const nodes = useStore((s) => s.nodes);

  if (!node) return null;

  const effectiveNode = node.linkedNodeId ? resolveLink(nodeId, nodes) : node;
  const displayContent = effectiveNode?.content ?? '';

  return (
    <div
      className={styles.overlayRow}
      style={{ '--depth': depth } as React.CSSProperties}
    >
      <div className={styles.gutter} />
      <span className={styles.content}>
        {node.linkedNodeId && <span className={styles.linkIcon}>⛓ </span>}
        {displayContent || <span className={styles.empty}>Empty node</span>}
      </span>
    </div>
  );
}
