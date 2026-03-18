# Notebench Implementation Plan

## Context

Build "Notebench" — a client-only Workflowy-like outliner web app. Users create hierarchical nodes (projects, tasks, notes) with collapsible trees, status indicators, `@` mention linking, daily journal nodes, and data export. All data lives in IndexedDB (via Dexie.js) with no backend. Performance is the top priority — editing should feel like typing in a native document.

## Tech Stack

- **React + Vite + TypeScript**
- **CSS Modules** for styling
- **Zustand + Immer** for state management
- **Plain `contenteditable` divs** for node editing (no TipTap — too heavy)
- **@dnd-kit** for drag-and-drop reordering/reparenting
- **fuse.js** for fuzzy search in `@` mentions
- **Dexie.js** for IndexedDB persistence (no size limits, async, structured)
- **dexie-export-import** for database export/import (JSON blob)
- **nanoid** for node IDs

## Data Model

```typescript
type StatusType = 'none' | 'checkable' | 'project';
type ProjectStatus = 'todo' | 'in-progress' | 'done' | 'archived';

// Inline mention marker within content text
interface MentionRef {
  nodeId: string;     // referenced node ID
  offset: number;     // character offset in plain text where mention starts
  length: number;     // length of the @mention placeholder text
}

interface NodeData {
  id: string;
  parentId: string | null;
  content: string;              // Plain text (mentions stored as @{nodeId} markers)
  mentions: MentionRef[];       // Parsed mention positions for rendering
  statusType: StatusType;
  projectStatus: ProjectStatus | null;
  checked: boolean;
  collapsed: boolean;
  childrenIds: string[];        // ordered
  createdAt: number;
  updatedAt: number;
  isDaily: boolean;
  dailyDate: string | null;     // ISO date, e.g. "2026-03-17"
}
```

**Content format**: Plain text with inline mention markers like `@{abc123}`. When rendering, these are parsed and replaced with styled `<span contenteditable="false">` elements showing the linked node's current text.

**Flat map storage** (`Record<NodeId, NodeData>` + `rootIds: string[]`) — O(1) lookups, cheap reparenting, DnD-compatible.

## Key Architecture Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Data structure | Flat `Record<id, node>` with parent/children refs | O(1) lookup, cheap mutations, DnD-compatible |
| State mgmt | Zustand + Immer | Fine-grained selectors per node, no context re-render storms |
| Text editing | Plain `contenteditable` divs | Zero overhead, instant Enter/Tab, no editor framework mount/unmount. Workflowy uses the same approach |
| `@` mentions | Custom contenteditable + fuse.js popup | Lightweight: detect `@` keystroke, show popup, insert atomic `<span>` |
| DnD | @dnd-kit/core + sortable | Reparenting via projection, official tree example, lightweight |
| Persistence | Dexie.js (IndexedDB) | No 5MB limit, async, structured queries, browser-native |
| Export | dexie-export-import | Native Dexie blob export/import, no WASM needed |

## Project Structure

```
src/
├── main.tsx
├── App.tsx / App.module.css
├── types/
│   └── node.ts                   # Core types
├── store/
│   ├── index.ts                  # Zustand store + exports
│   ├── slices/
│   │   ├── treeSlice.ts          # Tree CRUD, indent, outdent, move, status
│   │   ├── uiSlice.ts           # Selection, focus, sidebar, active view
│   │   ├── settingsSlice.ts     # Column counts, preferences (persisted)
│   │   └── dailySlice.ts        # Daily node logic
│   └── selectors.ts
├── lib/
│   ├── tree.ts                   # Pure tree utilities (flatten, siblings, projection)
│   ├── db.ts                     # Dexie.js database definition + helpers
│   ├── exportImport.ts           # dexie-export-import wrapper
│   ├── contentParser.ts          # Parse/render content with @{id} mention markers
│   ├── fuzzySearch.ts            # fuse.js wrapper
│   └── id.ts                     # nanoid wrapper
├── hooks/
│   ├── useNodeKeyboard.ts        # Per-node keydown handler (Enter, Tab, Backspace, etc.)
│   ├── useNodeNavigation.ts      # Arrow-key focus management across nodes
│   └── usePersistence.ts         # Zustand → Dexie auto-save subscription
├── components/
│   ├── Layout/                   # Layout shell + Sidebar
│   ├── NodeTree/                 # Tree renderer + DnD context + NodeItem
│   ├── NodeContent/              # contenteditable div + mention rendering
│   ├── MentionPopup/             # Floating @ search popup
│   ├── StatusIndicator/          # Checkbox / project badge
│   ├── Workbench/                # WorkbenchView, WorkbenchPane, HorizontalScroller
│   ├── Settings/                 # SettingsPanel (column counts, preferences)
│   └── ExportDialog/
└── styles/
    ├── global.css
    └── variables.css
```

## Component Hierarchy

```
<App>
  <Layout>
    <Sidebar>  (project list, daily nodes, export button, view switcher)
    <MainContent>
      // View 1: Single project (click a project in sidebar)
      <ProjectView>
        <NodeTree>  (DndContext + SortableContext over flattened visible nodes)
          <NodeItem>  (indent + collapse + StatusIndicator + NodeContent)
            <NodeContent>  (contenteditable div with inline mention spans)

      // View 2: Workbench (dashboard overview)
      <WorkbenchView>
        <WorkbenchPane position="top" label="Projects">
          <HorizontalScroller count={settings.projectColumns}>
            <ProjectCard>  (compact NodeTree for one project)
        <WorkbenchPane position="bottom" label="Daily Notes">
          <HorizontalScroller count={settings.dailyColumns}>
            <DailyCard>  (compact NodeTree for one daily note, latest first)

      <SettingsPanel>  (slide-out or modal)
      <MentionPopup>  (floating, positioned near cursor via portal)
```

## Workbench View

Split-screen dashboard:

- **Top half**: Horizontally scrolling row of project cards. Each card shows a root project with its child tree (collapsed by default). Card width = `viewport / settings.projectColumns`.
- **Bottom half**: Same for daily notes, sorted latest-first.
- **Scrolling**: CSS `overflow-x: auto` + `scroll-snap-type: x mandatory` for card-by-card snapping. Left/right arrows on hover.
- **Settings**: Slide-out panel with sliders for `projectColumns` (1–4, default 2) and `dailyColumns` (1–4, default 2). Persisted in Dexie `meta` table.

## Node Editing (contenteditable)

Each node's text is a `<div contenteditable="true">`. This approach:

- **No mount/unmount cost** — the div is always there, always editable
- **Instant Enter/Tab** — keydown handlers on the div directly manipulate the store
- **@mentions as atomic spans** — `<span contenteditable="false" data-mention-id="...">` inside the contenteditable div
- **Content sync** — on `input` event (debounced), extract text + mention positions from DOM, update store

### Content serialization

```
Stored:    "Working on @{abc123} next week"
Rendered:  "Working on [🔗 Design homepage] next week"
                       ^--- <span contenteditable="false" data-mention-id="abc123">
```

`contentParser.ts` handles:
- `serializeFromDOM(div)` → extract plain text with `@{id}` markers
- `renderToDOM(content, mentions, store)` → build innerHTML with styled mention spans

### Keyboard shortcuts

Handled via `onKeyDown` on each `<div contenteditable>`:

- **Enter** — `preventDefault()`, create sibling node below, focus it
- **Tab** — indent (become child of previous sibling)
- **Shift+Tab** — outdent (become sibling of parent)
- **Backspace at position 0 on empty** — delete node, focus previous
- **Arrow Up** (cursor at start) — focus previous visible node (cursor at end)
- **Arrow Down** (cursor at end) — focus next visible node (cursor at start)
- **Cmd/Ctrl+Enter** — toggle checkbox / cycle project status
- **`@`** — open MentionPopup at cursor position

### Focus management

Store tracks `activeNodeId`. When it changes, the corresponding `NodeContent` component calls `divRef.current.focus()` + sets cursor position via `Selection` API. Unidirectional: keyboard handler → store action → state change → useEffect → DOM focus.

## @ Mentions

1. User types `@` in any node's contenteditable
2. `MentionPopup` renders as a floating portal, positioned via `window.getSelection().getRangeAt(0).getBoundingClientRect()`
3. Popup shows fuse.js fuzzy search results against all node text content
4. Arrow keys navigate the list, Enter selects
5. On selection: insert `<span contenteditable="false" data-mention-id="nodeId">` at cursor position, remove the `@query` text
6. Mention spans render with a link icon + live text from the referenced node (via Zustand selector)
7. Clicking a mention span navigates to that node

### Mention span rendering

The `NodeContent` component subscribes to referenced node data. When a linked node's text or status changes, the mention span updates automatically. Checked items show strikethrough, project items show their status color.

## Drag and Drop

Uses dnd-kit's SortableTree pattern:
1. Flatten visible tree to flat array (respecting collapse)
2. Track horizontal drag offset → `getProjection()` computes target depth/parent
3. On drop, call `store.moveNode(id, newParentId, newIndex)`
4. Visual: indentation indicator at projected depth during drag

## Persistence (Dexie.js / IndexedDB)

```typescript
// src/lib/db.ts
class NotebenchDB extends Dexie {
  nodes!: Table<NodeData, string>;
  meta!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('notebench');
    this.version(1).stores({
      nodes: 'id, parentId, isDaily, dailyDate',
      meta: 'key',
    });
  }
}
```

- **Auto-save**: Zustand subscription → debounced 300ms → `db.nodes.bulkPut()` for changed nodes
- **Load**: On startup, `db.nodes.toArray()` → build flat map → hydrate Zustand store
- **Root ordering**: Stored in `meta` table as `{ key: 'rootIds', value: [...] }`
- **Export**: `dexie-export-import` → `exportDB(db)` returns a Blob → download as `.json` file
- **Import**: `importDB(blob)` restores full database from exported file

## Implementation Phases

### Phase 1: Scaffolding + Core Tree with contenteditable
- Vite + React + TS setup, CSS Modules, global styles, design tokens
- Types (`node.ts`), Zustand store with treeSlice (create, delete, update, indent, outdent)
- Layout shell, Sidebar (project list), NodeTree, NodeItem, NodeContent (contenteditable)
- Keyboard shortcuts: Enter, Tab, Shift+Tab, Backspace, Arrow Up/Down
- Focus management via `activeNodeId`
- Dexie.js persistence with debounced auto-save

### Phase 2: Status System
- StatusIndicator component (none / checkbox / project badge)
- `toggleChecked`, `cycleProjectStatus` store actions
- Cmd/Ctrl+Enter shortcut
- Strikethrough for checked, colored badges for project statuses

### Phase 3: Collapse/Expand + Workbench View
- Collapse toggle arrow, flatten respecting collapsed state
- Sidebar view switcher (project detail vs workbench)
- WorkbenchView: split top/bottom, HorizontalScroller with ProjectCard/DailyCard
- SettingsPanel with column count sliders (persisted in Dexie meta table)
- CSS scroll-snap for card navigation

### Phase 4: @ Mentions and Linking
- `@` keystroke detection in contenteditable
- MentionPopup (floating portal, fuse.js fuzzy search, keyboard navigation)
- Atomic mention `<span>` insertion into contenteditable
- `contentParser.ts` for serialize/render of mention markers
- Live status reflection on mention spans
- Click-to-navigate on mentions

### Phase 5: Drag and Drop
- @dnd-kit setup, flatten for DnD, `getProjection()`
- DragOverlayNode, visual depth feedback during drag
- Edge cases: collapsed subtrees, prevent dropping into own descendants

### Phase 6: Daily Nodes
- Auto-create today's daily node
- Sidebar "Today" button, date sorting (latest first)
- Daily nodes default to linking mode (prompt or UI hint to use @mentions)

### Phase 7: Export / Import
- `dexie-export-import` integration
- ExportDialog with download + Import file picker
- Confirmation dialog for import (overwrites existing data)

### Phase 8: Polish
- Empty states (no projects yet, no daily notes)
- Responsive layout for narrow screens
- Accessibility: ARIA labels, keyboard-only audit
- Performance profiling with 500+ nodes

## Verification

After each phase:
1. `npm run dev` → manual testing in browser
2. Verify IndexedDB: DevTools → Application → IndexedDB → "notebench"
3. Phase-specific checks:
   - Phase 1: Create nodes, indent/outdent, refresh → data persists. Enter/Tab feel instant.
   - Phase 2: Toggle checkboxes, cycle project status, verify visual indicators
   - Phase 3: Collapse nodes, switch to workbench view, adjust settings, scroll horizontally
   - Phase 4: Type `@`, search, select → mention span appears inline, click navigates, status reflects
   - Phase 5: Drag to reorder + reparent, verify tree structure after drop
   - Phase 7: Export → import on fresh browser → verify all nodes restored
