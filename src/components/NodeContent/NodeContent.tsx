import clsx from "clsx";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNodeKeyboard } from "../../hooks/useNodeKeyboard";
import { renderToDOM, serializeFromDOM } from "../../lib/contentParser";
import { findRoot } from "../../lib/tree";
import { makeAction, nodeActionAtom } from "../../store/actions";
import { activeNodeIdAtom, nodesAtom } from "../../store/atoms";
import styles from "./NodeContent.module.css";

interface NodeContentProps {
  nodeId: string;
  /** When set (linked node), content r/w goes to this ID instead of nodeId. */
  effectiveNodeId?: string;
  isRootTitle?: boolean;
  placeholder?: string;
  strikethrough?: boolean;
}

export function NodeContent({
  nodeId,
  effectiveNodeId,
  isRootTitle,
  placeholder = "Type something...",
  strikethrough,
}: NodeContentProps) {
  const divRef = useRef<HTMLDivElement>(null);
  // const linkPopupRef = useRef<MentionPopupHandle>(null);

  const nodes = useAtomValue(nodesAtom);
  const [activeNodeId, setActiveNodeId] = useAtom(activeNodeIdAtom);
  const dispatch = useSetAtom(nodeActionAtom);

  // Content ops target the effective node; focus/active uses the structural nodeId
  const contentNodeId = effectiveNodeId ?? nodeId;
  const [content, setContent] = useState(
    () => nodes[contentNodeId]?.content ?? "",
  );

  const { handleKeyDown: handleNodeKeyDown } = useNodeKeyboard({
    node: nodes[nodeId],
    index: 0,
    divRef,
    isRootTitle,
  });

  const isActive = activeNodeId === nodeId;
  // Null sentinel ensures the first render always syncs the DOM,
  // even if the node mounts with isActive=true (e.g. via mention navigation).
  const prevNodeIdRef = useRef<string | null>(null);

  // const [linkState, setLinkState] = useState<{
  //   query: string;
  //   anchorRect: DOMRect;
  // } | null>(null);

  // ── Navigate to the node's owning project and focus it ──────────────────────
  const handleMentionClick = useCallback(
    (mentionedNodeId: string) => {
      const root = findRoot(nodes[mentionedNodeId], nodes);
      if (!root) return;
      setActiveNodeId(root.id);
    },
    [nodes, setActiveNodeId],
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
    // if (focusCursorAtEnd) {
    //   range.selectNodeContents(div);
    //   range.collapse(false);
    // } else {
    range.selectNodeContents(div);
    range.collapse(true);
    // }
    sel.removeAllRanges();
    sel.addRange(range);
  }, [isActive]);

  // ── Input handler ────────────────────────────────────────────────────────────
  const handleInput = useCallback(() => {
    const div = divRef.current;
    if (!div) return;
    const { content: newContent, mentions } = serializeFromDOM(div);
    dispatch(makeAction.update(contentNodeId, { content: newContent, mentions }));
    setContent(newContent);

    // Prefer link trigger over mention trigger (both can't be open simultaneously)
    // const linkQuery = getLinkQueryAtCursor(div);
    // if (linkQuery !== null) {
    //   const sel = window.getSelection();
    //   const rect = sel?.rangeCount
    //     ? sel.getRangeAt(0).getBoundingClientRect()
    //     : new DOMRect();
    //   // setLinkState((prev) =>
    //   //   prev
    //   //     ? { ...prev, query: linkQuery }
    //   //     : { query: linkQuery, anchorRect: rect },
    //   // );
    //   return;
    // }
    // // setLinkState(null);

    // const mentionQuery = getMentionQueryAtCursor(div);
    // if (mentionQuery !== null) {
    //   const sel = window.getSelection();
    //   const rect = sel?.rangeCount
    //     ? sel.getRangeAt(0).getBoundingClientRect()
    //     : new DOMRect();
    //   setMentionState((prev) =>
    //     prev
    //       ? { ...prev, query: mentionQuery }
    //       : { query: mentionQuery, anchorRect: rect },
    //   );
    // } else {
    //   setMentionState(null);
    // }
  }, [contentNodeId, dispatch]);

  // ── Mention insertion ────────────────────────────────────────────────────────
  // const insertMention = useCallback(
  //   (selectedNode: INode) => {
  //     const div = divRef.current;
  //     if (!div || !mentionState) return;
  //     const sel = window.getSelection();
  //     if (!sel || !sel.isCollapsed) return;

  //     const deleteCount = mentionState.query.length + 1; // +1 for '@'
  //     const range = sel.getRangeAt(0).cloneRange();
  //     if (range.startOffset < deleteCount) return;

  //     range.setStart(range.startContainer, range.startOffset - deleteCount);
  //     range.deleteContents();

  //     const span = createMentionSpan(
  //       selectedNode.id,
  //       selectedNode.content,
  //       handleMentionClick,
  //     );
  //     range.insertNode(span);

  //     const space = document.createTextNode("\u00a0");
  //     if (span.nextSibling) {
  //       div.insertBefore(space, span.nextSibling);
  //     } else {
  //       div.appendChild(space);
  //     }

  //     const newRange = document.createRange();
  //     newRange.setStartAfter(space);
  //     newRange.collapse(true);
  //     sel.removeAllRanges();
  //     sel.addRange(newRange);

  //     const { content: newContent, mentions } = serializeFromDOM(div);
  //     dispatch(makeAction.update(contentNodeId, { content: newContent, mentions }));
  //     setMentionState(null);
  //   },
  //   [mentionState, contentNodeId, dispatch, handleMentionClick],
  // );

  // // ── Link node creation ───────────────────────────────────────────────────────
  // const insertLinkNode = useCallback(
  //   (selectedNode: INode) => {
  //     const div = divRef.current;
  //     if (!div || !linkState) return;
  //     const sel = window.getSelection();
  //     if (!sel || !sel.isCollapsed) return;

  //     const deleteCount = linkState.query.length + 2; // +2 for '[['
  //     const range = sel.getRangeAt(0).cloneRange();
  //     if (range.startOffset < deleteCount) return;

  //     // Delete '[[query' from the current node's text
  //     range.setStart(range.startContainer, range.startOffset - deleteCount);
  //     range.deleteContents();

  //     // Update the current node's content (without the [[query text)
  //     const { content: newContent, mentions } = serializeFromDOM(div);
  //     dispatch(makeAction.update(contentNodeId, { content: newContent, mentions }));

  //     // Create the linked node as the next sibling of the structural nodeId
  //     const newLinkId = createLinkNode(selectedNode.id, nodeId);
  //     setActiveNode(newLinkId, false);
  //     setLinkState(null);
  //   },
  //   [
  //     linkState,
  //     contentNodeId,
  //     nodeId,
  //     dispatch,
  //     createLinkNode,
  //     setActiveNode,
  //   ],
  // );

  // ── Keyboard: intercept popup nav before node shortcuts ─────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // const activePopup = mentionState
      //   ? mentionPopupRef
      //   : linkState
      //     ? linkPopupRef
      //     : null;
      // if (activePopup) {
      //   if (e.key === "ArrowDown") {
      //     e.preventDefault();
      //     activePopup.current?.moveDown();
      //     return;
      //   }
      //   if (e.key === "ArrowUp") {
      //     e.preventDefault();
      //     activePopup.current?.moveUp();
      //     return;
      //   }
      //   if (e.key === "Enter") {
      //     e.preventDefault();
      //     activePopup.current?.selectCurrent();
      //     return;
      //   }
      //   if (e.key === "Escape") {
      //     e.preventDefault();
      //     setMentionState(null);
      //     setLinkState(null);
      //     return;
      //   }
      // }
      handleNodeKeyDown(e);
    },
    [handleNodeKeyDown],
  );

  const handleFocus = () => setActiveNodeId(nodeId);

  return (
    <>
      <div
        ref={divRef}
        className={clsx(styles.editor, strikethrough && styles.strikethrough)}
        contentEditable
        // suppressContentEditableWarning
        data-node-id={nodeId}
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      />
      {/* {mentionState && (
        <MentionPopup
          ref={mentionPopupRef}
          query={mentionState.query}
          anchorRect={mentionState.anchorRect}
          excludeNodeId={contentNodeId}
          onSelect={insertMention}
          onClose={() => setMentionState(null)}
        />
      )} */}
      {/* {linkState && (
        <MentionPopup
          ref={linkPopupRef}
          query={linkState.query}
          anchorRect={linkState.anchorRect}
          excludeNodeId={nodeId}
          onSelect={insertLinkNode}
          onClose={() => setLinkState(null)}
        />
      )} */}
    </>
  );
}
