import { atom } from "jotai";
import type { INodeAction } from "../types/actions";
import type { INodeMap } from "../types/node";

export const nodesAtom = atom<INodeMap>({});
export const dailyIdsAtom = atom<string[]>([]);
export const pinnedIdsAtom = atom<string[]>([]);

export const undoStackAtom = atom<INodeAction[]>([]);
export const redoStackAtom = atom<INodeAction[]>([]);

export const activeNodeIdAtom = atom<string | null>(null);

// UI state atoms
export const activeParentIdAtom = atom<string | null>(null);
export const sidebarCollapsedAtom = atom<boolean>(false);
export const settingsPanelOpenAtom = atom<boolean>(false);
export const projectColumnsAtom = atom<number>(2);
export const dailyColumnsAtom = atom<number>(2);

// Derived atoms
export const canUndoAtom = atom((get) => get(undoStackAtom).length > 0);
export const canRedoAtom = atom((get) => get(redoStackAtom).length > 0);
