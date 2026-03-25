import clsx from "clsx";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNodeKeyboard } from "../../hooks/useNodeKeyboard";
import { renderToDOM, serializeFromDOM } from "../../lib/contentParser";
import { findRoot } from "../../lib/tree";
import { focusedIdAtom, nodesAtom } from "../../store/atoms";
import { makeAction } from "../../store/actions";
import { nodeActionAtom } from "../../store/dispatch";
import styles from "./NodeContent.module.css";
import { useSetAtom } from "jotai";

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
  const dispatch = useSetAtom(nodeActionAtom);
  const divRef = useRef<HTMLDivElement>(null);

  const nodes = useAtomValue(nodesAtom);
  const [activeNodeId, setActiveNodeId] = useAtom(focusedIdAtom);

  // Content ops target the effective node; focus/active uses the structural nodeId
  const contentNodeId = effectiveNodeId ?? nodeId;
  const node = nodes[contentNodeId];
  const [content, setContent] = useState(() => node?.content ?? "");

  const { handleKeyDown: handleNodeKeyDown } = useNodeKeyboard({
    nodeId,
    isRootTitle,
    divRef,
  });

  const isActive = activeNodeId === nodeId;
  const prevNodeIdRef = useRef<string | null>(null);

  // ── DOM ↔ store sync ─────────────────────────────────────────────────────────
  // Sync content from store to DOM whenever node changes externally
  useEffect(() => {
    const externalContent = nodes[contentNodeId]?.content ?? "";
    if (externalContent !== content) {
      setContent(externalContent);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes[contentNodeId]?.content]);

  // Re-render DOM when content or active state changes
  useEffect(() => {
    const div = divRef.current;
    if (!div) return;
    const nodeChanged = prevNodeIdRef.current !== nodeId;
    prevNodeIdRef.current = nodeId;
    if (!nodeChanged && isActive) return;
    renderToDOM(div, content, nodes, handleMentionClick);
  }, [nodeId, content, isActive, nodes]);

  // ── Focus management ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const div = divRef.current;
    if (!div) return;
    if (document.activeElement !== div) div.focus();
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(div);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }, [isActive]);

  // ── Navigate to the node's owning project and focus it ──────────────────────
  const handleMentionClick = useCallback(
    (mentionedNodeId: string) => {
      const root = findRoot(nodes[mentionedNodeId], nodes);
      if (!root) return;
      setActiveNodeId(root.id);
    },
    [nodes, setActiveNodeId],
  );

  // ── Input handler ────────────────────────────────────────────────────────────
  const handleInput = useCallback(() => {
    const div = divRef.current;
    if (!div) return;
    const { content: newContent, mentions: newMentions } = serializeFromDOM(div);
    setContent(newContent);
    dispatch(makeAction.update(contentNodeId, { content: newContent, mentions: newMentions }));
  }, [contentNodeId, dispatch]);

  // ── Keyboard: node shortcuts ─────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      handleNodeKeyDown(e);
    },
    [handleNodeKeyDown],
  );

  const handleFocus = () => setActiveNodeId(nodeId);

  return (
    <div
      ref={divRef}
      className={clsx(styles.editor, strikethrough && styles.strikethrough)}
      contentEditable
      suppressContentEditableWarning
      data-node-id={nodeId}
      data-placeholder={placeholder}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
    />
  );
}
