import styles from "./NodeItem.module.css";

interface NodeItemBrokenProps {
  depth: number;
  onUnlink: () => void;
  onDelete: () => void;
}

export function NodeItemBroken({ depth, onUnlink, onDelete }: NodeItemBrokenProps) {
  const cssVars = { "--depth": depth } as React.CSSProperties;

  return (
    <div
      role="treeitem"
      aria-level={depth + 1}
      className={styles.row}
      style={cssVars}
    >
      <div className={styles.dragHandle} aria-label="Drag to reorder" />
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
