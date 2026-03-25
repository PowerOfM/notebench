# Notebench Implementation Plan

## Context

Build "Notebench" — a client-only Workflowy-like outliner web app. Users create hierarchical nodes (projects, tasks, notes) with collapsible trees, status indicators, `@` mention linking, daily journal nodes, and data export. All data lives in IndexedDB (via Dexie.js) with no backend. Performance is the top priority — editing should feel like typing in a native document.

## Tech Stack

- **React + Vite + TypeScript**
- **CSS Modules** for styling
- **Jotai** for state management (replacing Zustand)
- **Plain `contenteditable` divs** for node editing (no TipTap — too heavy)
- **@dnd-kit** for drag-and-drop reordering/reparenting
- **fuse.js** for fuzzy search in `@` mentions
- **Dexie.js** for IndexedDB persistence (no size limits, async, structured)
- **dexie-export-import** for database export/import (JSON blob)
- **nanoid** for node IDs

## Data Model

```typescript
interface IStatusCheckbox {
  type: "checkbox";
  checked: boolean;
}

interface IStatusProject {
  type: "project";
  category: "todo" | "in-progress" | "done" | "archived";
  label: string;
}

type IStatus = IStatusCheckbox | IStatusProject;

interface IMention {
  nodeId: string;
  offset: number;
  length: number;
}

interface INode {
  id: string;
  parentId: string | null;
  content: string;
  linkId?: string;           // If set, this is a symbolic link to the target node
  childrenIds?: string[];    // Ordered list of child node IDs
  mentions?: IMention[];     // Parsed mention positions for rendering
  status?: IStatus;          // Optional status (checkbox or project)
  collapsed?: boolean;       // Whether children are hidden
  isPinned?: number;         // 1 if this is a top-level pinned (project) node
  isDaily?: number;          // 1 if this is a daily note node
  createdAt: number;
  updatedAt: number;
}
```

**Content format**: Plain text with inline mention markers like `@{nodeId}`. When rendering, these are parsed and replaced with styled `<span contenteditable="false">` elements.

**Flat map storage** (`Record<NodeId, INode>`) — O(1) lookups, cheap reparenting, DnD-compatible.

**Root ordering**: `pinnedIdsAtom` tracks the ordered list of root-level project nodes. `dailyIdsAtom` tracks daily notes.

## Architecture: Jotai Event-Dispatch Pattern

All state is stored in Jotai atoms. Every user action dispatches a typed action through `nodeActionAtom`. Handlers process actions and update atoms atomically.

### Core Atoms (`store/atoms.ts`)

```typescript
nodesAtom       // Record<string, INode> — flat node map
pinnedIdsAtom   // string[] — ordered root project node IDs
dailyIdsAtom    // string[] — ordered daily note node IDs
activeNodeIdAtom // string | null — currently focused node
undoStackAtom   // INodeAction[] — undo history
redoStackAtom   // INodeAction[] — redo history
```

### Action Types (`types/actions.ts`)

```typescript
type INodeAction =
  | { type: "create"; parentId: string | null; index?: number; payload: INodeChanges; autoFocus?: boolean }
  | { type: "update"; nodeId: string; payload: INodeChanges }
  | { type: "move"; nodeId: string; parentId: string | null; index?: number }
  | { type: "remove"; nodeId: string; payload: INode }
  | { type: "focus"; nodeId: string }
```

### Action Factories + Dispatch (`store/actions.ts`)

- `makeAction` — factory helpers to construct typed actions
- `nodeActionAtom` — write-only Jotai atom; processes actions, updates `nodesAtom` / `pinnedIdsAtom`, pushes inverse actions to `undoStackAtom`

### Usage in Components

```typescript
const dispatch = useSetAtom(nodeActionAtom);
dispatch(makeAction.create(parentId, index));
dispatch(makeAction.update(nodeId, { content: "..." }));
dispatch(makeAction.focus(nodeId));
```

### Undo/Redo

Each mutating action pushes its inverse onto the undo stack. Undo pops from the undo stack, re-executes the inverse action, and pushes it to the redo stack. Redo reverses this.

## Key Architecture Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| State mgmt | Jotai atoms + event dispatch | Fine-grained subscriptions, no re-render storms, explicit action trail |
| Action pattern | Typed actions via `nodeActionAtom` | Every mutation is explicit, auditable, undo-able |
| Data structure | Flat `Record<id, node>` with parent/children refs | O(1) lookup, cheap mutations, DnD-compatible |
| Text editing | Plain `contenteditable` divs | Zero overhead, instant Enter/Tab |
| DnD | @dnd-kit/core + sortable | Reparenting via projection |
| Persistence | Dexie.js (IndexedDB) | No 5MB limit, async, structured queries |

## Project Structure

```
src/
├── main.tsx
├── App.tsx
├── types/
│   ├── node.ts           # INode, IStatus, IMention, INodeMap, INodeChanges
│   └── actions.ts        # INodeAction, INodeCreateAction, etc.
├── store/
│   ├── atoms.ts          # Core Jotai atoms
│   └── actions.ts        # makeAction factories + nodeActionAtom handler
├── lib/
│   ├── tree.ts           # Pure tree utilities (flattenVisible, getProjection, etc.)
│   ├── db.ts             # Dexie.js database
│   ├── exportImport.ts   # dexie-export-import wrapper
│   ├── contentParser.ts  # Parse/render content with @{id} mention markers
│   ├── fuzzySearch.ts    # fuse.js wrapper
│   ├── linkResolver.ts   # Resolve linkId chains with cycle detection
│   └── id.ts             # nanoid wrapper
├── hooks/
│   ├── useNodeKeyboard.ts  # Per-node keydown handler (Enter, Tab, Backspace, arrows)
│   └── usePersistence.ts   # Jotai atoms → Dexie auto-save
├── components/
│   ├── Layout/             # App shell + Sidebar
│   ├── NodeView/           # Root view for a single project/daily note
│   ├── NodeTree/           # DnD tree renderer + NodeItem
│   ├── NodeContent/        # contenteditable div + mention rendering
│   ├── StatusIndicator/    # Checkbox / project badge
│   ├── MentionPopup/       # Floating @ search popup
│   └── FloatingToolbar/    # Mobile/touch action toolbar
└── styles/
    ├── global.css
    └── variables.css
```

## Component Hierarchy (NodeView focus)

```
<App>
  <Sidebar>  (project list — reads pinnedIdsAtom + nodesAtom)
  <NodeView rootId="...">
    <NodeContent nodeId={rootId} isRootTitle />
    <NodeTree rootIds={[...childrenIds]}>
      <NodeItem nodeId="..." depth={n}>
        <StatusIndicator nodeId="..." />
        <NodeContent nodeId="..." />
```

## Node Editing

Each node's text is a `<div contenteditable="true">`. `useNodeKeyboard` handles:

- **Enter** — create sibling node below (`makeAction.create`)
- **Tab** — indent (become child of previous sibling via `makeAction.move`)
- **Shift+Tab** — outdent (become sibling of parent via `makeAction.move`)
- **Backspace (empty/at-start)** — delete node (`makeAction.remove`)
- **Arrow Up/Down** — focus previous/next visible node (`makeAction.focus`)
- **Cmd/Ctrl+Enter** — toggle checkbox status (`makeAction.update`)

Content changes dispatch `makeAction.update(nodeId, { content, mentions })` on the `input` event (debounced).

## Node Linking (Symbolic Links)

A node with `linkId` points to a target node and renders as if it were the target. All edits dispatch on the target's ID. The link node has its own `collapsed` state. Deleting a link node only removes it; the target is unaffected.

## Persistence

`usePersistence` subscribes to Jotai atoms via `store` (the jotai store from `useStore`) and debounces writes to IndexedDB:
- Load on mount: `db.nodes.toArray()` → set atoms
- Auto-save: subscribe to atom changes → debounced 300ms → `db.nodes.bulkPut()`

## NodeView vs Workbench

For now, only **NodeView** is implemented. Workbench view is deferred.

## Implementation Status

### Completed
- Core Jotai atoms (`store/atoms.ts`)
- Action factories + dispatch handler (`store/actions.ts`)
- Action types (`types/actions.ts`)
- Updated node types (`types/node.ts`)
- `useNodeKeyboard` skeleton (Enter, Backspace wired; Tab/arrows TBD)
- `NodeContent` partially wired to Jotai

### In Progress (this refactor)
1. Fix all TypeScript errors from the old Zustand → Jotai migration
2. Update `NodeItem`, `StatusIndicator`, `NodeTree` to use Jotai
3. Implement indent/outdent (`makeAction.move`) in `useNodeKeyboard`
4. Implement ArrowUp/Down navigation in `useNodeKeyboard`
5. Wire up `NodeView` with `NodeTree`
6. Wire up `App.tsx` to load data and show active project
7. Rewrite `usePersistence` for Jotai
8. Update `Sidebar` to dispatch `create` and `focus` actions
9. Fix `FloatingToolbar` and `Layout`

### Deferred
- Workbench view
- @ mentions popup
- Node linking UI (`[[` trigger)
- Export/import dialog
- Settings panel
- Daily notes auto-creation
