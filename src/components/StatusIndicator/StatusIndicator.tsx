import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { makeAction, nodeActionAtom } from "../../store/actions";
import { nodesAtom } from "../../store/atoms";
import type { IStatus, IStatusProject } from "../../types/node";
import styles from "./StatusIndicator.module.css";

const PROJECT_LABELS: Record<string, string> = {
  todo: "Todo",
  "in-progress": "In Progress",
  done: "Done",
  archived: "Archived",
};

const PROJECT_CLASS: Record<string, string> = {
  todo: styles.todo,
  "in-progress": styles.inProgress,
  done: styles.done,
  archived: styles.archived,
};

const PROJECT_CYCLE: Record<string, string> = {
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
      if (!node) return;
      if (node.status?.type === "checkbox") {
        const next: IStatus = { type: "checkbox", checked: !node.status.checked };
        dispatch(makeAction.update(nodeId, { status: next }));
      } else if (node.status?.type === "project") {
        const nextCategory = PROJECT_CYCLE[node.status.category] ?? "todo";
        const next: IStatus = {
          type: "project",
          category: nextCategory as IStatusProject["category"],
          label: PROJECT_LABELS[nextCategory] ?? nextCategory,
        };
        dispatch(makeAction.update(nodeId, { status: next }));
      }
    },
    [node, nodeId, dispatch],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!node) return;
      // Block type change if meaningful status is set
      const isLocked =
        (node.status?.type === "checkbox" && node.status.checked) ||
        (node.status?.type === "project" && node.status.category !== "todo");
      if (isLocked) return;
      // Cycle: none → checkbox → project → none
      let next: IStatus | undefined;
      if (!node.status) {
        next = { type: "checkbox", checked: false };
      } else if (node.status.type === "checkbox") {
        next = { type: "project", category: "todo", label: "Todo" };
      } else {
        next = undefined;
      }
      dispatch(makeAction.update(nodeId, { status: next }));
    },
    [node, nodeId, dispatch],
  );

  if (!node) return null;

  const status = node.status;

  function getTitle(): string {
    if (!status) return "Right-click to set status";
    if (status.type === "checkbox") {
      return status.checked
        ? "Checked — click to uncheck"
        : "Click to check · Right-click to change type";
    }
    if (status.type === "project") {
      return status.category === "todo"
        ? "Status: Todo — click to cycle · Right-click to change type"
        : `Status: ${PROJECT_LABELS[status.category] ?? status.category} — click to cycle`;
    }
    return "";
  }

  return (
    <div
      className={styles.indicator}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={getTitle()}
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
        <div className={`${styles.badge} ${PROJECT_CLASS[status.category] ?? ""}`}>
          {PROJECT_LABELS[status.category] ?? status.category}
        </div>
      )}
    </div>
  );
}
