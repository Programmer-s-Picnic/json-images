/* page-search-auto-saffron.js
   Auto-visible text search (CASE-INSENSITIVE, NO REGEX)
   Light Saffron Theme
   Stable Next / Prev + Drag to Move (Option 1)

   Includes:
   - Per-page position key (URL-based)
   - Remember collapsed / expanded state
   - Movable floating pills: WhatsApp, Call Me, Email
   - Read Full Page option using Speech Synthesis
*/

(function () {
  "use strict";

  const SEARCH_BOX_ID = "pageSearchBox";
  const STYLE_ID = "pageSearchBoxStyle";

  // Prevent double-init
  if (document.getElementById(SEARCH_BOX_ID)) return;

  // Per-page key (pathname + query, excludes hash so anchors don't create new keys)
  const PAGE_KEY = `${location.origin}${location.pathname}${location.search}`;
  const STORAGE_KEY = `pageSearchBoxState::${PAGE_KEY}`;

  function initPageSearch() {
    /* ---------- CONFIG ---------- */
    const IGNORE_TAGS = new Set([
      "SCRIPT",
      "STYLE",
      "NOSCRIPT",
      "IFRAME",
      "TEXTAREA",
      "INPUT",
      "SELECT",
      "BUTTON",
    ]);

    let matches = [];
    let activeIndex = -1;
    let isReading = false;
    let currentUtterance = null;

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
          touch-action: none;
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
          gap: 8px;
          flex-wrap: wrap;
        }

        #${SEARCH_BOX_ID} .btns{
          display:flex;
          gap:6px;
          align-items:center;
          flex-wrap: wrap;
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

        #${SEARCH_BOX_ID} .readBtn.reading{
          background: linear-gradient(to bottom,#ffe1cc,#ffb88a);
          border-color: rgba(200,90,40,.45);
        }

        /* Collapsed state */
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

        /* ==============================
           FLOATING PILLS (Movable)
           WhatsApp / Call / Email
           ============================== */

        #ppFloatingPills{
          position: fixed;
          top: 110px;
          right: 18px;
          z-index: 999998;
          display: flex;
          flex-direction: column;
          gap: 12px;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
        }

        #ppFloatingPills.ppDrag{
          opacity: .96;
          cursor: grabbing;
        }

        #ppFloatingPills .ppPill{
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(10px) saturate(120%);
          box-shadow:
            0 18px 40px rgba(8, 36, 64, 0.10),
            inset 0 1px 0 rgba(255,255,255,0.6);
          font-family: "Segoe UI", system-ui, sans-serif;
          font-weight: 800;
          color: #111827;
          text-decoration: none;
          cursor: pointer;
          min-width: 200px;
          justify-content: center;
          transition: transform .12s ease, box-shadow .12s ease;
        }

        #ppFloatingPills .ppPill:hover{
          transform: translateY(-1px);
          box-shadow:
            0 22px 46px rgba(8, 36, 64, 0.12),
            inset 0 1px 0 rgba(255,255,255,0.6);
        }

        #ppFloatingPills .ppPill:active{
          transform: translateY(0) scale(.99);
        }

        #ppFloatingPills .ppIcon{
          width: 28px;
          height: 28px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(217, 119, 6, 0.18);
          flex: 0 0 auto;
        }

        #ppFloatingPills .ppIcon svg{ width: 18px; height: 18px; }

        @media (max-width:520px){
          #ppFloatingPills .ppPill{ min-width: 170px; padding: 12px 14px; }
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
            <button class="readBtn" data-act="read" title="Read the full page">🔊 Read Page</button>
          </div>
          <div id="pageSearchCount">0 / 0</div>
        </div>
      </div>
    `;
    document.body.appendChild(box);

    const input = box.querySelector("input");
    const countEl = box.querySelector("#pageSearchCount");
    const toggleBtn = box.querySelector('button[data-act="toggle"]');
    const readBtn = box.querySelector('button[data-act="read"]');

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

      if (typeof s.collapsed === "boolean") {
        box.classList.toggle("collapsed", s.collapsed);
        toggleBtn.textContent = s.collapsed ? "▸" : "▾";
      }

      if (typeof s.left === "number" && typeof s.top === "number") {
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
      document.querySelectorAll("span.pageSearchHit").forEach((span) => {
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
      if (p.closest("#ppFloatingPills")) return true;
      if (IGNORE_TAGS.has(p.tagName)) return true;
      if (!node.nodeValue || !node.nodeValue.trim()) return true;
      return false;
    }

    function highlight(query) {
      clearHighlights();
      if (!query) return;

      const q = query.toLowerCase();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return shouldSkipTextNode(node)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT;
        },
      });

      const nodesToProcess = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue.toLowerCase().includes(q)) nodesToProcess.push(node);
      }

      nodesToProcess.forEach((originalNode) => {
        if (!originalNode.parentNode) return;
        let textNode = originalNode;

        while (textNode && textNode.parentNode) {
          const text = textNode.nodeValue || "";
          const lower = text.toLowerCase();
          const startIndex = lower.indexOf(q);
          if (startIndex === -1) break;

          const before = textNode.splitText(startIndex);
          const after = before.splitText(query.length);

          const span = document.createElement("span");
          span.className = "pageSearchHit";
          span.textContent = before.nodeValue;

          before.parentNode.replaceChild(span, before);
          matches.push(span);

          textNode = after;
        }
      });

      if (matches.length) gotoMatch(0);
    }

    /* ---------- NAV ---------- */
    function gotoMatch(i) {
      if (!matches.length) return;

      if (i < 0) i = matches.length - 1;
      if (i >= matches.length) i = 0;

      matches.forEach((m) => m.classList.remove("pageSearchActive"));
      matches[i].classList.add("pageSearchActive");

      matches[i].scrollIntoView({ behavior: "smooth", block: "center" });
      activeIndex = i;
      countEl.textContent = `${i + 1} / ${matches.length}`;
    }

    /* ---------- READ FULL PAGE ---------- */
    function getPageTextForReading() {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return shouldSkipTextNode(node)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT;
        },
      });

      const parts = [];
      let node;
      while ((node = walker.nextNode())) {
        const text = (node.nodeValue || "").replace(/\s+/g, " ").trim();
        if (text) parts.push(text);
      }

      return parts.join(". ");
    }

    function updateReadButton() {
      if (!readBtn) return;
      if (isReading) {
        readBtn.textContent = "⏹ Stop";
        readBtn.classList.add("reading");
        readBtn.title = "Stop reading";
      } else {
        readBtn.textContent = "🔊 Read Page";
        readBtn.classList.remove("reading");
        readBtn.title = "Read the full page";
      }
    }

    function stopReading() {
      try {
        window.speechSynthesis.cancel();
      } catch {}
      isReading = false;
      currentUtterance = null;
      updateReadButton();
    }

    function startReading() {
      if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
        alert("Text-to-speech is not supported in this browser.");
        return;
      }

      const text = getPageTextForReading();
      if (!text) {
        alert("No readable text found on this page.");
        return;
      }

      stopReading();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = document.documentElement.lang || "en-IN";

      utterance.onstart = function () {
        isReading = true;
        currentUtterance = utterance;
        updateReadButton();
      };

      utterance.onend = function () {
        isReading = false;
        currentUtterance = null;
        updateReadButton();
      };

      utterance.onerror = function () {
        isReading = false;
        currentUtterance = null;
        updateReadButton();
      };

      currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    }

    function toggleReadPage() {
      if (isReading || window.speechSynthesis.speaking) {
        stopReading();
      } else {
        startReading();
      }
    }

    /* ---------- COLLAPSE / EXPAND ---------- */
    function setCollapsed(collapsed) {
      box.classList.toggle("collapsed", collapsed);
      toggleBtn.textContent = collapsed ? "▸" : "▾";
      writeState({ collapsed });
      if (!collapsed) setTimeout(() => input && input.focus(), 0);
    }

    /* ---------- EVENTS ---------- */
    input.addEventListener("input", () => highlight(input.value.trim()));

    input.addEventListener("focus", () => {
      if (box.classList.contains("collapsed")) setCollapsed(false);
    });

    box.addEventListener("click", (e) => {
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

      if (act === "read") {
        toggleReadPage();
      }

      if (act === "toggle") setCollapsed(!box.classList.contains("collapsed"));

      if (act === "close") {
        stopReading();
        input.value = "";
        clearHighlights();
        box.remove();
      }
    });

    box.querySelector(".title").addEventListener("click", () => {
      setCollapsed(!box.classList.contains("collapsed"));
    });

    input.addEventListener("keydown", (e) => {
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

    /* ---------- DRAG TO MOVE (search box) ---------- */
    let isDragging = false;
    let startX = 0,
      startY = 0;
    let boxX = 0,
      boxY = 0;

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

      const rect = box.getBoundingClientRect();
      writeState({ left: rect.left, top: rect.top });
    }

    box.addEventListener("mousedown", (e) => {
      if (e.target.closest("input,button,.content")) return;
      dragStart(e.clientX, e.clientY);
    });

    document.addEventListener("mousemove", (e) => dragMove(e.clientX, e.clientY));
    document.addEventListener("mouseup", dragEnd);

    box.addEventListener(
      "touchstart",
      (e) => {
        if (e.target.closest("input,button,.content")) return;
        const t = e.touches[0];
        dragStart(t.clientX, t.clientY);
      },
      { passive: true }
    );

    document.addEventListener(
      "touchmove",
      (e) => {
        if (!isDragging) return;
        const t = e.touches[0];
        dragMove(t.clientX, t.clientY);
      },
      { passive: true }
    );

    document.addEventListener("touchend", dragEnd);

    window.addEventListener("resize", () => {
      const s = readState();
      if (!s || typeof s.left !== "number" || typeof s.top !== "number") return;
      applyState();
      if (window.PP__FloatingPills && window.PP__FloatingPills._reclamp) {
        window.PP__FloatingPills._reclamp();
      }
    });

    if (!box.classList.contains("collapsed")) input.focus();
    updateReadButton();

    /* =========================================================
       FLOATING MOVABLE "WhatsApp / Call / Email" PILLS
       ========================================================= */

    (function initFloatingPills() {
      const PILL_ID = "ppFloatingPills";
      const PILL_STORE = `ppFloatingPillsState::${PAGE_KEY}`;
      if (document.getElementById(PILL_ID)) return;

      const WHATSAPP_NUMBER = "919335874326";
      const CALL_NUMBER = "919335874326";
      const EMAIL = "champaksworld@gmail.com";

      function pillRead() {
        try {
          const raw = localStorage.getItem(PILL_STORE);
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      }

      function pillWrite(patch) {
        const prev = pillRead() || {};
        const next = { ...prev, ...patch };
        try {
          localStorage.setItem(PILL_STORE, JSON.stringify(next));
        } catch {}
      }

      function svgChat() {
        return `
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7.5 18.2 4 20V6.8A3.8 3.8 0 0 1 7.8 3h8.4A3.8 3.8 0 0 1 20 6.8v6.6a3.8 3.8 0 0 1-3.8 3.8H7.5Z"
              stroke="#6b7280" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M7.6 9.2h8.8M7.6 12.2h6.2" stroke="#6b7280" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        `;
      }

      function svgPhone() {
        return `
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7.2 3.8h2.2c.7 0 1.3.4 1.5 1l.8 2.1c.2.6 0 1.3-.5 1.7l-1.3 1.1a12.8 12.8 0 0 0 5.1 5.1l1.1-1.3c.4-.5 1.1-.7 1.7-.5l2.1.8c.6.2 1 0.8 1 1.5v2.2c0 .9-.7 1.7-1.6 1.7C11.2 21.1 2.9 12.8 2.9 5.4c0-.9.7-1.6 1.7-1.6h2.6Z"
              stroke="#6b7280" stroke-width="1.8" stroke-linejoin="round"/>
          </svg>
        `;
      }

      function svgMail() {
        return `
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4.5 7.5h15v9a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-9Z"
              stroke="#6b7280" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="m5.2 8.2 6.2 5a1 1 0 0 0 1.2 0l6.2-5"
              stroke="#6b7280" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
      }

      function makePill(label, href, iconSvg, iconStyle) {
        const a = document.createElement("a");
        a.className = "ppPill";
        a.href = href;
        a.innerHTML = `<span class="ppIcon" style="${iconStyle || ""}">${iconSvg}</span><span>${label}</span>`;
        return a;
      }

      const wrap = document.createElement("div");
      wrap.id = PILL_ID;
      wrap.style.top = "110px";
      wrap.style.right = "18px";

      const waMsg = encodeURIComponent("Namaste 🙏 I have a question / requirement.");
      const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`;
      const callHref = `tel:${CALL_NUMBER}`;
      const mailHref = `mailto:${EMAIL}?subject=${encodeURIComponent("Request from Learning Sutras")}&body=${encodeURIComponent("Namaste 🙏\n\nI want help with:\n\n")}`;

      const wa = makePill(
        "WhatsApp",
        waHref,
        svgChat(),
        "background: rgba(34,197,94,0.10); border-color: rgba(34,197,94,0.20)"
      );
      wa.target = "_blank";
      wa.rel = "noopener";

      const call = makePill(
        "Call me",
        callHref,
        svgPhone(),
        "background: rgba(59,130,246,0.10); border-color: rgba(59,130,246,0.18)"
      );

      const mail = makePill(
        "Email",
        mailHref,
        svgMail(),
        "background: rgba(168,85,247,0.10); border-color: rgba(168,85,247,0.18)"
      );

      wrap.appendChild(wa);
      wrap.appendChild(call);
      wrap.appendChild(mail);
      document.body.appendChild(wrap);

      const saved = pillRead();
      if (saved && typeof saved.left === "number" && typeof saved.top === "number") {
        wrap.style.left = saved.left + "px";
        wrap.style.top = saved.top + "px";
        wrap.style.right = "auto";
      }

      let dragging = false;
      let startPX = 0,
        startPY = 0;
      let origL = 0,
        origT = 0;
      let moved = 0;

      function getRect() {
        return wrap.getBoundingClientRect();
      }

      function startDrag(ev) {
        if (ev.button !== undefined && ev.button !== 0) return;

        const rect = getRect();
        wrap.style.left = rect.left + "px";
        wrap.style.top = rect.top + "px";
        wrap.style.right = "auto";

        dragging = true;
        moved = 0;
        wrap.classList.add("ppDrag");
        wrap.dataset.dragged = "0";

        startPX = ev.clientX;
        startPY = ev.clientY;
        origL = rect.left;
        origT = rect.top;

        try {
          wrap.setPointerCapture(ev.pointerId);
        } catch {}
        ev.preventDefault();
      }

      function moveDrag(ev) {
        if (!dragging) return;

        const dx = ev.clientX - startPX;
        const dy = ev.clientY - startPY;
        moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));

        const rect = getRect();
        const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
        const maxTop = Math.max(8, window.innerHeight - rect.height - 8);

        const nextLeft = clamp(origL + dx, 8, maxLeft);
        const nextTop = clamp(origT + dy, 8, maxTop);

        wrap.style.left = nextLeft + "px";
        wrap.style.top = nextTop + "px";

        if (moved > 8) wrap.dataset.dragged = "1";
        ev.preventDefault();
      }

      function endDrag(ev) {
        if (!dragging) return;
        dragging = false;
        wrap.classList.remove("ppDrag");

        const rect = getRect();
        pillWrite({ left: Math.round(rect.left), top: Math.round(rect.top) });

        setTimeout(() => (wrap.dataset.dragged = "0"), 80);

        try {
          wrap.releasePointerCapture(ev.pointerId);
        } catch {}
        ev.preventDefault();
      }

      function cancelClickIfDragged(e) {
        if (wrap.dataset.dragged === "1") {
          e.preventDefault();
          e.stopPropagation();
        }
      }

      wa.addEventListener("click", cancelClickIfDragged);
      call.addEventListener("click", cancelClickIfDragged);
      mail.addEventListener("click", cancelClickIfDragged);

      wrap.addEventListener("pointerdown", startDrag);
      window.addEventListener("pointermove", moveDrag, { passive: false });
      window.addEventListener("pointerup", endDrag, { passive: false });

      function reclamp() {
        const rect = getRect();
        const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
        const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
        const left = clamp(rect.left, 8, maxLeft);
        const top = clamp(rect.top, 8, maxTop);
        wrap.style.left = left + "px";
        wrap.style.top = top + "px";
        wrap.style.right = "auto";
        pillWrite({ left: Math.round(left), top: Math.round(top) });
      }

      window.PP__FloatingPills = window.PP__FloatingPills || {};
      window.PP__FloatingPills._reclamp = reclamp;
    })();
  }

  /* ---------- SAFE INIT ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPageSearch);
  } else {
    initPageSearch();
  }
})();