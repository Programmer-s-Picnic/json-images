/* page-search.js
   Drop-in "Find on page" search UI.
   - Highlights matches
   - Next/Prev navigation
   - Match count
   - ESC to close
   - Ctrl+F / Cmd+F to open
*/

(function () {
  "use strict";

  // ====== Config ======
  const CONFIG = {
    ignoreTags: new Set(["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "TEXTAREA", "INPUT", "SELECT", "OPTION", "BUTTON"]),
    highlightClass: "pps__find_hit",
    activeClass: "pps__find_active",
    uiId: "pps__find_ui",
    root: document.body, // change if you want a narrower scope
  };

  // ====== State ======
  let hits = [];
  let activeIndex = -1;
  let lastQuery = "";
  let ui;

  // ====== Styles ======
  function injectStyles() {
    if (document.getElementById("pps__find_styles")) return;

    const style = document.createElement("style");
    style.id = "pps__find_styles";
    style.textContent = `
      #${CONFIG.uiId}{
        position: fixed; z-index: 2147483647;
        top: 14px; right: 14px;
        width: min(420px, calc(100vw - 28px));
        background: rgba(255,255,255,.92);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(0,0,0,.12);
        border-radius: 14px;
        box-shadow: 0 10px 30px rgba(0,0,0,.16);
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        padding: 10px;
        display: none;
      }
      #${CONFIG.uiId}.open{ display:block; }
      #${CONFIG.uiId} .row{ display:flex; gap:8px; align-items:center; }
      #${CONFIG.uiId} input{
        flex: 1;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(0,0,0,.18);
        outline: none;
        font-size: 14px;
      }
      #${CONFIG.uiId} button{
        padding: 9px 10px;
        border-radius: 12px;
        border: 1px solid rgba(0,0,0,.18);
        background: white;
        cursor: pointer;
        font-size: 13px;
        user-select:none;
      }
      #${CONFIG.uiId} button:active{ transform: translateY(1px); }
      #${CONFIG.uiId} .meta{
        margin-top: 6px;
        display:flex;
        justify-content: space-between;
        align-items:center;
        font-size: 12px;
        color: rgba(0,0,0,.65);
      }
      #${CONFIG.uiId} .kbd{
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        border: 1px solid rgba(0,0,0,.2);
        border-bottom-width: 2px;
        padding: 1px 6px;
        border-radius: 8px;
        background: rgba(255,255,255,.8);
        margin-left: 6px;
      }
      .${CONFIG.highlightClass}{
        background: #ffe38a;
        border-radius: 3px;
        padding: 0 2px;
      }
      .${CONFIG.activeClass}{
        background: #ffb84a;
        outline: 2px solid rgba(0,0,0,.25);
      }
    `;
    document.head.appendChild(style);
  }

  // ====== UI ======
  function createUI() {
    if (document.getElementById(CONFIG.uiId)) return;

    ui = document.createElement("div");
    ui.id = CONFIG.uiId;
    ui.innerHTML = `
      <div class="row">
        <input type="text" placeholder="Search on this page..." aria-label="Search on this page" />
        <button type="button" data-act="prev" title="Previous match">◀</button>
        <button type="button" data-act="next" title="Next match">▶</button>
        <button type="button" data-act="close" title="Close">✕</button>
      </div>
      <div class="meta">
        <div><span data-role="count">0/0</span></div>
        <div>
          <span class="kbd">Ctrl</span>+<span class="kbd">F</span>
          <span class="kbd">Esc</span>
        </div>
      </div>
    `;
    document.body.appendChild(ui);

    const input = ui.querySelector("input");
    const countEl = ui.querySelector('[data-role="count"]');

    // Debounce typing
    let t = null;
    input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const q = input.value.trim();
        search(q);
      }, 120);
    });

    ui.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const act = btn.getAttribute("data-act");
      if (act === "close") closeUI();
      if (act === "next") gotoHit(activeIndex + 1);
      if (act === "prev") gotoHit(activeIndex - 1);
    });

    // Enter = next, Shift+Enter = prev
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) gotoHit(activeIndex - 1);
        else gotoHit(activeIndex + 1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeUI();
      }
    });

    // expose updater
    ui._updateCount = (a, b) => (countEl.textContent = `${a}/${b}`);
  }

  function openUI() {
    injectStyles();
    createUI();
    ui.classList.add("open");
    const input = ui.querySelector("input");
    input.focus();
    input.select();
    ui._updateCount(Math.max(activeIndex + 1, 0), hits.length);
  }

  function closeUI() {
    if (!ui) return;
    ui.classList.remove("open");
    clearHighlights();
  }

  // ====== Search logic ======
  function clearHighlights() {
    // unwrap all highlights
    const nodes = CONFIG.root.querySelectorAll(`span.${CONFIG.highlightClass}`);
    nodes.forEach((span) => {
      const parent = span.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(span.textContent), span);
      parent.normalize(); // merge text nodes
    });

    hits = [];
    activeIndex = -1;
    if (ui) ui._updateCount(0, 0);
  }

  function search(query) {
    if (query === lastQuery) return;
    lastQuery = query;

    clearHighlights();
    if (!query) return;

    const regex = makeRegex(query);
    if (!regex) return;

    // Walk text nodes and wrap matches
    const walker = document.createTreeWalker(CONFIG.root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (CONFIG.ignoreTags.has(p.tagName)) return NodeFilter.FILTER_REJECT;
        // Ignore already-highlighted
        if (p.classList && p.classList.contains(CONFIG.highlightClass)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);

    textNodes.forEach((textNode) => {
      const text = textNode.nodeValue;
      if (!regex.test(text)) return;

      const frag = document.createDocumentFragment();
      let lastIndexLocal = 0;

      text.replace(regex, (match, offset) => {
        // prepend plain text chunk
        if (offset > lastIndexLocal) {
          frag.appendChild(document.createTextNode(text.slice(lastIndexLocal, offset)));
        }
        // matched span
        const span = document.createElement("span");
        span.className = CONFIG.highlightClass;
        span.textContent = match;
        frag.appendChild(span);
        hits.push(span);

        lastIndexLocal = offset + match.length;
        return match;
      });

      // tail
      if (lastIndexLocal < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndexLocal)));
      }

      textNode.parentNode.replaceChild(frag, textNode);
    });

    if (hits.length > 0) {
      gotoHit(0, true);
    } else {
      activeIndex = -1;
      if (ui) ui._updateCount(0, 0);
    }
  }

  function makeRegex(query) {
    // Escape regex special chars; keep simple literal find (case-insensitive)
    try {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(escaped, "gi");
    } catch {
      return null;
    }
  }

  function gotoHit(index, force) {
    if (!hits.length) {
      if (ui) ui._updateCount(0, 0);
      return;
    }

    // Wrap around
    if (index < 0) index = hits.length - 1;
    if (index >= hits.length) index = 0;

    // Remove old active
    if (activeIndex >= 0 && hits[activeIndex]) {
      hits[activeIndex].classList.remove(CONFIG.activeClass);
    }

    activeIndex = index;

    const el = hits[activeIndex];
    el.classList.add(CONFIG.activeClass);

    // Scroll into view
    el.scrollIntoView({ behavior: force ? "auto" : "smooth", block: "center" });

    if (ui) ui._updateCount(activeIndex + 1, hits.length);
  }

  // ====== Keyboard shortcuts ======
  document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const mod = isMac ? e.metaKey : e.ctrlKey;

    // Ctrl/Cmd+F opens our find box
    if (mod && e.key.toLowerCase() === "f") {
      e.preventDefault();
      openUI();
      return;
    }

    if (e.key === "Escape") {
      if (ui && ui.classList.contains("open")) {
        e.preventDefault();
        closeUI();
      }
    }

    // F3 next, Shift+F3 prev (like browsers)
    if (e.key === "F3") {
      if (!ui || !ui.classList.contains("open")) openUI();
      e.preventDefault();
      if (e.shiftKey) gotoHit(activeIndex - 1);
      else gotoHit(activeIndex + 1);
    }
  });

  // Optional: expose a tiny API if needed
  window.PageFind = {
    open: openUI,
    close: closeUI,
    search,
    next: () => gotoHit(activeIndex + 1),
    prev: () => gotoHit(activeIndex - 1),
    clear: clearHighlights,
  };
})();
