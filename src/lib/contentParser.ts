import type { MentionRef, NodeMap } from '../types/node';

const MENTION_RE = /@\{([^}]+)\}/g;

/**
 * Walk the contenteditable div's DOM and extract:
 * - `content`: plain text with `@{nodeId}` markers for mention spans
 * - `mentions`: parsed MentionRef positions
 */
export function serializeFromDOM(div: HTMLDivElement): { content: string; mentions: MentionRef[] } {
  let content = '';
  const mentions: MentionRef[] = [];

  function walk(node: ChildNode) {
    if (node.nodeType === Node.TEXT_NODE) {
      content += node.textContent ?? '';
    } else if (node instanceof HTMLElement) {
      const mentionId = node.dataset.mentionId;
      if (mentionId) {
        const marker = `@{${mentionId}}`;
        mentions.push({ nodeId: mentionId, offset: content.length, length: marker.length });
        content += marker;
      } else {
        for (const child of Array.from(node.childNodes)) {
          walk(child);
        }
      }
    }
  }

  for (const child of Array.from(div.childNodes)) {
    walk(child);
  }

  return { content, mentions };
}

/**
 * Rebuild the contenteditable div's DOM from a stored content string,
 * replacing `@{nodeId}` markers with styled non-editable spans.
 */
export function renderToDOM(
  div: HTMLDivElement,
  content: string,
  nodes: NodeMap,
  onMentionClick: (id: string) => void
): void {
  div.innerHTML = '';

  const regex = new RegExp(MENTION_RE.source, 'g');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index);
    if (before) div.appendChild(document.createTextNode(before));

    const id = match[1];
    div.appendChild(createMentionSpan(id, nodes[id]?.content ?? null, onMentionClick));

    lastIndex = match.index + match[0].length;
  }

  const remaining = content.slice(lastIndex);
  if (remaining) div.appendChild(document.createTextNode(remaining));
}

export function createMentionSpan(
  id: string,
  nodeContent: string | null,
  onClick: (id: string) => void
): HTMLSpanElement {
  const span = document.createElement('span');
  span.contentEditable = 'false';
  span.dataset.mentionId = id;
  span.className = 'mention-chip';
  span.textContent = `@${nodeContent || 'Untitled'}`;
  span.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(id);
  });
  return span;
}

/**
 * Returns the query string after the last `[[` in the current text node
 * before the cursor, or null if no active link trigger is found.
 */
export function getLinkQueryAtCursor(div: HTMLDivElement): string | null {
  const sel = window.getSelection();
  if (!sel || !sel.isCollapsed) return null;
  const { anchorNode, anchorOffset } = sel;
  if (!anchorNode || anchorNode.nodeType !== Node.TEXT_NODE) return null;
  if (!div.contains(anchorNode)) return null;

  const textBefore = (anchorNode.textContent ?? '').slice(0, anchorOffset);
  const bracketIdx = textBefore.lastIndexOf('[[');
  if (bracketIdx === -1) return null;

  const afterBrackets = textBefore.slice(bracketIdx + 2);
  // Spaces or newlines close the link query
  if (/[\s]/.test(afterBrackets)) return null;

  return afterBrackets;
}

/**
 * Returns the query string after the last `@` in the current text node
 * before the cursor, or null if no active mention trigger is found.
 */
export function getMentionQueryAtCursor(div: HTMLDivElement): string | null {
  const sel = window.getSelection();
  if (!sel || !sel.isCollapsed) return null;
  const { anchorNode, anchorOffset } = sel;
  if (!anchorNode || anchorNode.nodeType !== Node.TEXT_NODE) return null;
  if (!div.contains(anchorNode)) return null;

  const textBefore = (anchorNode.textContent ?? '').slice(0, anchorOffset);
  const atIdx = textBefore.lastIndexOf('@');
  if (atIdx === -1) return null;

  const afterAt = textBefore.slice(atIdx + 1);
  // Spaces or `{` mean we're no longer in a fresh @mention trigger
  if (/[\s{]/.test(afterAt)) return null;

  return afterAt;
}
