export type StatusType = "none" | "checkable" | "project";
export type ProjectStatus = "todo" | "in-progress" | "done" | "archived";

export interface IStatusCheckbox {
  type: "checkbox";
  checked: boolean;
}

export interface IStatusProject {
  type: "project";
  category: ProjectStatus;
  label: string;
}

export type IStatus = IStatusCheckbox | IStatusProject;

export interface IMention {
  nodeId: string;
  offset: number;
  length: number;
}

export interface INode {
  id: string;
  parentId: string | null;
  content: string;
  linkId?: string;
  childrenIds?: string[];
  mentions?: IMention[];
  status?: IStatus;
  collapsed?: boolean;
  isPinned?: number;
  isDaily?: number;
  createdAt: number;
  updatedAt: number;
}

export type INodeChanges = Partial<
  Omit<INode, "id" | "createdAt" | "updatedAt">
>;

export type INodeMap = Record<string, INode>;
