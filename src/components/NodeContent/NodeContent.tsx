import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '../../store';
import { useNodeKeyboard } from '../../hooks/useNodeKeyboard';
import {
  serializeFromDOM,
  renderToDOM,
  createMentionSpan,
  getMentionQueryAtCursor,
} from '../../lib/contentParser';
import { MentionPopup, type MentionPopupHandle } from '../MentionPopup/MentionPopup';
import type { NodeData } from '../../types/node';
import styles from './NodeContent.module.css';

interface NodeContentProps {
  nodeId: string;
  isProjectTitle?: boolean;
  placeholder?: string;
  strikethrough?: boolean;
}

export function NodeContent({
  nodeId,
  isProjectTitle,
  placeholder = 'Type something...',
  strikethrough,
}: NodeContentProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<MentionPopupHandle>(null);

  const content = useStore((s) => s.nodes[nodeId]?.content ?? '');
  const nodes = useStore((s) => s.nodes);
  const activeNodeId = useStore((s) => s.activeNodeId);
  const focusCursorAtEnd = useStore((s) => s.focusCursorAtEnd);
  const updateContent = useStore((s) => s.updateContent);
  const setActiveNode = useStore((s) => s.setActiveNode);
  const setActiveProject = useStore((s) => s.setActiveProject);

  const { handleKeyDown: handleNodeKeyDown } = useNodeKeyboard({ nodeId, divRef, isProjectTitle });

  const isActive = activeNodeId === nodeId;
  // Null sentinel ensures the first render always syncs the DOM,
  // even if the node mounts with isActive=true (e.g. via mention navigation).
  const prevNodeIdRef = useRef<string | null>(null);

  // Mention popup state
  const [mentionState, setMentionState] = useState<{
    query: string;
    anchorRect: DOMRect;
  } | null>(null);

  // ── Navigate to the node's owning project and focus it ──────────────────────
  const handleMentionClick = useCallback(
    (mentionedNodeId: string) => {
      const allNodes = useStore.getState().nodes;
      const target = allNodes[mentionedNodeId];
      if (!target) return;
      // Walk to root project
      let root = target;
      while (root.parentId && allNodes[root.parentId]) {
        root = allNodes[root.parentId];
      }
      setActiveProject(root.id);
      setActiveNode(mentionedNodeId, false);
    },
    [setActiveProject, setActiveNode]
  );

  // ── DOM ↔ store sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    const div = divRef.current;
    if (!div) return;
    const nodeChanged = prevNodeIdRef.current !== nodeId;
    prevNodeIdRef.current = nodeId;
    // Skip while the user is actively editing the same node
    if (!nodeChanged && isActive) return;
    renderToDOM(div, content, nodes, handleMentionClick);
  }, [nodeId, content, isActive, nodes, handleMentionClick]);

  // ── Focus management ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const div = divRef.current;
    if (!div) return;
    if (document.activeElement !== div) div.focus();
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    if (focusCursorAtEnd) {
      range.selectNodeContents(div);
      range.collapse(false);
    } else {
      range.selectNodeContents(div);
      range.collapse(true);
    }
    sel.removeAllRanges();
    sel.addRange(range);
  }, [isActive, focusCursorAtEnd]);

  // ── Input handler ────────────────────────────────────────────────────────────
  const handleInput = useCallback(() => {
    const div = divRef.current;
    if (!div) return;
    const { content: newContent, mentions } = serializeFromDOM(div);
    updateContent(nodeId, newContent, mentions);

    // Check for @mention trigger
    const query = getMentionQueryAtCursor(div);
    if (query !== null) {
      const sel = window.getSelection();
      const rect = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : new DOMRect();
      setMentionState((prev) =>
        prev ? { ...prev, query } : { query, anchorRect: rect }
      );
    } else {
      setMentionState(null);
    }
  }, [nodeId, updateContent]);

  // ── Mention insertion ────────────────────────────────────────────────────────
  const insertMention = useCallback(
    (selectedNode: NodeData) => {
      const div = divRef.current;
      if (!div || !mentionState) return;

      const sel = window.getSelection();
      if (!sel || !sel.isCollapsed) return;

      const deleteCount = mentionState.query.length + 1; // +1 for '@'
      const range = sel.getRangeAt(0).cloneRange();
      if (range.startOffset < deleteCount) return;

      // Delete the '@query' text
      range.setStart(range.startContainer, range.startOffset - deleteCount);
      range.deleteContents();

      // Insert mention span
      const span = createMentionSpan(
        selectedNode.id,
        selectedNode.content,
        handleMentionClick
      );
      range.insertNode(span);

      // Insert a non-breaking space after span so cursor can land there
      const space = document.createTextNode('\u00a0');
      if (span.nextSibling) {
        div.insertBefore(space, span.nextSibling);
      } else {
        div.appendChild(space);
      }

      // Move cursor after the space
      const newRange = document.createRange();
      newRange.setStartAfter(space);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);

      // Serialize and save
      const { content: newContent, mentions } = serializeFromDOM(div);
      updateContent(nodeId, newContent, mentions);

      setMentionState(null);
    },
    [mentionState, nodeId, updateContent, handleMentionClick]
  );

  // ── Keyboard: intercept popup nav before node shortcuts ─────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (mentionState) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          popupRef.current?.moveDown();
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          popupRef.current?.moveUp();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          popupRef.current?.selectCurrent();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setMentionState(null);
          return;
        }
      }
      handleNodeKeyDown(e);
    },
    [mentionState, handleNodeKeyDown]
  );

  const handleFocus = useCallback(() => {
    if (!isActive) setActiveNode(nodeId, false);
  }, [nodeId, isActive, setActiveNode]);

  return (
    <>
      <div
        ref={divRef}
        className={`${styles.editor}${strikethrough ? ` ${styles.strikethrough}` : ''}`}
        contentEditable
        suppressContentEditableWarning
        data-node-id={nodeId}
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      />
      {mentionState && (
        <MentionPopup
          ref={popupRef}
          query={mentionState.query}
          anchorRect={mentionState.anchorRect}
          excludeNodeId={nodeId}
          onSelect={insertMention}
          onClose={() => setMentionState(null)}
        />
      )}
    </>
  );
}
