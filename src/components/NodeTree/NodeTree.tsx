import { useStore } from '../../store';
import { flattenVisible } from '../../lib/tree';
import { NodeItem } from './NodeItem';
import styles from './NodeTree.module.css';

interface NodeTreeProps {
  rootIds: string[];
}

export function NodeTree({ rootIds }: NodeTreeProps) {
  const nodes = useStore((s) => s.nodes);
  const flat = flattenVisible(rootIds, nodes);

  return (
    <div className={styles.tree}>
      {flat.map(({ id, depth }) => (
        <NodeItem key={id} nodeId={id} depth={depth} />
      ))}
    </div>
  );
}
