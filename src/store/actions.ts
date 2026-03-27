import { createNode } from "../lib/tree";
import {
  IDispatchEventGeneric,
  INodeAddAction,
  INodeMoveAction,
  INodeRemoveAction,
  INodeUpdateAction,
} from "../types/actions";
import { INode, INodeChanges } from "../types/node";

export const actions = {
  create: (
    parentId: string | null,
    input: INodeChanges = {},
    index?: number,
    autoFocus = true,
  ): IDispatchEventGeneric<INodeAddAction> => {
    const node = createNode(parentId, input);
    return { action: { type: "add", node, index, autoFocus }, focus: node.id };
  },
  update: (
    nodeId: string,
    payload: INodeChanges,
  ): IDispatchEventGeneric<INodeUpdateAction> => ({
    action: { type: "update", nodeId, payload },
    focus: nodeId,
  }),
  move: (
    nodeId: string,
    parentId: string | null,
    index?: number,
  ): IDispatchEventGeneric<INodeMoveAction> => ({
    action: { type: "move", nodeId, parentId, index },
    focus: nodeId,
  }),
  remove: (
    node: INode,
    focus?: string,
  ): IDispatchEventGeneric<INodeRemoveAction> => ({
    action: { type: "remove", node },
    focus: focus ?? null,
  }),
  focus: (focus: string | null): IDispatchEventGeneric<null> => ({
    action: null,
    focus,
  }),
};
