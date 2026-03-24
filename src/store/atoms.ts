import { atom } from "jotai";
import type { INodeAction } from "../types/actions";
import type { INodeMap } from "../types/node";

export const nodesAtom = atom<INodeMap>({});
export const dailyIdsAtom = atom<string[]>([]);
export const pinnedIdsAtom = atom<string[]>([]);

export const undoStackAtom = atom<INodeAction[]>([]);
export const redoStackAtom = atom<INodeAction[]>([]);

export const activeNodeIdAtom = atom<string | null>(null);
