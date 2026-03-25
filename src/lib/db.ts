import Dexie, { type Table } from "dexie";
import type { INode } from "../types/node";

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
      nodes: "id, parentId, isPinned, isDaily",
      meta: "key",
    });
  }
}

export const db = new NotebenchDB();
