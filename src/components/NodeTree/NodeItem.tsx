import { memo, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../../store';
import { resolveLink } from '../../lib/linkResolver';
import { NodeContent } from '../NodeContent/NodeContent';
import { StatusIndicator } from '../StatusIndicator/StatusIndicator';
import styles from './NodeItem.module.css';

interface NodeItemProps {
  nodeId: string;
  depth: number;
}

export const NodeItem = memo(function NodeItem({ nodeId, depth }: NodeItemProps) {
  // Subscribe only to the specific node — not the full nodes map
  const node = useStore((s) => s.nodes[nodeId]);

  // If this is a link node, also subscribe to its direct target so we
  // re-render when the target's content/status changes
  const linkedTargetId = node?.linkedNodeId ?? null;
  useStore((s) => (linkedTargetId ? s.nodes[linkedTargetId] : null));

  const toggleCollapsed = useStore((s) => s.toggleCollapsed);
  const unlinkNode = useStore((s) => s.unlinkNode);
  const deleteNode = useStore((s) => s.deleteNode);

  const {
    attributes: { role: _role, ...attributes },
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: nodeId });

  const handleCollapseClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleCollapsed(nodeId);
    },
    [nodeId, toggleCollapsed]
  );

  const handleUnlink = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      unlinkNode(nodeId);
    },
    [nodeId, unlinkNode]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      deleteNode(nodeId);
    },
    [nodeId, deleteNode]
  );

  if (!node) return null;

  const isLink = !!node.linkedNodeId;
  // Use getState() for resolveLink — reads current state without subscribing to
  // the full nodes map (avoids re-rendering all NodeItems on any node change)
  const effectiveNode = isLink ? resolveLink(nodeId, useStore.getState().nodes) : node;
  const isBroken = isLink && !effectiveNode;
  const cssVars = {
    '--depth': depth,
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  // ── Broken link ──────────────────────────────────────────────────────────────
  if (isBroken) {
    return (
      <div
        ref={setNodeRef}
        role="treeitem"
        aria-level={depth + 1}
        className={`${styles.row} ${styles.brokenRow}`}
        style={cssVars}
        {...attributes}
      >
        <div className={styles.dragHandle} {...listeners} aria-label="Drag to reorder" />
        <div className={styles.gutter}>
          <span className={styles.linkIcon} aria-hidden="true">⛓</span>
        </div>
        <span className={styles.brokenText}>Broken link</span>
        <div className={styles.brokenActions}>
          <button className={styles.brokenBtn} onMouseDown={handleUnlink} aria-label="Unlink broken node">
            Unlink
          </button>
          <button className={styles.brokenBtn} onMouseDown={handleDelete} aria-label="Delete broken node">
            Delete
          </button>
        </div>
      </div>
    );
  }

  const effectiveId = effectiveNode!.id;
  const hasChildren = effectiveNode!.childrenIds.length > 0;

  return (
    <div
      ref={setNodeRef}
      role="treeitem"
      aria-level={depth + 1}
      aria-expanded={hasChildren ? !node.collapsed : undefined}
      className={`${styles.row}${isLink ? ` ${styles.linkedRow}` : ''}${isDragging ? ` ${styles.dragging}` : ''}`}
      style={cssVars}
      {...attributes}
    >
      <div className={styles.dragHandle} {...listeners} aria-label="Drag to reorder" />
      <div className={styles.gutter}>
        {hasChildren ? (
          <button
            className={`${styles.collapseBtn} ${!node.collapsed ? styles.expanded : ''} ${styles.visible}`}
            onClick={handleCollapseClick}
            onPointerDown={(e) => e.stopPropagation()}
            tabIndex={-1}
            aria-label={node.collapsed ? 'Expand' : 'Collapse'}
          >
            ▶
          </button>
        ) : (
          <span
            className={isLink ? styles.linkIcon : styles.bullet}
            aria-hidden="true"
          />
        )}
      </div>
      {isLink && hasChildren && (
        <span className={styles.linkIconInline} aria-label="Linked node" title="Linked node">
          ⛓
        </span>
      )}
      <StatusIndicator nodeId={effectiveId} />
      <NodeContent
        nodeId={nodeId}
        effectiveNodeId={isLink ? effectiveId : undefined}
        strikethrough={
          effectiveNode!.statusType === 'checkable' && effectiveNode!.checked
        }
      />
    </div>
  );
});
