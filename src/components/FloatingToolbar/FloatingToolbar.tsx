import { useAtomValue, useSetAtom } from "jotai";
import { activeNodeIdAtom, nodesAtom, canUndoAtom, canRedoAtom } from "../../store/atoms";
import { nodeActionAtom, makeAction, undoAtom } from "../../store/actions";
import styles from "./FloatingToolbar.module.css";

/**
 * Floating bottom toolbar for touch/mobile devices.
 * Provides indent, outdent, status toggle and new-node shortcuts that would
 * otherwise require a keyboard. Visible only when a node is active.
 */
export function FloatingToolbar() {
  const activeNodeId = useAtomValue(activeNodeIdAtom);
  const nodes = useAtomValue(nodesAtom);
  const canUndo = useAtomValue(canUndoAtom);
  const canRedo = useAtomValue(canRedoAtom);
  const dispatch = useSetAtom(nodeActionAtom);
  const undo = useSetAtom(undoAtom);

  const node = activeNodeId ? nodes[activeNodeId] : null;

  if (!activeNodeId || !node) return null;

  const handleIndent = () => {
    // Make this node a child of its previous sibling
    const siblings =
      node.parentId == null
        ? []
        : (nodes[node.parentId]?.childrenIds ?? []);
    const currentIndex = siblings.indexOf(node.id);
    if (currentIndex > 0) {
      const prevSiblingId = siblings[currentIndex - 1];
      const prevSibling = nodes[prevSiblingId];
      if (prevSibling) {
        dispatch(
          makeAction.move(
            node.id,
            prevSiblingId,
            prevSibling.childrenIds?.length ?? 0,
          ),
        );
      }
    }
  };

  const handleOutdent = () => {
    // Move node to be a sibling of its parent (after the parent)
    if (node.parentId == null) return;
    const parent = nodes[node.parentId];
    if (!parent) return;
    const grandparentId = parent.parentId;
    const grandparentChildren =
      grandparentId == null
        ? []
        : (nodes[grandparentId]?.childrenIds ?? []);
    const parentIndexInGrandparent = grandparentChildren.indexOf(node.parentId);
    if (parentIndexInGrandparent === -1) return;
    dispatch(
      makeAction.move(node.id, grandparentId, parentIndexInGrandparent + 1),
    );
  };

  const handleStatusToggle = () => {
    if (node.status?.type === "checkbox") {
      dispatch(
        makeAction.update(activeNodeId, {
          status: { type: "checkbox", checked: !node.status.checked },
        }),
      );
    }
  };

  const handleNewNode = () => {
    const parentId = node.parentId;
    if (!parentId) return;
    dispatch(makeAction.create(parentId, undefined, {}, false));
  };

  const hasCheckbox = node.status?.type === "checkbox";

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Node actions">
      <button
        className={styles.btn}
        onPointerDown={(e) => {
          e.preventDefault();
          undo();
        }}
        aria-label="Undo (Cmd+Z)"
        title="Undo"
        disabled={!canUndo}
      >
        ↩
      </button>
      <button
        className={styles.btn}
        onPointerDown={(e) => {
          e.preventDefault();
          // redo is not yet available as a separate atom, skip for now
        }}
        aria-label="Redo (Cmd+Shift+Z)"
        title="Redo"
        disabled={!canRedo}
      >
        ↪
      </button>
      <div className={styles.separator} aria-hidden="true" />
      <button
        className={styles.btn}
        onPointerDown={(e) => {
          e.preventDefault();
          handleOutdent();
        }}
        aria-label="Outdent node (Shift+Tab)"
        title="Outdent"
      >
        ←
      </button>
      <button
        className={styles.btn}
        onPointerDown={(e) => {
          e.preventDefault();
          handleIndent();
        }}
        aria-label="Indent node (Tab)"
        title="Indent"
      >
        →
      </button>
      {hasCheckbox && (
        <button
          className={styles.btn}
          onPointerDown={(e) => {
            e.preventDefault();
            handleStatusToggle();
          }}
          aria-label="Toggle status"
          title="Toggle status"
        >
          ✓
        </button>
      )}
      <button
        className={styles.btn}
        onPointerDown={(e) => {
          e.preventDefault();
          handleNewNode();
        }}
        aria-label="New node below (Enter)"
        title="New node"
      >
        ↵
      </button>
    </div>
  );
}
