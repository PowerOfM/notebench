import Dexie, { type Table } from 'dexie';
import type { NodeData } from '../types/node';

export interface MetaEntry {
  key: string;
  value: unknown;
}

class NotebenchDB extends Dexie {
  nodes!: Table<NodeData, string>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super('notebench');
    this.version(1).stores({
      nodes: 'id, parentId, isDaily, dailyDate',
      meta: 'key',
    });
    // v2: adds linkedNodeId field — no new index, migrate existing rows to null
    this.version(2)
      .stores({
        nodes: 'id, parentId, isDaily, dailyDate',
        meta: 'key',
      })
      .upgrade((tx) =>
        tx
          .table('nodes')
          .toCollection()
          .modify((node) => {
            if (!('linkedNodeId' in node)) node.linkedNodeId = null;
          })
      );
  }
}

export const db = new NotebenchDB();
