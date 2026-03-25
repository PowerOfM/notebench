import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import { ChevronRight, GripVertical } from "lucide-react";
import { memo, useCallback } from "react";
import { resolveLink } from "../../lib/linkResolver";
import { makeAction, nodeActionAtom } from "../../store/actions";
import { nodesAtom } from "../../store/atoms";
import { NodeContent } from "../NodeContent/NodeContent";
import { StatusIndicator } from "../StatusIndicator/StatusIndicator";
import styles from "./NodeItem.module.css";
import { NodeItemBroken } from "./NodeItemBroken";
import { NodeItemMenu } from "./NodeItemMenu";

interface NodeItemProps {
  nodeId: string;
  depth: number;
}

export const NodeItem = memo(function NodeItem({
  nodeId,
  depth,
}: NodeItemProps) {
  const nodes = useAtomValue(nodesAtom);
  const dispatch = useSetAtom(nodeActionAtom);

  const node = nodes[nodeId];

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
      dispatch(makeAction.update(nodeId, { collapsed: !node?.collapsed }));
    },
    [nodeId, node?.collapsed, dispatch],
  );

  const handleUnlink = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!node?.linkId) return;
      const linkedNode = resolveLink(nodeId, nodes);
      dispatch(
        makeAction.update(nodeId, {
          linkId: undefined,
          content: linkedNode?.content ?? "",
          status: linkedNode?.status,
        }),
      );
    },
    [nodeId, node, nodes, dispatch],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!node) return;
      dispatch(makeAction.remove(node));
    },
    [node, dispatch],
  );

  if (!node) {
    return null;
  }

  const isLink = !!node.linkId;
  const linkedNode = isLink ? resolveLink(nodeId, nodes) : null;

  // Broken link — target was deleted
  if (isLink && !linkedNode) {
    return (
      <NodeItemBroken
        nodeId={nodeId}
        depth={depth}
        onUnlink={handleUnlink}
        onDelete={handleDelete}
      />
    );
  }

  const effectiveNode = linkedNode ?? node;
  const effectiveId = effectiveNode.id;
  const hasChildren = (effectiveNode.childrenIds?.length ?? 0) > 0;

  const cssVars = {
    "--depth": depth,
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  const isChecked =
    effectiveNode.status?.type === "checkbox" && effectiveNode.status.checked;

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
        strikethrough={isChecked}
      />
      <NodeItemMenu onDelete={handleDelete} />
    </div>
  );
});
