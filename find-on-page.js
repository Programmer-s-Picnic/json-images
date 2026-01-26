/* page-search-auto-saffron.js
   Auto-visible text search (CASE-INSENSITIVE, NO REGEX)
   Light Saffron Theme
   Stable Next / Prev + Drag to Move (Option 1)

   Added:
   (2) Per-page position key (URL-based)
   (3) Remember collapsed / expanded state
*/

(function () {
  "use strict";

  const SEARCH_BOX_ID = "pageSearchBox";
  const STYLE_ID = "pageSearchBoxStyle";

  // Prevent double-init
  if (document.getElementById(SEARCH_BOX_ID)) return;

  // (2) Per-page key (pathname + query, excludes hash so anchors don't create new keys)
  const PAGE_KEY = `${location.origin}${location.pathname}${location.search}`;
  const STORAGE_KEY = `pageSearchBoxState::${PAGE_KEY}`;

  function initPageSearch() {
    /* ---------- CONFIG ---------- */
    const IGNORE_TAGS = new Set([
      "SCRIPT", "STYLE", "NOSCRIPT", "IFRAME",
      "TEXTAREA", "INPUT", "SELECT", "BUTTON"
    ]);

    let matches = [];
    let activeIndex = -1;

    /* ---------- STYLES ---------- */
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        #${SEARCH_BOX_ID}{
          position: fixed;
          top: 14px;
          right: 14px;
          z-index: 999999;
          width: 350px;
          background: linear-gradient(145deg,#fffaf2,#fff1d6);
          backdrop-filter: blur(8px);
          border-radius: 16px;
          box-shadow:
            0 10px 30px rgba(180,120,20,.25),
            inset 0 0 0 1px rgba(200,140,40,.25);
          padding: 12px;
          font-family: "Segoe UI", system-ui, sans-serif;
          cursor: grab;
          user-select: none;
          touch-action: none; /* helps drag on touch */
        }

        #${SEARCH_BOX_ID}.dragging{
          cursor: grabbing;
          opacity: 0.95;
        }

        #${SEARCH_BOX_ID} .row{
          display:flex;
          gap:8px;
          align-items:center;
        }

        #${SEARCH_BOX_ID} .content{
          margin-top: 8px;
        }

        #${SEARCH_BOX_ID} input{
          width: 100%;
          padding: 11px 14px;
          border-radius: 14px;
          border: 1px solid rgba(200,140,40,.4);
          outline: none;
          font-size: 14px;
          background: #fffdf8;
          color: #4b2e05;
          user-select: text;
          touch-action: auto;
        }

        #${SEARCH_BOX_ID} input::placeholder{
          color: rgba(120,80,20,.6);
        }

        #${SEARCH_BOX_ID} input:focus{
          border-color: #e39a1d;
          box-shadow: 0 0 0 2px rgba(227,154,29,.25);
        }

        #${SEARCH_BOX_ID} .controls{
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #6b4308;
          user-select: none;
          margin-top: 8px;
        }

        #${SEARCH_BOX_ID} .btns{
          display:flex;
          gap:6px;
          align-items:center;
        }

        #${SEARCH_BOX_ID} button{
          border: 1px solid rgba(200,140,40,.45);
          background: linear-gradient(to bottom,#fff6df,#ffe2a6);
          border-radius: 10px;
          padding: 5px 10px;
          cursor: pointer;
          font-size: 12px;
          color: #5c3a07;
          transition: all .15s ease;
          user-select:none;
          touch-action: auto;
        }

        #${SEARCH_BOX_ID} button:hover{
          background: linear-gradient(to bottom,#ffefcc,#ffd98a);
          transform: translateY(-1px);
        }

        #${SEARCH_BOX_ID} button:active{
          transform: translateY(0);
        }

        #${SEARCH_BOX_ID} .mini{
          padding: 5px 9px;
          border-radius: 10px;
          min-width: 34px;
          text-align:center;
          font-weight: 700;
        }

        #${SEARCH_BOX_ID} .title{
          flex: 1;
          font-size: 12px;
          color: rgba(92,58,7,.9);
          letter-spacing: .2px;
          user-select: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* (3) Collapsed state */
        #${SEARCH_BOX_ID}.collapsed{
          width: 220px;
          padding: 10px;
        }
        #${SEARCH_BOX_ID}.collapsed .content{
          display:none;
        }

        .pageSearchHit{
          background: linear-gradient(to bottom,#fff2c4,#ffe19a);
          border-radius: 4px;
          padding: 0 3px;
        }

        .pageSearchActive{
          background: linear-gradient(to bottom,#ffd36a,#ffbf3a);
          outline: 2px solid rgba(200,120,20,.5);
        }

        @media (max-width:480px){
          #${SEARCH_BOX_ID}{
            width: calc(100% - 20px);
            left: 10px;
            right: 10px;
          }
          #${SEARCH_BOX_ID}.collapsed{
            width: calc(100% - 20px);
          }
        }
      `;
      document.head.appendChild(style);
    }

    /* ---------- UI ---------- */
    const box = document.createElement("div");
    box.id = SEARCH_BOX_ID;
    box.innerHTML = `
      <div class="row">
        <div class="title">🔎 Page Search</div>
        <button class="mini" data-act="toggle" title="Collapse / Expand">▾</button>
        <button class="mini" data-act="close" title="Close">×</button>
      </div>

      <div class="content">
        <input type="text" placeholder="Search this page…" aria-label="Search this page" />
        <div class="controls">
          <div class="btns">
            <button data-act="prev" title="Previous (Shift+Enter)">◀</button>
            <button data-act="next" title="Next (Enter)">▶</button>
            <button data-act="clear" title="Clear (Esc)">Clear</button>
          </div>
          <div id="pageSearchCount">0 / 0</div>
        </div>
      </div>
    `;
    document.body.appendChild(box);

    const input = box.querySelector("input");
    const countEl = box.querySelector("#pageSearchCount");
    const toggleBtn = box.querySelector('button[data-act="toggle"]');

    /* ---------- STATE (position + collapsed) ---------- */
    function clamp(n, min, max) {
      return Math.max(min, Math.min(max, n));
    }

    function readState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    function writeState(patch) {
      const prev = readState() || {};
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
    }

    function applyState() {
      const s = readState();
      if (!s) return;

      // restore collapsed
      if (typeof s.collapsed === "boolean") {
        box.classList.toggle("collapsed", s.collapsed);
        toggleBtn.textContent = s.collapsed ? "▸" : "▾";
      }

      // restore position
      if (typeof s.left === "number" && typeof s.top === "number") {
        // keep box on-screen
        const rect = box.getBoundingClientRect();
        const maxLeft = Math.max(0, window.innerWidth - rect.width);
        const maxTop = Math.max(0, window.innerHeight - rect.height);

        const left = clamp(s.left, 0, maxLeft);
        const top = clamp(s.top, 0, maxTop);

        box.style.left = left + "px";
        box.style.top = top + "px";
        box.style.right = "auto";
      }
    }

    applyState();

    /* ---------- CLEAR ---------- */
    function clearHighlights() {
      document.querySelectorAll("span.pageSearchHit").forEach(span => {
        const parent = span.parentNode;
        while (span.firstChild) parent.insertBefore(span.firstChild, span);
        parent.removeChild(span);
        parent.normalize();
      });

      matches = [];
      activeIndex = -1;
      countEl.textContent = "0 / 0";
    }

    /* ---------- HIGHLIGHT (NO REGEX) ---------- */
    function shouldSkipTextNode(node) {
      const p = node.parentElement;
      if (!p) return true;
      if (p.closest(`#${SEARCH_BOX_ID}`)) return true;
      if (IGNORE_TAGS.has(p.tagName)) return true;
      if (!node.nodeValue || !node.nodeValue.trim()) return true;
      return false;
    }

    function highlight(query) {
      clearHighlights();
      if (!query) return;

      const q = query.toLowerCase();
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            return shouldSkipTextNode(node)
              ? NodeFilter.FILTER_REJECT
              : NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const nodesToProcess = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue.toLowerCase().includes(q)) nodesToProcess.push(node);
      }

      nodesToProcess.forEach(originalNode => {
        if (!originalNode.parentNode) return;

        let textNode = originalNode;

        while (textNode && textNode.parentNode) {
          const text = textNode.nodeValue || "";
          const lower = text.toLowerCase();
          const startIndex = lower.indexOf(q);
          if (startIndex === -1) break;

          // split into [before][match][after]
          const before = textNode.splitText(startIndex);
          const after = before.splitText(query.length);

          const span = document.createElement("span");
          span.className = "pageSearchHit";
          span.textContent = before.nodeValue;

          before.parentNode.replaceChild(span, before);
          matches.push(span);

          textNode = after; // continue search in remaining text
        }
      });

      if (matches.length) gotoMatch(0);
    }

    /* ---------- NAV ---------- */
    function gotoMatch(i) {
      if (!matches.length) return;

      if (i < 0) i = matches.length - 1;
      if (i >= matches.length) i = 0;

      matches.forEach(m => m.classList.remove("pageSearchActive"));
      matches[i].classList.add("pageSearchActive");

      matches[i].scrollIntoView({ behavior: "smooth", block: "center" });
      activeIndex = i;
      countEl.textContent = `${i + 1} / ${matches.length}`;
    }

    /* ---------- COLLAPSE / EXPAND (3) ---------- */
    function setCollapsed(collapsed) {
      box.classList.toggle("collapsed", collapsed);
      toggleBtn.textContent = collapsed ? "▸" : "▾";
      writeState({ collapsed });
      if (!collapsed) setTimeout(() => input && input.focus(), 0);
    }

    /* ---------- EVENTS ---------- */
    input.addEventListener("input", () => highlight(input.value.trim()));

    input.addEventListener("focus", () => {
      // If user taps into input somehow, ensure expanded
      if (box.classList.contains("collapsed")) setCollapsed(false);
    });

    box.addEventListener("click", e => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const act = btn.dataset.act;

      if (act === "next") gotoMatch(activeIndex + 1);
      if (act === "prev") gotoMatch(activeIndex - 1);

      if (act === "clear") {
        input.value = "";
        clearHighlights();
        input.focus();
      }

      if (act === "toggle") {
        setCollapsed(!box.classList.contains("collapsed"));
      }

      if (act === "close") {
        input.value = "";
        clearHighlights();
        // keep state saved (position+collapsed) unless you want to remove it:
        // localStorage.removeItem(STORAGE_KEY);
        box.remove();
      }
    });

    // Tap title area to expand/collapse (nice on mobile)
    box.querySelector(".title").addEventListener("click", () => {
      setCollapsed(!box.classList.contains("collapsed"));
    });

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) gotoMatch(activeIndex - 1);
        else gotoMatch(activeIndex + 1);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        input.value = "";
        clearHighlights();
      }
    });

    /* ---------- DRAG TO MOVE (OPTION 1) ---------- */
    let isDragging = false;
    let startX = 0, startY = 0;
    let boxX = 0, boxY = 0;

    function dragStart(x, y) {
      const rect = box.getBoundingClientRect();
      boxX = rect.left;
      boxY = rect.top;
      startX = x;
      startY = y;
      isDragging = true;
      box.classList.add("dragging");
      box.style.right = "auto";
    }

    function dragMove(x, y) {
      if (!isDragging) return;

      const nextLeft = boxX + (x - startX);
      const nextTop = boxY + (y - startY);

      // keep visible while dragging
      const rect = box.getBoundingClientRect();
      const maxLeft = Math.max(0, window.innerWidth - rect.width);
      const maxTop = Math.max(0, window.innerHeight - rect.height);

      box.style.left = clamp(nextLeft, 0, maxLeft) + "px";
      box.style.top = clamp(nextTop, 0, maxTop) + "px";
    }

    function dragEnd() {
      if (!isDragging) return;
      isDragging = false;
      box.classList.remove("dragging");

      // Save position (2) per-page
      const rect = box.getBoundingClientRect();
      writeState({ left: rect.left, top: rect.top });
    }

    // Only drag when starting on the panel background (not input/buttons/content)
    box.addEventListener("mousedown", e => {
      if (e.target.closest("input,button,.content")) return;
      dragStart(e.clientX, e.clientY);
    });

    document.addEventListener("mousemove", e => dragMove(e.clientX, e.clientY));
    document.addEventListener("mouseup", dragEnd);

    box.addEventListener("touchstart", e => {
      if (e.target.closest("input,button,.content")) return;
      const t = e.touches[0];
      dragStart(t.clientX, t.clientY);
    }, { passive: true });

    document.addEventListener("touchmove", e => {
      if (!isDragging) return;
      const t = e.touches[0];
      dragMove(t.clientX, t.clientY);
    }, { passive: true });

    document.addEventListener("touchend", dragEnd);

    // Update clamp on resize (keeps box on-screen)
    window.addEventListener("resize", () => {
      const s = readState();
      if (!s || typeof s.left !== "number" || typeof s.top !== "number") return;
      applyState();
    });

    // Start focused if expanded
    if (!box.classList.contains("collapsed")) input.focus();
  }

  /* ---------- SAFE INIT ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPageSearch);
  } else {
    initPageSearch();
  }
})();