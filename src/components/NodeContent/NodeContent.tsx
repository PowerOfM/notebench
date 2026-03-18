import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '../../store';
import { useNodeKeyboard } from '../../hooks/useNodeKeyboard';
import {
  serializeFromDOM,
  renderToDOM,
  createMentionSpan,
  getMentionQueryAtCursor,
  getLinkQueryAtCursor,
} from '../../lib/contentParser';
import { MentionPopup, type MentionPopupHandle } from '../MentionPopup/MentionPopup';
import { LinkPopup, type LinkPopupHandle } from '../LinkPopup/LinkPopup';
import type { NodeData } from '../../types/node';
import styles from './NodeContent.module.css';

interface NodeContentProps {
  nodeId: string;
  /** When set (linked node), content r/w goes to this ID instead of nodeId. */
  effectiveNodeId?: string;
  isProjectTitle?: boolean;
  placeholder?: string;
  strikethrough?: boolean;
}

export function NodeContent({
  nodeId,
  effectiveNodeId,
  isProjectTitle,
  placeholder = 'Type something...',
  strikethrough,
}: NodeContentProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const mentionPopupRef = useRef<MentionPopupHandle>(null);
  const linkPopupRef = useRef<LinkPopupHandle>(null);

  // Content ops target the effective node; focus/active uses the structural nodeId
  const contentNodeId = effectiveNodeId ?? nodeId;

  const content = useStore((s) => s.nodes[contentNodeId]?.content ?? '');
  const nodes = useStore((s) => s.nodes);
  const activeNodeId = useStore((s) => s.activeNodeId);
  const focusCursorAtEnd = useStore((s) => s.focusCursorAtEnd);
  const updateContent = useStore((s) => s.updateContent);
  const setActiveNode = useStore((s) => s.setActiveNode);
  const setActiveProject = useStore((s) => s.setActiveProject);
  const createLinkNode = useStore((s) => s.createLinkNode);

  const { handleKeyDown: handleNodeKeyDown } = useNodeKeyboard({ nodeId, divRef, isProjectTitle });

  const isActive = activeNodeId === nodeId;
  // Null sentinel ensures the first render always syncs the DOM,
  // even if the node mounts with isActive=true (e.g. via mention navigation).
  const prevNodeIdRef = useRef<string | null>(null);

  // Popup states
  const [mentionState, setMentionState] = useState<{ query: string; anchorRect: DOMRect } | null>(null);
  const [linkState, setLinkState] = useState<{ query: string; anchorRect: DOMRect } | null>(null);

  // ── Navigate to the node's owning project and focus it ──────────────────────
  const handleMentionClick = useCallback(
    (mentionedNodeId: string) => {
      const allNodes = useStore.getState().nodes;
      const target = allNodes[mentionedNodeId];
      if (!target) return;
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
    updateContent(contentNodeId, newContent, mentions);

    // Prefer link trigger over mention trigger (both can't be open simultaneously)
    const linkQuery = getLinkQueryAtCursor(div);
    if (linkQuery !== null) {
      const sel = window.getSelection();
      const rect = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : new DOMRect();
      setLinkState((prev) => (prev ? { ...prev, query: linkQuery } : { query: linkQuery, anchorRect: rect }));
      setMentionState(null);
      return;
    }
    setLinkState(null);

    const mentionQuery = getMentionQueryAtCursor(div);
    if (mentionQuery !== null) {
      const sel = window.getSelection();
      const rect = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : new DOMRect();
      setMentionState((prev) =>
        prev ? { ...prev, query: mentionQuery } : { query: mentionQuery, anchorRect: rect }
      );
    } else {
      setMentionState(null);
    }
  }, [contentNodeId, updateContent]);

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

      range.setStart(range.startContainer, range.startOffset - deleteCount);
      range.deleteContents();

      const span = createMentionSpan(selectedNode.id, selectedNode.content, handleMentionClick);
      range.insertNode(span);

      const space = document.createTextNode('\u00a0');
      if (span.nextSibling) {
        div.insertBefore(space, span.nextSibling);
      } else {
        div.appendChild(space);
      }

      const newRange = document.createRange();
      newRange.setStartAfter(space);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);

      const { content: newContent, mentions } = serializeFromDOM(div);
      updateContent(contentNodeId, newContent, mentions);
      setMentionState(null);
    },
    [mentionState, contentNodeId, updateContent, handleMentionClick]
  );

  // ── Link node creation ───────────────────────────────────────────────────────
  const insertLinkNode = useCallback(
    (selectedNode: NodeData) => {
      const div = divRef.current;
      if (!div || !linkState) return;
      const sel = window.getSelection();
      if (!sel || !sel.isCollapsed) return;

      const deleteCount = linkState.query.length + 2; // +2 for '[['
      const range = sel.getRangeAt(0).cloneRange();
      if (range.startOffset < deleteCount) return;

      // Delete '[[query' from the current node's text
      range.setStart(range.startContainer, range.startOffset - deleteCount);
      range.deleteContents();

      // Update the current node's content (without the [[query text)
      const { content: newContent, mentions } = serializeFromDOM(div);
      updateContent(contentNodeId, newContent, mentions);

      // Create the linked node as the next sibling of the structural nodeId
      const newLinkId = createLinkNode(selectedNode.id, nodeId);
      setActiveNode(newLinkId, false);
      setLinkState(null);
    },
    [linkState, contentNodeId, nodeId, updateContent, createLinkNode, setActiveNode]
  );

  // ── Keyboard: intercept popup nav before node shortcuts ─────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const activePopup = mentionState ? mentionPopupRef : linkState ? linkPopupRef : null;
      if (activePopup) {
        if (e.key === 'ArrowDown') { e.preventDefault(); activePopup.current?.moveDown(); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); activePopup.current?.moveUp(); return; }
        if (e.key === 'Enter') {
          e.preventDefault();
          activePopup.current?.selectCurrent();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setMentionState(null);
          setLinkState(null);
          return;
        }
      }
      handleNodeKeyDown(e);
    },
    [mentionState, linkState, handleNodeKeyDown]
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
          ref={mentionPopupRef}
          query={mentionState.query}
          anchorRect={mentionState.anchorRect}
          excludeNodeId={contentNodeId}
          onSelect={insertMention}
          onClose={() => setMentionState(null)}
        />
      )}
      {linkState && (
        <LinkPopup
          ref={linkPopupRef}
          query={linkState.query}
          anchorRect={linkState.anchorRect}
          excludeNodeId={nodeId}
          onSelect={insertLinkNode}
          onClose={() => setLinkState(null)}
        />
      )}
    </>
  );
}
