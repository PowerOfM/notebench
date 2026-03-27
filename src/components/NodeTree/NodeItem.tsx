import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { ChevronRight, GripVertical } from "lucide-react";
import { memo, useCallback } from "react";
import { actions } from "../../store/actions";
import { nodesAtom } from "../../store/atoms";
import { useDispatch } from "../../store/dispatch";
import { NodeContent } from "../NodeContent/NodeContent";
import { StatusIndicator } from "../StatusIndicator/StatusIndicator";
import styles from "./NodeItem.module.css";
import { NodeItemMenu } from "./NodeItemMenu";
import { INode } from "../../types/node";

interface NodeItemProps {
  node: INode;
  depth: number;
}

export function NodeItem({ node, depth }: NodeItemProps) {
  const dispatch = useDispatch();
  const isLink = !!node?.linkId;

  const {
    attributes: { role: _role, ...attributes },
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const handleCollapseClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch(actions.update(node.id, { collapsed: !node.collapsed }));
    },
    [node.id, dispatch],
  );

  // const handleUnlink = useCallback(
  //   (e: React.MouseEvent) => {
  //     e.preventDefault();
  //     e.stopPropagation();
  //     unlinkNode(nodeId);
  //   },
  //   [nodeId, unlinkNode],
  // );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch(actions.remove(node));
    },
    [node.id, dispatch],
  );

  // Use getState() for resolveLink — reads current state without subscribing to
  // the full nodes map (avoids re-rendering all NodeItems on any node change)
  // const linkedNode = isLink
  //   ? resolveLink(nodeId, useStore.getState().nodes)
  //   : null;

  if (!node) {
    return null;
  }

  // const effectiveId = effectiveNode!.id;
  // const hasChildren = effectiveNode!.childrenIds.length > 0;
  const effectiveId = node.id;
  const hasChildren = node.childrenIds?.length ?? 0 > 0;
  const cssVars = {
    "--depth": depth,
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

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
      <StatusIndicator node={node} />
      <NodeContent
        node={node}
        effectiveNodeId={isLink ? effectiveId : undefined}
        strikethrough={node.status?.type === "checkbox" && node.status.checked}
      />
      <NodeItemMenu onDelete={handleDelete} />
    </div>
  );
});
