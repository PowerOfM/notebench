import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store';
import { useNodeKeyboard } from '../../hooks/useNodeKeyboard';
import styles from './NodeContent.module.css';

interface NodeContentProps {
  nodeId: string;
  isProjectTitle?: boolean;
  placeholder?: string;
}

export function NodeContent({ nodeId, isProjectTitle, placeholder = 'Type something...' }: NodeContentProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const content = useStore((s) => s.nodes[nodeId]?.content ?? '');
  const activeNodeId = useStore((s) => s.activeNodeId);
  const focusCursorAtEnd = useStore((s) => s.focusCursorAtEnd);
  const updateContent = useStore((s) => s.updateContent);
  const setActiveNode = useStore((s) => s.setActiveNode);
  const { handleKeyDown } = useNodeKeyboard({ nodeId, divRef, isProjectTitle });

  // Sync content to DOM only when not focused (avoid fighting with user input)
  const isActive = activeNodeId === nodeId;

  useEffect(() => {
    const div = divRef.current;
    if (!div || isActive) return;
    if (div.textContent !== content) {
      div.textContent = content;
    }
  }, [content, isActive]);

  // Focus management: when this node becomes active, focus the div
  useEffect(() => {
    if (!isActive) return;
    const div = divRef.current;
    if (!div) return;
    if (document.activeElement !== div) {
      div.focus();
    }
    // Set cursor position
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

  const handleInput = useCallback(() => {
    const div = divRef.current;
    if (!div) return;
    updateContent(nodeId, div.textContent ?? '');
  }, [nodeId, updateContent]);

  const handleFocus = useCallback(() => {
    if (!isActive) {
      setActiveNode(nodeId, false);
    }
  }, [nodeId, isActive, setActiveNode]);

  return (
    <div
      ref={divRef}
      className={styles.editor}
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
