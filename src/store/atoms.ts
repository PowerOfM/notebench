import { atom } from "jotai";
import type { IDispatchEvent } from "../types/actions";
import type { INodeMap } from "../types/node";

export const nodesAtom = atom<INodeMap>({});
export const dailyIdsAtom = atom<string[]>([]);
export const pinnedIdsAtom = atom<string[]>([]);

export const undoStackAtom = atom<IDispatchEvent[]>([]);
export const redoStackAtom = atom<IDispatchEvent[]>([]);

export const focusedIdAtom = atom<string | null>(null);
