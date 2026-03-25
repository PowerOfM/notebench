import type { INode, INodeChanges } from "./node";

export interface INodeAddAction {
  type: "add";
  node: INode;
  index?: number;
  autoFocus?: boolean;
}

export interface INodeUpdateAction {
  type: "update";
  nodeId: string;
  payload: INodeChanges;
}

export interface INodeMoveAction {
  type: "move";
  nodeId: string;
  parentId: string | null;
  index?: number;
}

export interface INodeRemoveAction {
  type: "remove";
  node: INode;
}

export type INodeAction =
  | INodeAddAction
  | INodeUpdateAction
  | INodeMoveAction
  | INodeRemoveAction;

export interface IDispatchEvent {
  action: INodeAction | null;
  focus: string | null;
  isUndo?: boolean;
}

export interface IDispatchEventGeneric<ActionType> {
  action: ActionType;
  focus: string | null;
  isUndo?: boolean;
}
