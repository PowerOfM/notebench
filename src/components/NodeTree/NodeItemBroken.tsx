import styles from "./NodeItem.module.css";

interface NodeItemBrokenProps {
  nodeId: string;
  depth: number;
}

export function NodeItemBroken({ nodeId, depth }: NodeItemBrokenProps) {
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
          onMouseDown={handleUnlink}
          aria-label="Unlink broken node"
        >
          Unlink
        </button>
        <button
          className={styles.brokenBtn}
          onMouseDown={handleDelete}
          aria-label="Delete broken node"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
