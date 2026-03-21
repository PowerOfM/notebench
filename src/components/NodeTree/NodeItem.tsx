import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { ChevronRight, GripVertical } from "lucide-react";
import { memo, useCallback } from "react";
import { resolveLink } from "../../lib/linkResolver";
import { useStore } from "../../store";
import { NodeContent } from "../NodeContent/NodeContent";
import { StatusIndicator } from "../StatusIndicator/StatusIndicator";
import styles from "./NodeItem.module.css";
import { NodeItemMenu } from "./NodeItemMenu";

interface NodeItemProps {
  nodeId: string;
  depth: number;
}

export const NodeItem = memo(function NodeItem({
  nodeId,
  depth,
}: NodeItemProps) {
  // Subscribe only to the specific node — not the full nodes map
  const node = useStore((s) => s.nodes[nodeId]);

  // If this is a link node, also subscribe to its direct target so we
  // re-render when the target's content/status changes
  const isLink = !!node.linkId;
  useStore((s) => (node.linkId ? s.nodes[node.linkId] : null));

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
    [nodeId, toggleCollapsed],
  );

  const handleUnlink = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      unlinkNode(nodeId);
    },
    [nodeId, unlinkNode],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      deleteNode(nodeId);
    },
    [nodeId, deleteNode],
  );

  // Use getState() for resolveLink — reads current state without subscribing to
  // the full nodes map (avoids re-rendering all NodeItems on any node change)
  const effectiveNode = isLink
    ? resolveLink(nodeId, useStore.getState().nodes)
    : node;
  const cssVars = {
    "--depth": depth,
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  if (!node) {
    return null;
  }

  const effectiveId = effectiveNode!.id;
  const hasChildren = effectiveNode!.childrenIds.length > 0;

  return (
    <div
      ref={setNodeRef}
      role="treeitem"
      aria-level={depth + 1}
      aria-expanded={hasChildren ? !node.collapsed : undefined}
      className={clsx(
        styles.row,
        isLink && styles.linkedRow,
        isDragging && styles.dragging,
      )}
      style={cssVars}
      {...attributes}
    >
      <div
        className={styles.dragHandle}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} color="var(--color-text-faint)" />
      </div>
      {hasChildren ? (
        <button
          className={clsx(
            styles.collapseBtn,
            !node.collapsed && styles.expanded,
            styles.visible,
          )}
          onClick={handleCollapseClick}
          onPointerDown={(e) => e.stopPropagation()}
          tabIndex={-1}
          aria-label={node.collapsed ? "Expand" : "Collapse"}
        >
          <ChevronRight size={16} color="var(--color-text-faint)" />
        </button>
      ) : (
        <div className={styles.collapseBtnPlaceholder} />
      )}
      {isLink && hasChildren && (
        <span
          className={styles.linkIconInline}
          aria-label="Linked node"
          title="Linked node"
        >
          ⛓
        </span>
      )}
      <StatusIndicator nodeId={effectiveId} />
      <NodeContent
        nodeId={nodeId}
        effectiveNodeId={isLink ? effectiveId : undefined}
        strikethrough={
          effectiveNode!.statusType === "checkable" && effectiveNode!.checked
        }
      />
      <NodeItemMenu onDelete={handleDelete} />
    </div>
  );
});
