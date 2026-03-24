import type { INode, INodeMap } from "../../types/node";

export interface TreeState {
  nodes: INodeMap;
  dailyIds: string[];
  pinnedIds: string[];
}

export interface TreeActions {
  load: (tree: INode, dailyIds: string[], pinnedIds: string[]) => void;
  update: (nodeId: string, content: Partial<INode>) => void;
  create: (parentId: string | null, index?: number) => string;
  move: (nodeId: string, newParentId: string | null, newIndex: number) => void;
  remove: (id: string) => void;
  setIsPinned: (id: string, pinned: boolean) => void;
  setIsDaily: (id: string, daily: boolean) => void;
}
