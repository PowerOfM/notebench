import { useStore } from "../../store";
import styles from "./FloatingToolbar.module.css";

/**
 * Floating bottom toolbar for touch/mobile devices.
 * Provides indent, outdent, status toggle and new-node shortcuts that would
 * otherwise require a keyboard. Visible only when a node is active.
 */
export function FloatingToolbar() {
  const activeNodeId = useStore((s) => s.activeId);
  const indentNode = useStore((s) => s.indentNode);
  const outdentNode = useStore((s) => s.outdentNode);
  const cycleProjectStatus = useStore((s) => s.cycleProjectStatus);
  const toggleChecked = useStore((s) => s.toggleChecked);
  const createNode = useStore((s) => s.createNode);
  const setActiveNode = useStore((s) => s.setActiveNode);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.canUndo);
  const canRedo = useStore((s) => s.canRedo);
  const node = useStore((s) => (activeNodeId ? s.nodes[activeNodeId] : null));

  if (!activeNodeId || !node) return null;

  const handleNewNode = () => {
    const activeProjectId = useStore.getState().activeProjectId;
    const parentId = node.parentId ?? activeProjectId;
    if (!parentId) return;
    const id = createNode(parentId, activeNodeId);
    setActiveNode(id, false);
  };

  const handleStatusToggle = () => {
    if (node.statusType === "checkable") {
      toggleChecked(activeNodeId);
    } else if (node.statusType === "project") {
      cycleProjectStatus(activeNodeId);
    }
  };

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
          redo();
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
          outdentNode(activeNodeId);
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
          indentNode(activeNodeId);
        }}
        aria-label="Indent node (Tab)"
        title="Indent"
      >
        →
      </button>
      {(node.statusType === "checkable" || node.statusType === "project") && (
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
