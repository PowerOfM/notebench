import Dexie, { type Table } from "dexie";
import type { INode, INodeChanges } from "../types/node";
import { generateId } from "./id";

export interface MetaEntry {
  key: string;
  value: unknown;
}

class NotebenchDB extends Dexie {
  nodes!: Table<INode, "id">;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super("notebench");
    this.version(1).stores({
      nodes: "++id, parentId, rootId, isPinned, isDaily",
      meta: "key",
    });
  }

  createNode(input: INodeChanges = {}) {
    this.nodes.add({
      ...input,
      id: generateId(),
      content: "",
      parentId: input.parentId ?? null,
      rootId: input.rootId ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}

export const db = new NotebenchDB();
