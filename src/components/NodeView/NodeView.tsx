import { NodeContent } from "../NodeContent/NodeContent";
import { NodeTree } from "../NodeTree/NodeTree";
import styles from "./NodeView.module.css";

interface IProps {
  rootId: string;
}

export function NodeView({ rootId }: IProps) {
  // const nodes = useAtomValue(nodesAtom);
  // const dispatch = useSetAtom(nodeActionAtom);
  // const rootNode = nodes[rootId];

  // const handleAddNode = useCallback(() => {
  //   dispatch(makeAction.create(rootId));
  // }, [dispatch, rootId]);

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
        <NodeTree rootId={rootId} />
      </div>
    </div>
  );
}
