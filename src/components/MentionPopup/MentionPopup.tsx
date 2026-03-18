import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store';
import { fuzzySearchNodes } from '../../lib/fuzzySearch';
import type { NodeData } from '../../types/node';
import styles from './MentionPopup.module.css';

export interface MentionPopupHandle {
  moveUp: () => void;
  moveDown: () => void;
  selectCurrent: () => void;
}

interface MentionPopupProps {
  query: string;
  anchorRect: DOMRect;
  excludeNodeId: string;
  onSelect: (node: NodeData) => void;
  onClose: () => void;
}

export const MentionPopup = forwardRef<MentionPopupHandle, MentionPopupProps>(
  ({ query, anchorRect, excludeNodeId, onSelect, onClose }, ref) => {
    const nodes = useStore((s) => s.nodes);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const candidates = Object.values(nodes).filter(
      (n) => n.id !== excludeNodeId && n.content.trim()
    );
    const results = fuzzySearchNodes(query, candidates);

    useEffect(() => {
      setSelectedIndex(0);
    }, [query]);

    useImperativeHandle(
      ref,
      () => ({
        moveUp: () => setSelectedIndex((i) => Math.max(0, i - 1)),
        moveDown: () =>
          setSelectedIndex((i) => Math.min(Math.max(results.length - 1, 0), i + 1)),
        selectCurrent: () => {
          if (results[selectedIndex]) onSelect(results[selectedIndex]);
        },
      }),
      [results, selectedIndex, onSelect]
    );

    // Close on click outside
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (!(e.target as Element).closest('[data-mention-popup]')) {
          onClose();
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Position: just below the cursor, clamp to viewport
    const viewportH = window.innerHeight;
    const popupH = 260;
    const top =
      anchorRect.bottom + 4 + popupH > viewportH
        ? anchorRect.top - popupH - 4
        : anchorRect.bottom + 4;

    return createPortal(
      <div
        className={styles.popup}
        style={{ position: 'fixed', left: anchorRect.left, top, zIndex: 200 }}
        data-mention-popup
      >
        {results.length === 0 ? (
          <div className={styles.empty}>No matches</div>
        ) : (
          results.map((node, i) => (
            <div
              key={node.id}
              className={`${styles.item} ${i === selectedIndex ? styles.selected : ''}`}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus in contenteditable
                onSelect(node);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className={styles.itemAt}>@</span>
              <span className={styles.itemLabel}>{node.content || 'Untitled'}</span>
            </div>
          ))
        )}
      </div>,
      document.body
    );
  }
);

MentionPopup.displayName = 'MentionPopup';
