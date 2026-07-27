/**
 * AuditTest Vision — Content Script
 *
 * Injected into every page to:
 * 1. Extract DOM element metadata (bounding boxes, styles, attributes)
 * 2. Render the floating "Start Audit" button overlay
 * 3. Display visual diff badges on elements with detected issues
 *
 * Communicates with the background service worker via chrome.runtime messages.
 */

// --- Types ---

interface ElementMeta {
  selector: string;
  tagName: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  computedStyles?: Record<string, string>;
  attributes?: Record<string, string>;
  textContent?: string;
}

interface AuditResultMessage {
  type: string;
  issues?: Array<{
    selector?: string;
    severity: string;
    title: string;
  }>;
}

// --- DOM Metadata Extraction ---

/**
 * Walks the DOM tree and extracts metadata for audit-relevant elements.
 * Limits collection to visible elements with meaningful content.
 */
function extractDOMMetadata(): ElementMeta[] {
  const elements: ElementMeta[] = [];
  const relevantTags = new Set([
    'img', 'button', 'a', 'input', 'select', 'textarea', 'label',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div',
    'nav', 'main', 'header', 'footer', 'aside', 'section', 'form',
    'table', 'ul', 'ol', 'li', 'video', 'audio', 'iframe',
  ]);

  const allElements = document.querySelectorAll('*');

  for (const el of allElements) {
    const tagName = el.tagName.toLowerCase();
    if (!relevantTags.has(tagName)) continue;

    const rect = el.getBoundingClientRect();
    // Skip invisible or off-screen elements
    if (rect.width === 0 && rect.height === 0) continue;

    const computed = window.getComputedStyle(el);
    if (computed.display === 'none' || computed.visibility === 'hidden') continue;

    const meta: ElementMeta = {
      selector: generateSelector(el),
      tagName: el.tagName,
      boundingBox: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      computedStyles: {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        display: computed.display,
        position: computed.position,
        overflow: computed.overflow,
      },
      attributes: extractAttributes(el),
      textContent: el.textContent?.trim().slice(0, 100) || undefined,
    };

    elements.push(meta);
  }

  // Cap at 500 elements to stay within LLM token limits
  return elements.slice(0, 500);
}

/** Generate a unique CSS selector for an element */
function generateSelector(el: Element): string {
  if (el.id) return `#${el.id}`;

  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).slice(0, 2);
      if (classes.length > 0 && classes[0]) {
        selector += '.' + classes.join('.');
      }
    }

    // Add nth-child if needed for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(s => s.tagName === current!.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    parts.unshift(selector);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

/** Extract relevant HTML attributes from an element */
function extractAttributes(el: Element): Record<string, string> {
  const attrs: Record<string, string> = {};
  const relevant = ['alt', 'aria-label', 'aria-labelledby', 'role', 'id', 'href', 'src', 'type', 'name', 'placeholder'];

  for (const name of relevant) {
    const value = el.getAttribute(name);
    if (value !== null) {
      attrs[name] = value;
    }
  }

  return attrs;
}

// --- Floating Audit Button ---

function injectFloatingButton(): void {
  const btn = document.createElement('button');
  btn.id = 'audittest-vision-fab';
  btn.textContent = 'Audit';
  btn.setAttribute('aria-label', 'Start AuditTest Vision audit');

  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '2147483647',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    border: 'none',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.1)';
    btn.style.boxShadow = '0 6px 16px rgba(99,102,241,0.6)';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 4px 12px rgba(99,102,241,0.4)';
  });

  btn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'START_AUDIT_FROM_PAGE' });
    btn.textContent = '...';
    btn.style.opacity = '0.7';
  });

  document.body.appendChild(btn);
}

// --- Visual Diff Badges ---

function renderIssueBadges(issues: Array<{ selector?: string; severity: string; title: string }>): void {
  // Remove existing badges
  document.querySelectorAll('.audittest-badge').forEach(b => b.remove());

  for (const issue of issues) {
    if (!issue.selector) continue;

    const el = document.querySelector(issue.selector);
    if (!el) continue;

    const badge = document.createElement('div');
    badge.className = 'audittest-badge';
    badge.setAttribute('title', issue.title);

    const colors: Record<string, string> = {
      critical: '#ef4444',
      major: '#f59e0b',
      minor: '#3b82f6',
      info: '#71717a',
    };

    Object.assign(badge.style, {
      position: 'absolute',
      top: '-6px',
      right: '-6px',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      background: colors[issue.severity] || colors.info,
      border: '2px solid #fff',
      zIndex: '2147483646',
      pointerEvents: 'none',
    });

    // Ensure parent is positioned for badge placement
    const computed = window.getComputedStyle(el);
    if (computed.position === 'static') {
      (el as HTMLElement).style.position = 'relative';
    }

    el.appendChild(badge);
  }
}

// --- Message Listener ---

chrome.runtime.onMessage.addListener((message: AuditResultMessage, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_DOM') {
    // Background worker requests DOM metadata
    const metadata = extractDOMMetadata();
    sendResponse({ elements: metadata });
    return true;
  }

  if (message.type === 'SHOW_RESULTS') {
    // Render visual badges on the page
    if (message.issues) {
      renderIssueBadges(message.issues);
    }
    // Restore FAB state
    const fab = document.getElementById('audittest-vision-fab');
    if (fab) {
      fab.textContent = 'Audit';
      fab.style.opacity = '1';
    }
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

// --- Initialize ---
injectFloatingButton();
