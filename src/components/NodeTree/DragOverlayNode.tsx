import type { INode } from "../../types/node";
import styles from "./DragOverlayNode.module.css";

interface DragOverlayNodeProps {
  depth: number;
  node: INode;
}

export function DragOverlayNode({ node, depth }: DragOverlayNodeProps) {
  const displayContent = node?.content ?? "";

  return (
    <div
      className={styles.overlayRow}
      style={{ "--depth": depth } as React.CSSProperties}
    >
      <div className={styles.gutter} />
      <span className={styles.content}>
        {node.linkId && <span className={styles.linkIcon}>⛓ </span>}
        {displayContent || <span className={styles.empty}>Empty node</span>}
      </span>
    </div>
  );
}
