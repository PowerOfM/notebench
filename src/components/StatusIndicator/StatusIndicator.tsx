import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { makeAction } from "../../store/actions";
import { nodeActionAtom } from "../../store/dispatch";
import { nodesAtom } from "../../store/atoms";
import type { IStatus, ProjectStatus } from "../../types/node";
import styles from "./StatusIndicator.module.css";

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  todo: "Todo",
  "in-progress": "In Progress",
  done: "Done",
  archived: "Archived",
};

const PROJECT_STATUS_CLASS: Record<ProjectStatus, string> = {
  todo: styles.todo,
  "in-progress": styles.inProgress,
  done: styles.done,
  archived: styles.archived,
};

const PROJECT_STATUS_CYCLE: Record<ProjectStatus, ProjectStatus> = {
  todo: "in-progress",
  "in-progress": "done",
  done: "archived",
  archived: "todo",
};

interface StatusIndicatorProps {
  nodeId: string;
}

export function StatusIndicator({ nodeId }: StatusIndicatorProps) {
  const nodes = useAtomValue(nodesAtom);
  const dispatch = useSetAtom(nodeActionAtom);
  const node = nodes[nodeId];

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!node?.status) return;
      if (node.status.type === "checkbox") {
        dispatch(
          makeAction.update(nodeId, {
            status: { type: "checkbox", checked: !node.status.checked },
          }),
        );
      } else if (node.status.type === "project") {
        dispatch(
          makeAction.update(nodeId, {
            status: {
              type: "project",
              category: PROJECT_STATUS_CYCLE[node.status.category],
              label: PROJECT_STATUS_LABELS[PROJECT_STATUS_CYCLE[node.status.category]],
            },
          }),
        );
      }
    },
    [node, nodeId, dispatch],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!node) return;

      // Cycle status types: none → checkbox → project → none
      let nextStatus: IStatus | undefined;
      if (!node.status) {
        nextStatus = { type: "checkbox", checked: false };
      } else if (node.status.type === "checkbox") {
        nextStatus = { type: "project", category: "todo", label: "Todo" };
      } else {
        nextStatus = undefined; // remove status
      }
      dispatch(makeAction.update(nodeId, { status: nextStatus }));
    },
    [node, nodeId, dispatch],
  );

  if (!node) return null;

  const status = node.status;

  return (
    <div
      className={styles.indicator}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={
        !status
          ? "Right-click to set status"
          : status.type === "checkbox"
            ? status.checked
              ? "Checked — click to uncheck"
              : "Click to check · Right-click to change type"
            : status.category === "todo"
              ? `Status: Todo — click to cycle · Right-click to change type`
              : `Status: ${PROJECT_STATUS_LABELS[status.category]} — click to cycle`
      }
      role="button"
      tabIndex={-1}
      aria-label="Status indicator"
    >
      {!status && <div className={styles.noneHint} />}

      {status?.type === "checkbox" && (
        <div className={`${styles.checkbox} ${status.checked ? styles.checked : ""}`}>
          {status.checked && <span className={styles.checkmark}>✓</span>}
        </div>
      )}

      {status?.type === "project" && (
        <div className={`${styles.badge} ${PROJECT_STATUS_CLASS[status.category]}`}>
          {PROJECT_STATUS_LABELS[status.category]}
        </div>
      )}
    </div>
  );
}
