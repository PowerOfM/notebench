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
  }
}

export const db = new NotebenchDB();
