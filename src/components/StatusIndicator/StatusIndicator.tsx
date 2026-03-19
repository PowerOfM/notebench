import { useCallback } from 'react';
import { useStore } from '../../store';
import type { StatusType } from '../../types/node';
import styles from './StatusIndicator.module.css';

const STATUS_LABELS: Record<string, string> = {
  todo: 'Todo',
  'in-progress': 'In Progress',
  done: 'Done',
  archived: 'Archived',
};

const STATUS_CLASS: Record<string, string> = {
  todo: styles.todo,
  'in-progress': styles.inProgress,
  done: styles.done,
  archived: styles.archived,
};

interface StatusIndicatorProps {
  nodeId: string;
}

export function StatusIndicator({ nodeId }: StatusIndicatorProps) {
  const node = useStore((s) => s.nodes[nodeId]);
  const toggleChecked = useStore((s) => s.toggleChecked);
  const cycleProjectStatus = useStore((s) => s.cycleProjectStatus);
  const setStatusType = useStore((s) => s.setStatusType);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!node) return;
      if (node.statusType === 'checkable') {
        toggleChecked(nodeId);
      } else if (node.statusType === 'project') {
        cycleProjectStatus(nodeId);
      }
    },
    [node, nodeId, toggleChecked, cycleProjectStatus]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!node) return;
      // Block type change if the node has a meaningful status value set:
      // checkable + checked, or project with status beyond 'todo'
      const isLocked =
        (node.statusType === 'checkable' && node.checked) ||
        (node.statusType === 'project' && node.projectStatus !== 'todo');
      if (isLocked) return;
      // Cycle status types: none → checkable → project → none
      const next: StatusType =
        node.statusType === 'none'
          ? 'checkable'
          : node.statusType === 'checkable'
          ? 'project'
          : 'none';
      setStatusType(nodeId, next);
    },
    [node, nodeId, setStatusType]
  );

  if (!node) return null;

  return (
    <div
      className={styles.indicator}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={
        node.statusType === 'none'
          ? 'Right-click to set status'
          : node.statusType === 'checkable'
          ? node.checked
            ? 'Checked — click to uncheck'
            : 'Click to check · Right-click to change type'
          : node.projectStatus === 'todo'
          ? `Status: Todo — click to cycle · Right-click to change type`
          : `Status: ${STATUS_LABELS[node.projectStatus ?? 'todo']} — click to cycle`
      }
      role="button"
      tabIndex={-1}
      aria-label="Status indicator"
    >
      {node.statusType === 'none' && <div className={styles.noneHint} />}

      {node.statusType === 'checkable' && (
        <div className={`${styles.checkbox} ${node.checked ? styles.checked : ''}`}>
          {node.checked && <span className={styles.checkmark}>✓</span>}
        </div>
      )}

      {node.statusType === 'project' && (
        <div className={`${styles.badge} ${STATUS_CLASS[node.projectStatus ?? 'todo']}`}>
          {STATUS_LABELS[node.projectStatus ?? 'todo']}
        </div>
      )}
    </div>
  );
}
