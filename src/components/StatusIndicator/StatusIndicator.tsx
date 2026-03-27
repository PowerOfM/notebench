import { useCallback } from "react";
import { actions } from "../../store/actions";
import { useDispatch } from "../../store/dispatch";
import type { INode } from "../../types/node";
import styles from "./StatusIndicator.module.css";

const STATUS_LABELS: Record<string, string> = {
  todo: "Todo",
  "in-progress": "In Progress",
  done: "Done",
  archived: "Archived",
};

const STATUS_CLASS: Record<string, string> = {
  todo: styles.todo,
  "in-progress": styles.inProgress,
  done: styles.done,
  archived: styles.archived,
};

interface StatusIndicatorProps {
  node: INode;
}

export function StatusIndicator({ node }: StatusIndicatorProps) {
  const dispatch = useDispatch();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!node) return;
      if (node.status?.type === "checkbox") {
        dispatch(
          actions.update(node.id, {
            status: { type: "checkbox", checked: !node.status.checked },
          }),
        );
      } else if (node.status?.type === "project") {
        dispatch(
          actions.update(node.id, {
            status: {
              type: "project",
              category:
                node.status.category === "todo" ? "in-progress" : "done",
              label: STATUS_LABELS[node.status.category ?? "todo"],
            },
          }),
        );
      }
    },
    [node, dispatch],
  );

  // const handleContextMenu = useCallback(
  //   (e: React.MouseEvent) => {
  //     e.preventDefault();
  //     e.stopPropagation();
  //     if (!node) return;
  //     // Block type change if the node has a meaningful status value set:
  //     // checkable + checked, or project with status beyond 'todo'
  //     const isLocked =
  //       (node.status?.type === "checkbox" && node.status.checked) ||
  //       (node.status?.type === "project" && node.status.category !== "todo");
  //     if (isLocked) return;
  //     // Cycle status types: none → checkable → project → none
  //     const next: StatusType =
  //       !node.status
  //         ? "checkbox"
  //         : node.status?.type === "checkbox"
  //           ? "project"
  //           : "none";
  //     dispatch(actions.update(node.id, { status: { type: next } }));
  //   },
  //   [node, nodeId, setStatusType],
  // );

  if (!node) return null;

  return (
    <div
      className={styles.indicator}
      onClick={handleClick}
      // onContextMenu={handleContextMenu}
      title={
        !node.status
          ? "Right-click to set status"
          : node.status?.type === "checkbox"
            ? node.status.checked
              ? "Checked — click to uncheck"
              : "Click to check · Right-click to change type"
            : node.status?.type === "project"
              ? `Status: ${STATUS_LABELS[node.status.category ?? "todo"]} — click to cycle`
              : `Status: Todo — click to cycle · Right-click to change type`
      }
      role="button"
      tabIndex={-1}
      aria-label="Status indicator"
    >
      {!node.status && <div className={styles.noneHint} />}

      {node.status?.type === "checkbox" && (
        <div
          className={`${styles.checkbox} ${node.status.checked ? styles.checked : ""}`}
        >
          {node.status.checked && <span className={styles.checkmark}>✓</span>}
        </div>
      )}

      {node.status?.type === "project" && (
        <div
          className={`${styles.badge} ${STATUS_CLASS[node.status.category ?? "todo"]}`}
        >
          {STATUS_LABELS[node.status.category ?? "todo"]}
        </div>
      )}
    </div>
  );
}
