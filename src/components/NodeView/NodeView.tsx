import { useAtomValue } from "jotai";
import { nodesAtom } from "../../store/atoms";
import { NodeContent } from "../NodeContent/NodeContent";
import { NodeTree } from "../NodeTree/NodeTree";
import styles from "./NodeView.module.css";

interface IProps {
  rootId: string;
}

export function NodeView({ rootId }: IProps) {
  const nodes = useAtomValue(nodesAtom);
  const rootNode = nodes[rootId];
  const childrenIds = rootNode?.childrenIds ?? [];

  return (
    <div className={styles.projectView}>
      <div className={styles.projectHeader}>
        <NodeContent
          nodeId={rootId}
          isRootTitle
          placeholder="Project name..."
        />
      </div>
      <div className={styles.content}>
        <NodeTree rootChildrenIds={childrenIds} />
      </div>
    </div>
  );
}
