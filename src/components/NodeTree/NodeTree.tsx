import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import {
  flattenVisible,
  getDescendantIds,
  getProjection,
} from "../../lib/tree";
import { useStore } from "../../store";
import { DragOverlayNode } from "./DragOverlayNode";
import { NodeItem } from "./NodeItem";
import styles from "./NodeTree.module.css";

const INDENT_SIZE = 24;

interface NodeTreeProps {
  rootIds: string[];
}

export function NodeTree({ rootIds }: NodeTreeProps) {
  const nodes = useStore((s) => s.nodes);
  const moveNode = useStore((s) => s.moveNode);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);

  const flat = flattenVisible(rootIds, nodes);
  const sortedIds = flat.map((i) => i.id);

  const raw =
    activeId && overId
      ? getProjection(flat, activeId, overId, offsetX, INDENT_SIZE)
      : null;

  // Prevent non-root nodes from being dropped at root level (would create a new project)
  const isNonRootDrag = activeId ? nodes[activeId]?.parentId !== null : false;
  const projected =
    raw && (raw.parentId !== null || !isNonRootDrag) ? raw : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function resetState() {
    setActiveId(null);
    setOverId(null);
    setOffsetX(0);
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
    setOverId(active.id as string);
  }

  function handleDragMove({ delta }: DragMoveEvent) {
    setOffsetX(delta.x);
  }

  function handleDragOver({ over }: DragOverEvent) {
    setOverId((over?.id as string) ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over && projected) {
      const descendants = getDescendantIds(active.id as string, nodes);
      const isValid =
        over.id !== active.id && !descendants.includes(over.id as string);
      if (isValid) {
        moveNode(active.id as string, projected.parentId, projected.index);
      }
    }
    resetState();
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={resetState}
    >
      <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
        <div className={styles.tree} role="tree" aria-label="Notes tree">
          {flat.map(({ id, depth }) => {
            const isOver =
              activeId && overId === id && activeId !== id && projected;
            return (
              <div key={id}>
                <NodeItem nodeId={id} depth={depth} />
                {isOver && (
                  <div
                    className={styles.dropLine}
                    style={
                      { "--depth": projected!.depth } as React.CSSProperties
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeId ? (
          <DragOverlayNode
            nodeId={activeId}
            depth={
              projected?.depth ??
              flat.find((i) => i.id === activeId)?.depth ??
              0
            }
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
