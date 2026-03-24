import type { INode, INodeChanges } from "./node";

export interface INodeCreateAction {
  type: "create";
  parentId: string | null;
  index?: number;
  payload: INodeChanges;
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
  nodeId: string;
  payload: INode;
}

export interface INodeFocusAction {
  type: "focus";
  nodeId: string;
}

export type INodeAction =
  | INodeCreateAction
  | INodeUpdateAction
  | INodeMoveAction
  | INodeRemoveAction
  | INodeFocusAction;
