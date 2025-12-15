/* page-search-auto-saffron.js
   Auto-visible text search (CASE-INSENSITIVE, NO REGEX)
   TRULY FIXED Next / Prev
*/

(function () {
  "use strict";

  function initPageSearch() {

    /* ---------- CONFIG ---------- */
    const IGNORE_TAGS = new Set([
      "SCRIPT", "STYLE", "NOSCRIPT", "IFRAME",
      "TEXTAREA", "INPUT", "SELECT", "BUTTON"
    ]);

    const SEARCH_BOX_ID = "pageSearchBox";

    let matches = [];
    let activeIndex = -1;

    /* ---------- STYLES ---------- */
    const style = document.createElement("style");
    style.textContent = `
      #${SEARCH_BOX_ID}{
        position: fixed;
        top: 14px;
        right: 14px;
        z-index: 999999;
        width: 350px;
        background: linear-gradient(145deg,#fffaf2,#fff1d6);
        border-radius: 16px;
        padding: 12px;
        font-family: system-ui;
        box-shadow: 0 10px 30px rgba(180,120,20,.25);
      }
      #${SEARCH_BOX_ID} input{
        width: 100%;
        padding: 10px;
        border-radius: 12px;
        border: 1px solid #d9a441;
      }
      .pageSearchHit{
        background: #ffe19a;
        padding: 0 3px;
        border-radius: 3px;
      }
      .pageSearchActive{
        background: #ffbf3a;
        outline: 2px solid #c97a00;
      }
    `;
    document.head.appendChild(style);

    /* ---------- UI ---------- */
    const box = document.createElement("div");
    box.id = SEARCH_BOX_ID;
    box.innerHTML = `
      <input type="text" placeholder="Search page…" />
      <div style="display:flex;justify-content:space-between;margin-top:6px">
        <div>
          <button data-act="prev">◀</button>
          <button data-act="next">▶</button>
        </div>
        <div id="pageSearchCount">0 / 0</div>
      </div>
    `;
    document.body.appendChild(box);

    const input = box.querySelector("input");
    const countEl = box.querySelector("#pageSearchCount");

    /* ---------- SAFE CLEAR ---------- */
    function clearHighlights() {
      document.querySelectorAll(".pageSearchHit").forEach(span => {
        span.replaceWith(span.textContent);
      });

      document.body.normalize(); // 🔑 FIX
      matches = [];
      activeIndex = -1;
      countEl.textContent = "0 / 0";
    }

    /* ---------- HIGHLIGHT ---------- */
    function highlight(query) {
      clearHighlights();
      if (!query) return;

      const q = query.toLowerCase();
      const textNodes = [];

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const p = node.parentElement;
            if (!p) return NodeFilter.FILTER_REJECT;
            if (p.closest(`#${SEARCH_BOX_ID}`)) return NodeFilter.FILTER_REJECT;
            if (IGNORE_TAGS.has(p.tagName)) return NodeFilter.FILTER_REJECT;
            if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue.toLowerCase().includes(q)) {
          textNodes.push(node);
        }
      }

      textNodes.forEach(node => {
        const text = node.nodeValue;
        const lower = text.toLowerCase();
        let index = lower.indexOf(q);
        if (index === -1) return;

        const frag = document.createDocumentFragment();
        let last = 0;

        while (index !== -1) {
          frag.append(text.slice(last, index));

          const span = document.createElement("span");
          span.className = "pageSearchHit";
          span.textContent = text.slice(index, index + query.length);

          frag.append(span);
          matches.push(span);

          last = index + query.length;
          index = lower.indexOf(q, last);
        }

        frag.append(text.slice(last));
        node.replaceWith(frag);
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

      matches[i].scrollIntoView({ block: "center" });
      activeIndex = i;
      countEl.textContent = `${i + 1} / ${matches.length}`;
    }

    /* ---------- EVENTS ---------- */
    input.addEventListener("input", () =>
      highlight(input.value.trim())
    );

    box.addEventListener("click", e => {
      const act = e.target.dataset.act;
      if (act === "next") gotoMatch(activeIndex + 1);
      if (act === "prev") gotoMatch(activeIndex - 1);
    });

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") gotoMatch(activeIndex + 1);
      if (e.key === "Escape") {
        input.value = "";
        clearHighlights();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPageSearch);
  } else {
    initPageSearch();
  }

})();