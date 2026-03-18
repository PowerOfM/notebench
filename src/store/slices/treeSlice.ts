// Type definitions for tree slice — implementation lives in store/index.ts
import type { NodeData, NodeMap } from '../../types/node';

export interface TreeState {
  nodes: NodeMap;
  rootIds: string[];
}

export interface TreeActions {
  loadNodes: (nodes: NodeData[], rootIds: string[]) => void;
  createNode: (parentId: string | null, afterId?: string) => string;
  updateContent: (id: string, content: string, mentions?: import('../../types/node').MentionRef[]) => void;
  deleteNode: (id: string) => void;
  indentNode: (id: string) => void;
  outdentNode: (id: string) => void;
  moveNode: (id: string, newParentId: string | null, newIndex: number) => void;
  toggleCollapsed: (id: string) => void;
  toggleChecked: (id: string) => void;
  cycleProjectStatus: (id: string) => void;
  setStatusType: (id: string, statusType: import('../../types/node').StatusType) => void;
}
