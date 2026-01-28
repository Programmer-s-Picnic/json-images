/* ==========================================================
   Programmer’s Picnic — Draggable Image Gallery v4
   Amazon-Level Zoom • Desktop + Mobile
   + Draggable Open Button + Draggable Zoom UI
   + Stores positions in localStorage (per-page)
   Author: Champak Roy
   ========================================================== */

(function () {
  "use strict";

  /* ---------------- CONFIG ---------------- */
  const AUTOPLAY_INTERVAL = 3000;
  let ZOOM_LEVEL = 2;

  // localStorage keys (scoped per page path)
  const KEY_BTN = "pp_gallery_pos_btn::" + location.pathname;
  const KEY_UI  = "pp_gallery_pos_ui::"  + location.pathname;

  /* ---------------- STYLES ---------------- */
  const style = document.createElement("style");
  style.textContent = `
  #pp-open-gallery-btn{
    position:fixed;
    bottom:20px; right:20px;
    background:#ff9933; color:#fff;
    padding:12px 18px; border-radius:10px;
    font-size:15px; cursor:grab;
    z-index:99999;
    box-shadow:0 4px 10px rgba(0,0,0,.3);
    user-select:none;
    touch-action:none;
    display:inline-flex; align-items:center; gap:8px;
  }
  #pp-open-gallery-btn:active{cursor:grabbing}

  #pp-gallery-modal{
    display:none; position:fixed; inset:0;
    background:rgba(0,0,0,.94); z-index:100000;
  }

  /* ---------- AMAZON LAYOUT ---------- */
  #pp-stage{
    display:flex; gap:30px;
    align-items:center; justify-content:center;
    height:100%;
    padding:80px 60px 60px;
  }

  #pp-left{ position:relative; }
  #pp-left img{
    max-height:80vh; max-width:42vw;
    border-radius:12px;
    transition:.25s;
    transform-origin:center center;
    user-select:none;
    -webkit-user-drag:none;
    touch-action:none;
  }

  #pp-right{
    width:420px; height:420px;
    border-radius:14px;
    border:2px solid #ffb74d;
    background-repeat:no-repeat;
    background-size:200%;
    display:none;
    box-shadow:0 12px 30px rgba(0,0,0,.45);
  }

  #pp-zoom-lens{
    position:absolute;
    width:140px; height:140px;
    border:2px solid #ffb74d;
    background:rgba(255,255,255,.15);
    display:none; pointer-events:none;
    border-radius:10px;
  }

  /* ---------- CONTROLS ---------- */
  .pp-nav{
    position:fixed; top:50%;
    font-size:42px; color:#fff; cursor:pointer;
    z-index:100001; user-select:none;
    touch-action:none;
  }
  #pp-prev{left:20px} #pp-next{right:20px}
  #pp-close{position:fixed;top:20px;right:25px;font-size:42px;color:#fff;cursor:pointer;z-index:100001;user-select:none}
  #pp-auto{position:fixed;top:22px;left:25px;font-size:26px;color:#fff;cursor:pointer;z-index:100001;user-select:none}

  /* Draggable zoom UI */
  #pp-zoom-ui{
    position:fixed;
    bottom:26px; left:50%;
    transform:translateX(-50%);
    background:#111;
    border-radius:12px;
    padding:8px 12px;
    color:#ffd7a3;
    display:flex; gap:10px; align-items:center;
    z-index:100002;
    user-select:none;
    touch-action:none;
    box-shadow:0 10px 26px rgba(0,0,0,.35);
  }
  #pp-zoom-ui .pp-drag-handle{
    width:14px;height:14px;border-radius:4px;
    background:linear-gradient(180deg,#ffd7a3,#ffb74d);
    box-shadow:inset 0 0 0 1px rgba(0,0,0,.25);
    cursor:grab;
  }
  #pp-zoom-ui:active .pp-drag-handle{cursor:grabbing}
  #pp-zoom-ui input{width:140px}

  /* ---------- MOBILE ---------- */
  @media(max-width:900px){
    #pp-stage{flex-direction:column;padding:80px 20px}
    #pp-left img{max-width:92vw}
    #pp-right{display:none !important}
    /* We still show zoom-ui on mobile for zoom slider + drag */
  }
  `;
  document.head.appendChild(style);

  /* ---------------- HTML ---------------- */
  document.body.insertAdjacentHTML("beforeend", `
    <div id="pp-open-gallery-btn" title="Drag me anywhere">📷 <span>View Images</span></div>

    <div id="pp-gallery-modal" aria-hidden="true">
      <span id="pp-close" title="Close (Esc)">&times;</span>
      <span id="pp-auto" title="Autoplay">▶</span>
      <span id="pp-prev" class="pp-nav" title="Previous">&#10094;</span>
      <span id="pp-next" class="pp-nav" title="Next">&#10095;</span>

      <div id="pp-stage">
        <div id="pp-left">
          <img id="pp-img" alt="Gallery image">
          <div id="pp-zoom-lens"></div>
        </div>
        <div id="pp-right"></div>
      </div>

      <div id="pp-zoom-ui" title="Drag this panel to move">
        <span class="pp-drag-handle" aria-hidden="true"></span>
        🔍 Zoom
        <input id="pp-zoom-range" type="range" min="1.5" max="3" step="0.1" value="2">
      </div>
    </div>
  `);

  /* ---------------- HELPERS ---------------- */
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function readPos(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj.x !== "number" || typeof obj.y !== "number") return null;
      return obj;
    } catch { return null; }
  }

  function writePos(key, x, y) {
    try { localStorage.setItem(key, JSON.stringify({ x, y })); } catch {}
  }

  function applyStoredPosition(el, key, defaultAnchor /* {right,bottom,left,top} */) {
    const saved = readPos(key);
    if (saved) {
      el.style.left = saved.x + "px";
      el.style.top = saved.y + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
      el.style.transform = "none"; // important for zoom-ui which uses translateX by default
      return;
    }
    // keep default CSS if nothing saved
    if (defaultAnchor && defaultAnchor.keepTransform) return;
  }

  function makeDraggable(el, key, opts = {}) {
    const handle = opts.handle ? el.querySelector(opts.handle) : el;
    if (!handle) return;

    let dragging = false;
    let startX = 0, startY = 0;
    let originLeft = 0, originTop = 0;

    // Ensure positioned
    const ensurePxPos = () => {
      const rect = el.getBoundingClientRect();
      // If element is using right/bottom or transforms, normalize to left/top pixels
      el.style.left = rect.left + "px";
      el.style.top = rect.top + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
      // remove transform-based centering once dragged
      el.style.transform = "none";
    };

    const onDown = (e) => {
      // ignore right click
      if (e.button !== undefined && e.button !== 0) return;

      dragging = true;
      ensurePxPos();

      const rect = el.getBoundingClientRect();
      originLeft = rect.left;
      originTop = rect.top;

      const pt = getPoint(e);
      startX = pt.x;
      startY = pt.y;

      handle.style.cursor = "grabbing";
      el.style.willChange = "left, top";

      // capture pointer
      if (e.pointerId !== undefined && handle.setPointerCapture) {
        try { handle.setPointerCapture(e.pointerId); } catch {}
      }

      e.preventDefault();
      e.stopPropagation();
    };

    const onMove = (e) => {
      if (!dragging) return;

      const pt = getPoint(e);
      const dx = pt.x - startX;
      const dy = pt.y - startY;

      // viewport bounds
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = el.getBoundingClientRect();

      const newLeft = clamp(originLeft + dx, 6, vw - rect.width - 6);
      const newTop = clamp(originTop + dy, 6, vh - rect.height - 6);

      el.style.left = newLeft + "px";
      el.style.top = newTop + "px";

      // persist
      writePos(key, newLeft, newTop);

      e.preventDefault();
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      handle.style.cursor = "grab";
      el.style.willChange = "auto";
    };

    // Pointer events first
    handle.addEventListener("pointerdown", onDown, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);

    // Fallback for older browsers
    handle.addEventListener("mousedown", onDown, { passive: false });
    window.addEventListener("mousemove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);

    // Touch fallback
    handle.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    function getPoint(ev) {
      if (ev.touches && ev.touches[0]) return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
      if (ev.changedTouches && ev.changedTouches[0]) return { x: ev.changedTouches[0].clientX, y: ev.changedTouches[0].clientY };
      return { x: ev.clientX, y: ev.clientY };
    }
  }

  /* ---------------- LOGIC ---------------- */
  let imgs = [], index = 0, autoplay = null;

  const modal = document.getElementById("pp-gallery-modal");
  const img = document.getElementById("pp-img");
  const lens = document.getElementById("pp-zoom-lens");
  const zoomBox = document.getElementById("pp-right");
  const zoomSlider = document.getElementById("pp-zoom-range");
  const autoBtn = document.getElementById("pp-auto");
  const openBtn = document.getElementById("pp-open-gallery-btn");
  const zoomUI = document.getElementById("pp-zoom-ui");

  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  // Apply stored positions
  applyStoredPosition(openBtn, KEY_BTN);
  applyStoredPosition(zoomUI, KEY_UI, { keepTransform: true });

  // Make draggable: open button (whole) and zoom UI (handle only)
  makeDraggable(openBtn, KEY_BTN);
  makeDraggable(zoomUI, KEY_UI, { handle: ".pp-drag-handle" });

  function collect() {
    // Collect all visible-ish images on the page (not inside modal)
    imgs = [...document.querySelectorAll("img")]
      .filter(i =>
        i.src &&
        !i.closest("#pp-gallery-modal") &&
        // ignore tiny icons by rendered size
        (i.getBoundingClientRect().width >= 80 && i.getBoundingClientRect().height >= 80)
      );

    // fallback: if nothing matched, allow any non-modal img[src]
    if (imgs.length === 0) {
      imgs = [...document.querySelectorAll("img")].filter(i => i.src && !i.closest("#pp-gallery-modal"));
    }
  }

  function show() {
    if (!imgs.length) return;
    const src = imgs[index] && imgs[index].src ? imgs[index].src : imgs[0].src;
    img.src = src;

    zoomBox.style.backgroundImage = `url('${src.replace(/'/g, "%27")}')`;
    zoomBox.style.backgroundSize = `${parseFloat(ZOOM_LEVEL) * 100}%`;
  }

  function open() {
    if (!imgs.length) {
      alert("No images found on this page.");
      return;
    }
    show();
    modal.style.display = "block";
    modal.setAttribute("aria-hidden", "false");
  }

  function close() {
    stopAuto();
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    lens.style.display = "none";
    zoomBox.style.display = "none";
    img.style.transform = "scale(1)";
  }

  function next(manual = true) {
    if (!imgs.length) return;
    if (manual) stopAuto();
    index = (index + 1) % imgs.length;
    show();
  }
  function prev(manual = true) {
    if (!imgs.length) return;
    if (manual) stopAuto();
    index = (index - 1 + imgs.length) % imgs.length;
    show();
  }

  function startAuto() {
    if (!imgs.length) return;
    if (autoplay) return;
    autoplay = setInterval(() => next(false), AUTOPLAY_INTERVAL);
    autoBtn.textContent = "⏸";
  }
  function stopAuto() {
    if (!autoplay) { autoBtn.textContent = "▶"; return; }
    clearInterval(autoplay);
    autoplay = null;
    autoBtn.textContent = "▶";
  }

  /* ---------- DESKTOP ZOOM ---------- */
  if (!isTouch) {
    img.addEventListener("mouseenter", () => {
      lens.style.display = "block";
      zoomBox.style.display = "block";
    });
    img.addEventListener("mouseleave", () => {
      lens.style.display = "none";
      zoomBox.style.display = "none";
    });

    img.addEventListener("mousemove", (e) => {
      if (!imgs.length) return;
      const r = img.getBoundingClientRect();
      const lw = lens.offsetWidth;
      const lh = lens.offsetHeight;
      const halfW = lw / 2;
      const halfH = lh / 2;

      let x = e.clientX - r.left - halfW;
      let y = e.clientY - r.top - halfH;

      x = clamp(x, 0, r.width - lw);
      y = clamp(y, 0, r.height - lh);

      lens.style.left = x + "px";
      lens.style.top = y + "px";

      const xRatio = (r.width - lw) ? (x / (r.width - lw)) : 0;
      const yRatio = (r.height - lh) ? (y / (r.height - lh)) : 0;

      zoomBox.style.backgroundPosition = (xRatio * 100) + "% " + (yRatio * 100) + "%";
    });
  }

  zoomSlider.addEventListener("input", (e) => {
    ZOOM_LEVEL = parseFloat(e.target.value);
    zoomBox.style.backgroundSize = `${ZOOM_LEVEL * 100}%`;
  });

  /* ---------- MOBILE DOUBLE TAP TO TOGGLE ZOOM ---------- */
  if (isTouch) {
    let zoomed = false;
    let lastTap = 0;

    img.addEventListener("touchstart", (e) => {
      const now = Date.now();
      const dt = now - lastTap;
      lastTap = now;

      // double tap threshold
      if (dt > 40 && dt < 320) {
        zoomed = !zoomed;
        img.style.transform = zoomed ? "scale(2)" : "scale(1)";
      }
      // prevent accidental scroll on image when zoomed
      if (zoomed) e.preventDefault();
    }, { passive: false });
  }

  /* ---------- EVENTS ---------- */
  openBtn.addEventListener("click", () => {
    collect();
    index = 0;
    open();
  });

  document.getElementById("pp-close").addEventListener("click", close);
  document.getElementById("pp-next").addEventListener("click", () => next(true));
  document.getElementById("pp-prev").addEventListener("click", () => prev(true));
  autoBtn.addEventListener("click", () => (autoplay ? stopAuto() : startAuto()));

  // Close on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  // Close on ESC + keyboard nav
  window.addEventListener("keydown", (e) => {
    if (modal.style.display !== "block") return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") next(true);
    if (e.key === "ArrowLeft") prev(true);
  });

})();
