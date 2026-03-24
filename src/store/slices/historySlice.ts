import type { INode } from "../../types/node";

export interface HistoryState {
  past: INode[];
  future: INode[];
}

export interface HistoryActions {
  addHistory: (node: INode) => void;
  undo: () => void;
  redo: () => void;
}
