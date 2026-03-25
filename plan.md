# Notebench Implementation Plan

## Context

Build "Notebench" — a client-only Workflowy-like outliner web app. Users create hierarchical nodes (projects, tasks, notes) with collapsible trees, status indicators, `@` mention linking, daily journal nodes, and data export. All data lives in IndexedDB (via Dexie.js) with no backend. Performance is the top priority — editing should feel like typing in a native document.

## Tech Stack

- **React + Vite + TypeScript**
- **CSS Modules** for styling
- **Jotai** for state management (atoms + event-driven dispatch)
- **Plain `contenteditable` divs** for node editing (no TipTap — too heavy)
- **@dnd-kit** for drag-and-drop reordering/reparenting
- **fuse.js** for fuzzy search in `@` mentions
- **Dexie.js** for IndexedDB persistence (no size limits, async, structured)
- **dexie-export-import** for database export/import (JSON blob)
- **nanoid** for node IDs

## Data Model

```typescript
type StatusType = "none" | "checkbox" | "project";
type ProjectStatus = "todo" | "in-progress" | "done" | "archived";

interface IStatusCheckbox {
  type: "checkbox";
  checked: boolean;
}

interface IStatusProject {
  type: "project";
  category: ProjectStatus;
  label: string;
}

type IStatus = IStatusCheckbox | IStatusProject;

// Inline mention marker within content text
interface IMention {
  nodeId: string;     // referenced node ID
  offset: number;     // character offset in plain text where mention starts
  length: number;     // length of the @mention placeholder text
}

interface INode {
  id: string;
  parentId: string | null;
  content: string;              // Plain text (mentions stored as @{nodeId} markers)
  mentions?: IMention[];        // Parsed mention positions for rendering
  status?: IStatus;             // Checkbox or project status
  collapsed?: boolean;
  childrenIds?: string[];       // ordered
  linkId?: string;              // If set, this node is a symbolic link to the target node
  isPinned?: number;            // Timestamp when pinned (root projects)
  isDaily?: number;             // Timestamp when created as daily note
  createdAt: number;
  updatedAt: number;
}
```

**Content format**: Plain text with inline mention markers like `@{abc123}`. When rendering, these are parsed and replaced with styled `<span contenteditable="false">` elements showing the linked node's current text.

**Flat map storage** (`Record<NodeId, INode>` + `pinnedIds: string[]`) — O(1) lookups, cheap reparenting, DnD-compatible.

## State Architecture

### Atoms (`src/store/atoms.ts`)

```typescript
nodesAtom: atom<INodeMap>({})          // All nodes in a flat map
pinnedIdsAtom: atom<string[]>([])      // Root project node IDs (ordered)
dailyIdsAtom: atom<string[]>([])       // Daily note root IDs (ordered)
focusedIdAtom: atom<string | null>(null) // Currently focused node
undoStackAtom: atom<IDispatchEvent[]>([]) // Undo history
redoStackAtom: atom<IDispatchEvent[]>([]) // Redo history
```

### Events (`src/types/actions.ts`)

Every state mutation is a dispatched event:

```typescript
interface INodeAddAction    { type: "add"; node: INode; index?: number; autoFocus?: boolean }
interface INodeUpdateAction { type: "update"; nodeId: string; payload: INodeChanges }
interface INodeMoveAction   { type: "move"; nodeId: string; parentId: string | null; index?: number }
interface INodeRemoveAction { type: "remove"; node: INode }

interface IDispatchEvent {
  action: INodeAction | null;  // null = focus-only change
  focus: string | null;        // which node to focus after action
  isUndo?: boolean;
}
```

### Action Creators (`src/store/actions.ts`)

```typescript
export const makeAction = {
  create(parentId, input?, index?, autoFocus?) → IDispatchEvent
  update(nodeId, payload) → IDispatchEvent
  move(nodeId, parentId, index?) → IDispatchEvent
  remove(node, focus?) → IDispatchEvent
  focus(nodeId) → IDispatchEvent  // { action: null, focus: nodeId }
}
```

### Dispatch (`src/store/dispatch.ts`)

```typescript
// Write-only atom — the single entry point for all mutations
export const dispatchAtom = atom(null, (get, set, event: IDispatchEvent) => {
  if (!event.action) {
    set(focusedIdAtom, event.focus);
    return;
  }
  switch (event.action.type) {
    case "add":    return handleAddNode(get, set, event);
    case "update": return handleUpdateNode(get, set, event);
    case "move":   return handleMoveNode(get, set, event.action);
    case "remove": return handleRemoveNode(get, set, event.action);
  }
});

// Also exported as nodeActionAtom for backwards-compat with components
export { dispatchAtom as nodeActionAtom };

// Hook for components
export const useDispatch = () => useSetAtom(dispatchAtom);
```

### Handlers (`src/store/handlers.ts`)

Pure functions `(get: Getter, set: Setter, event) => void`. Each handler:
1. Reads current state from atoms via `get()`
2. Computes next state
3. Writes next state to atoms via `set()`
4. Pushes the inverse action onto `undoStackAtom` for undo/redo

## Component Architecture

```
<App>
  usePersistence()   — loads DB on mount, debounced auto-save
  useUndoRedo()      — Cmd+Z / Cmd+Shift+Z global handler

  <SingleNodeLayout>
    <Sidebar>         — pinned project list, "add project" button
    <NodeView rootId> — shown when a project is selected
      <NodeContent isRootTitle> — project title (contenteditable)
      <NodeTree rootId>         — DnD tree of child nodes
        <NodeItem nodeId depth> — one row: collapse btn + status + content + menu
          <StatusIndicator>     — checkbox or project badge
          <NodeContent>         — contenteditable for node text
          <NodeItemMenu>        — "…" dropdown (delete, etc.)
```

## Node Editing (contenteditable)

Each node's text is a `<div contenteditable="true">`. This approach:

- **No mount/unmount cost** — the div is always there, always editable
- **Instant Enter/Tab** — keydown handlers on the div directly manipulate atoms via dispatch
- **@mentions as atomic spans** — `<span contenteditable="false" data-mention-id="...">` inside the contenteditable div
- **Content sync** — on `input` event (debounced), extract text + mention positions from DOM, dispatch update action

### Content serialization

```
Stored:    "Working on @{abc123} next week"
Rendered:  "Working on [🔗 Design homepage] next week"
                       ^--- <span contenteditable="false" data-mention-id="abc123">
```

`contentParser.ts` handles:
- `serializeFromDOM(div)` → extract plain text with `@{id}` markers
- `renderToDOM(content, mentions, nodes, onMentionClick)` → build innerHTML with styled mention spans

### Keyboard shortcuts

Handled via `onKeyDown` on each `<div contenteditable>` (in `useNodeKeyboard.ts`):

- **Enter** — `preventDefault()`, create sibling node below (or first child if root title), focus it
- **Tab** — indent: move node to become last child of its previous sibling
- **Shift+Tab** — outdent: move node to become next sibling of its parent
- **Backspace at position 0 on empty** — delete node, focus previous sibling
- **Arrow Up** (cursor at start) — focus previous visible node
- **Arrow Down** (cursor at end) — focus next visible node
- **Cmd/Ctrl+Enter** — toggle checkbox status

### Focus management

`focusedIdAtom` tracks which node has focus. When it changes:
- The corresponding `NodeContent` component calls `div.focus()` via `useEffect`
- Cursor is set to start of content
- Unidirectional: keyboard handler → dispatch → atom → useEffect → DOM focus

## @ Mentions

1. User types `@` in any node's contenteditable
2. `MentionPopup` renders as a floating portal, positioned via `window.getSelection().getRangeAt(0).getBoundingClientRect()`
3. Popup shows fuse.js fuzzy search results against all node text content
4. Arrow keys navigate the list, Enter selects
5. On selection: insert `<span contenteditable="false" data-mention-id="nodeId">` at cursor position, remove the `@query` text
6. Dispatch `update` action with serialized content + mentions

## Node Linking (Symbolic Links)

A **link node** is a node whose `linkId` points to a target node. It behaves like a symbolic link:

- **Content** — always displays the target node's `content`. Editing it updates the target via dispatch.
- **Status** — always reflects the target's `status`. Toggling updates the target.
- **Children** — renders the target's `childrenIds` subtree. Structural changes affect the target.
- **Collapse** — link node has its own `collapsed` state independent of target.
- **Deletion** — removes only the link; target is untouched.

## Drag and Drop

Uses dnd-kit's SortableTree pattern:
1. Flatten visible tree to flat array (respecting collapsed)
2. Track horizontal drag offset → `getProjection()` computes target depth/parent
3. On drop: `dispatch(makeAction.move(id, newParentId, newIndex))`
4. Visual: depth indicator at projected position during drag

## Persistence (Dexie.js / IndexedDB)

```typescript
class NotebenchDB extends Dexie {
  nodes: Table<INode, "id">;
  meta: Table<{ key: string; value: any }, string>;
}
```

- **Load**: On mount, `db.nodes.toArray()` → build flat map → set `nodesAtom` and `pinnedIdsAtom`
- **Auto-save**: `usePersistence` hook subscribes to atom changes (via React effects), debounces 300ms → `db.nodes.bulkPut()` for changed nodes, `db.nodes.bulkDelete()` for removed nodes
- **Root ordering**: `pinnedIdsAtom` value stored in `meta` table as `{ key: 'pinnedIds', value: [...] }`
- **Export**: `dexie-export-import` → download as `.json` file
- **Import**: `importDB(blob)` → re-hydrate atoms

## Undo / Redo

- Each handler pushes the **inverse** `IDispatchEvent` onto `undoStackAtom`
- `useUndoRedo` hook listens for Cmd+Z → pops undo stack, dispatches the inverse event with `isUndo: true`
- When `isUndo: true`, the dispatch saves a redo entry to `redoStackAtom` before applying

## Project Structure

```
src/
├── main.tsx
├── App.tsx                        # Root: SingleNodeLayout + usePersistence + useUndoRedo
├── types/
│   ├── node.ts                    # INode, IStatus, IMention, INodeMap
│   └── actions.ts                 # IDispatchEvent, INodeAction types
├── store/
│   ├── atoms.ts                   # Jotai atoms (state only)
│   ├── actions.ts                 # makeAction creators (no atoms)
│   ├── dispatch.ts                # dispatchAtom + useDispatch hook
│   ├── handlers.ts                # Pure handler functions
│   └── handlerHelpers.ts          # addToParent, removeFromParent, etc.
├── lib/
│   ├── tree.ts                    # Pure tree utilities (flatten, siblings, projection)
│   ├── db.ts                      # Dexie.js database definition
│   ├── contentParser.ts           # Parse/render content with @{id} mention markers
│   ├── linkResolver.ts            # resolveLink() with cycle detection
│   └── id.ts                      # nanoid wrapper
├── hooks/
│   ├── useNodeKeyboard.ts         # Per-node keydown handler (Enter, Tab, Backspace, arrows)
│   ├── usePersistence.ts          # Jotai atoms → Dexie auto-save
│   └── useUndoRedo.ts             # Cmd+Z / Cmd+Shift+Z using undoStack/redoStack atoms
├── components/
│   ├── Layout/                    # Layout shell + Sidebar
│   ├── NodeTree/                  # DnD tree + NodeItem
│   ├── NodeContent/               # contenteditable div + mention rendering
│   ├── NodeView/                  # Root project view (title + NodeTree)
│   ├── StatusIndicator/           # Checkbox / project badge
│   ├── MentionPopup/              # Floating @ search popup
│   └── DropdownMenu/              # Generic dropdown component
└── styles/
    ├── global.css
    └── variables.css
```

## Implementation Phases

### Phase 1 (done): Scaffolding + Core Tree
- Vite + React + TS, CSS Modules, design tokens
- INode types, flat map storage
- NodeTree, NodeItem, NodeContent (contenteditable)
- Keyboard: Enter, Backspace

### Phase 2 (done): Status System
- IStatus discriminated union (checkbox / project)
- StatusIndicator component
- Cmd+Ctrl+Enter: toggle checkbox

### Phase 3 (done): Collapse/Expand + DnD
- Collapse toggle, flattenVisible()
- dnd-kit SortableTree, getProjection(), moveNode dispatch

### Phase 4 (current): Jotai Refactor
- Replace Zustand with Jotai atoms
- Event-driven dispatch system (dispatchAtom + handlers)
- All mutations go through `dispatch(makeAction.*)`
- Undo/redo via inverse events on undoStack
- Fix NodeView: NodeTree renders children of selected project
- Focus: Tab/Shift+Tab indent/outdent, Arrow Up/Down navigation
- NodeView only (Workbench deferred)

### Phase 5 (planned): @ Mentions + Node Linking
- MentionPopup: detect `@`, fuse.js search, insert mention span
- contentParser: serialize/render `@{id}` markers
- LinkPopup: detect `[[`, create linked node

### Phase 6 (planned): Persistence
- usePersistence hook: Jotai atoms → Dexie auto-save
- Load from DB on mount, debounced writes

### Phase 7 (planned): Daily Nodes + Export/Import
- Auto-create today's daily node
- dexie-export-import integration

### Phase 8 (planned): Polish
- Workbench view (horizontal scroll cards)
- Empty states, responsive layout
- Floating toolbar for mobile
- Accessibility audit
- Performance with 500+ nodes

## Verification

After each phase:
1. `npm run dev` → manual testing in browser
2. Verify IndexedDB: DevTools → Application → IndexedDB → "notebench"
3. Phase-specific checks:
   - Phase 4: Create projects in sidebar, add child nodes with Enter, indent/outdent with Tab/Shift+Tab, delete with Backspace, drag to reorder/reparent, undo with Cmd+Z
