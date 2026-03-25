import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import styles from "./NodeItem.module.css";

interface NodeItemBrokenProps {
  nodeId: string;
  depth: number;
  onUnlink: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export function NodeItemBroken({
  nodeId,
  depth,
  onUnlink,
  onDelete,
}: NodeItemBrokenProps) {
  const {
    attributes: { role: _role, ...attributes },
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: nodeId });

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
      className={clsx(styles.row, styles.brokenRow)}
      style={cssVars}
      {...attributes}
    >
      <div
        className={styles.dragHandle}
        {...listeners}
        aria-label="Drag to reorder"
      />
      <div className={styles.gutter}>
        <span className={styles.linkIcon} aria-hidden="true">
          ⛓
        </span>
      </div>
      <span className={styles.brokenText}>Broken link</span>
      <div className={styles.brokenActions}>
        <button
          className={styles.brokenBtn}
          onMouseDown={onUnlink}
          aria-label="Unlink broken node"
        >
          Unlink
        </button>
        <button
          className={styles.brokenBtn}
          onMouseDown={onDelete}
          aria-label="Delete broken node"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
