import { useAtomValue } from "jotai";
import { resolveLink } from "../../lib/linkResolver";
import { nodesAtom } from "../../store/atoms";
import styles from "./DragOverlayNode.module.css";

interface DragOverlayNodeProps {
  nodeId: string;
  depth: number;
}

export function DragOverlayNode({ nodeId, depth }: DragOverlayNodeProps) {
  const nodes = useAtomValue(nodesAtom);
  const node = nodes[nodeId];

  if (!node) return null;

  const effectiveNode = node.linkId ? resolveLink(nodeId, nodes) : node;
  const displayContent = effectiveNode?.content ?? "";

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
