import { createNode } from "../lib/tree";
import { IDispatchEvent } from "../types/actions";
import { INode, INodeChanges } from "../types/node";

export const makeAction = {
  create: (
    parentId: string | null,
    input: INodeChanges = {},
    index?: number,
    autoFocus = true,
  ): IDispatchEvent => {
    const node = createNode(parentId, input);
    return { action: { type: "add", node, index, autoFocus }, focus: node.id };
  },
  update: (nodeId: string, payload: INodeChanges): IDispatchEvent => ({
    action: { type: "update", nodeId, payload },
    focus: nodeId,
  }),
  move: (
    nodeId: string,
    parentId: string | null,
    index?: number,
  ): IDispatchEvent => ({
    action: { type: "move", nodeId, parentId, index },
    focus: nodeId,
  }),
  remove: (node: INode, focus?: string | null): IDispatchEvent => ({
    action: { type: "remove", node },
    focus: focus ?? null,
  }),
  focus: (focus: string): IDispatchEvent => ({ action: null, focus }),
};

/** @deprecated use makeAction */
export const actions = makeAction;
