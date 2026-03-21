export type StatusType = "none" | "checkable" | "project";
export type ProjectStatus = "todo" | "in-progress" | "done" | "archived";

export interface MentionRef {
  nodeId: string;
  offset: number;
  length: number;
}

export interface NodeData {
  id: string;
  parentId: string | null;
  content: string;
  linkId?: string | null; // symbolic link target; null = normal node
  childrenIds: string[];
  mentions?: MentionRef[];
  statusType: StatusType;
  projectStatus: ProjectStatus | null;
  checked: boolean;
  collapsed: boolean;
  createdAt: number;
  updatedAt: number;
  isDaily: boolean;
  dailyDate: string | null;
}

export type NodeMap = Record<string, NodeData>;
