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
import {
  flattenVisible,
  getDescendantIds,
  getProjection,
} from "../../lib/tree";

import { useAtom, useAtomValue } from "jotai";
import { useState } from "react";
import { actions } from "../../store/actions";
import { focusedIdAtom, nodesAtom } from "../../store/atoms";
import { useDispatch } from "../../store/dispatch";
import { DragOverlayNode } from "./DragOverlayNode";
import { NodeItem } from "./NodeItem";
import styles from "./NodeTree.module.css";

const INDENT_SIZE = 24;

interface NodeTreeProps {
  rootId: string;
}

export function NodeTree({ rootId }: NodeTreeProps) {
  const nodes = useAtomValue(nodesAtom);
  const dispatch = useDispatch();

  const [activeId, setActiveId] = useAtom(focusedIdAtom);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);

  const flat = flattenVisible([rootId], nodes);
  // const sortedIds = flat.map((i) => i.id);

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
        dispatch(
          actions.move(
            active.id as string,
            projected.parentId,
            projected.index,
          ),
        );
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
      <SortableContext items={flat} strategy={verticalListSortingStrategy}>
        <div className={styles.tree} role="tree" aria-label="Notes tree">
          {flat.map(({ node, depth }) => {
            const isOver =
              activeId &&
              overId === node.id &&
              activeId !== node.id &&
              projected;
            return (
              <div key={node.id}>
                <NodeItem node={node} depth={depth} />
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
        {activeId && nodes[activeId] ? (
          <DragOverlayNode
            node={nodes[activeId]}
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
