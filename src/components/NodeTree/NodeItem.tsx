import { useCallback } from 'react';
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

export function NodeItem({ nodeId, depth }: NodeItemProps) {
  const node = useStore((s) => s.nodes[nodeId]);
  const nodes = useStore((s) => s.nodes);
  const toggleCollapsed = useStore((s) => s.toggleCollapsed);
  const unlinkNode = useStore((s) => s.unlinkNode);
  const deleteNode = useStore((s) => s.deleteNode);

  const {
    attributes,
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
  const effectiveNode = isLink ? resolveLink(nodeId, nodes) : node;
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
        className={`${styles.row} ${styles.brokenRow}`}
        style={cssVars}
        {...attributes}
      >
        <div className={styles.dragHandle} {...listeners} />
        <div className={styles.gutter}>
          <span className={styles.linkIcon}>⛓</span>
        </div>
        <span className={styles.brokenText}>Broken link</span>
        <div className={styles.brokenActions}>
          <button className={styles.brokenBtn} onMouseDown={handleUnlink}>
            Unlink
          </button>
          <button className={styles.brokenBtn} onMouseDown={handleDelete}>
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
      className={`${styles.row}${isLink ? ` ${styles.linkedRow}` : ''}${isDragging ? ` ${styles.dragging}` : ''}`}
      style={cssVars}
      {...attributes}
    >
      <div className={styles.dragHandle} {...listeners} title="Drag to reorder" />
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
            title={isLink ? 'Linked node' : undefined}
          />
        )}
      </div>
      {isLink && hasChildren && (
        <span className={styles.linkIconInline} title="Linked node">
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
}
