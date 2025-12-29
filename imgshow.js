/* ==========================================================
   Programmer’s Picnic — Draggable Image Gallery
   Amazon-Style Hover Zoom (FULL VERSION)
   Author: Champak Roy
   ========================================================== */

(function () {
  "use strict";

  /* ---------------- CONFIG ---------------- */
  const AUTOPLAY_INTERVAL = 3000;

  /* ---------------- STYLES ---------------- */
  const style = document.createElement("style");
  style.textContent = `
  #pp-open-gallery-btn{
    position:fixed;
    bottom:20px;
    right:20px;
    background:#ff9933;
    color:#fff;
    padding:12px 18px;
    border-radius:8px;
    font-size:15px;
    cursor:grab;
    z-index:99999;
    box-shadow:0 4px 10px rgba(0,0,0,.3);
    user-select:none;
  }
  #pp-open-gallery-btn.dragging{cursor:grabbing;opacity:.9}

  #pp-gallery-modal{
    display:none;
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.92);
    z-index:100000;
  }

  #pp-gallery-modal img{
    position:relative;
    z-index:1;
    max-width:92%;
    max-height:85vh;
    display:block;
    margin:70px auto 10px;
    border-radius:10px;
    opacity:0;
    transform:translateX(20px) scale(0.98);
    transition:opacity .45s ease, transform .45s ease;
  }

  #pp-gallery-modal img.pp-animate{
    opacity:1;
    transform:translateX(0) scale(1);
  }

  .pp-nav-btn,
  #pp-close,
  #pp-auto{
    position:fixed;
    z-index:100001;
    color:white;
    cursor:pointer;
    user-select:none;
  }

  .pp-nav-btn{
    top:50%;
    transform:translateY(-50%);
    font-size:42px;
    padding:12px;
  }
  #pp-prev{left:18px}
  #pp-next{right:18px}

  #pp-close{
    top:18px;
    right:22px;
    font-size:42px;
  }

  #pp-auto{
    top:22px;
    left:25px;
    font-size:28px;
    opacity:.85;
  }
  #pp-auto.running{color:#ffcc80}

  #pp-caption{
    text-align:center;
    color:#eee;
    font-size:14px;
  }

  #pp-brand{
    position:fixed;
    bottom:18px;
    width:100%;
    text-align:center;
    font-size:13px;
    color:#ffd7a3;
    opacity:.85;
    z-index:100001;
  }

  /* ---------- AMAZON STYLE ZOOM ---------- */
  #pp-zoom-lens{
    position:absolute;
    width:140px;
    height:140px;
    border:2px solid #ffb74d;
    background:rgba(255,255,255,.15);
    backdrop-filter:blur(2px);
    pointer-events:none;
    display:none;
    z-index:100002;
    border-radius:10px;
  }

  #pp-zoom-result{
    position:fixed;
    top:90px;
    right:90px;
    width:360px;
    height:360px;
    border-radius:14px;
    border:2px solid #ffb74d;
    background-repeat:no-repeat;
    background-size:200%;
    display:none;
    z-index:100002;
    box-shadow:0 12px 30px rgba(0,0,0,.45);
  }
  `;
  document.head.appendChild(style);

  /* ---------------- HTML ---------------- */
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div id="pp-open-gallery-btn">📷 View Images</div>

    <div id="pp-gallery-modal">
      <span id="pp-close">&times;</span>
      <span id="pp-auto">▶</span>
      <span id="pp-prev" class="pp-nav-btn">&#10094;</span>
      <span id="pp-next" class="pp-nav-btn">&#10095;</span>

      <img id="pp-modal-img"/>
      <div id="pp-zoom-lens"></div>
      <div id="pp-zoom-result"></div>

      <div id="pp-caption"></div>
      <div id="pp-brand">Programmer’s Picnic • Learn with Champak</div>
    </div>`;
  document.body.appendChild(wrap);

  /* ---------------- LOGIC ---------------- */
  let images = [], index = 0, autoplay = null;

  function collectImages() {
    images = [...document.querySelectorAll("img")].filter(
      img => img.src && !img.closest("#pp-gallery-modal") && img.naturalWidth > 150
    );
  }

  function show() {
    const img = images[index];
    modalImg.classList.remove("pp-animate");
    modalImg.src = img.src;
    caption.innerHTML = img.alt || "";
    zoomResult.style.backgroundImage = `url('${img.src}')`;
    void modalImg.offsetWidth;
    modalImg.classList.add("pp-animate");
  }

  function openModal() {
    if (!images.length) return;
    show();
    modal.style.display = "block";
  }

  function closeModal() {
    stopAuto();
    modal.style.display = "none";
    lens.style.display = zoomResult.style.display = "none";
  }

  function next(manual = true) {
    if (manual) stopAuto();
    index = (index + 1) % images.length;
    show();
  }

  function prev(manual = true) {
    if (manual) stopAuto();
    index = (index - 1 + images.length) % images.length;
    show();
  }

  function startAuto() {
    if (autoplay) return;
    autoplay = setInterval(() => next(false), AUTOPLAY_INTERVAL);
    autoBtn.textContent = "⏸";
    autoBtn.classList.add("running");
  }

  function stopAuto() {
    clearInterval(autoplay);
    autoplay = null;
    autoBtn.textContent = "▶";
    autoBtn.classList.remove("running");
  }

  /* ---------------- AMAZON ZOOM LOGIC ---------------- */
  const modal = document.getElementById("pp-gallery-modal");
  const modalImg = document.getElementById("pp-modal-img");
  const lens = document.getElementById("pp-zoom-lens");
  const zoomResult = document.getElementById("pp-zoom-result");
  const caption = document.getElementById("pp-caption");

  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (!isTouch) {
    modalImg.addEventListener("mouseenter", () => {
      lens.style.display = zoomResult.style.display = "block";
    });

    modalImg.addEventListener("mouseleave", () => {
      lens.style.display = zoomResult.style.display = "none";
    });

    modalImg.addEventListener("mousemove", moveLens);
  }

  function moveLens(e) {
    const r = modalImg.getBoundingClientRect();
    const s = lens.offsetWidth / 2;

    let x = e.clientX - r.left - s;
    let y = e.clientY - r.top - s;

    x = Math.max(0, Math.min(x, r.width - lens.offsetWidth));
    y = Math.max(0, Math.min(y, r.height - lens.offsetHeight));

    lens.style.left = r.left + x + "px";
    lens.style.top = r.top + y + "px";

    zoomResult.style.backgroundPosition =
      (x / r.width) * 100 + "% " + (y / r.height) * 100 + "%";
  }

  /* ---------------- DRAG BUTTON ---------------- */
  const btn = document.getElementById("pp-open-gallery-btn");
  let dragging = false, moved = false, sx, sy, bx, by;

  function startDrag(x, y) {
    dragging = true;
    moved = false;
    const r = btn.getBoundingClientRect();
    btn.style.left = r.left + "px";
    btn.style.top = r.top + "px";
    btn.style.right = btn.style.bottom = "auto";
    bx = r.left; by = r.top;
    sx = x; sy = y;
    btn.classList.add("dragging");
  }

  btn.onmousedown = e => startDrag(e.clientX, e.clientY);
  document.onmousemove = e => dragging && (
    moved = true,
    btn.style.left = bx + e.clientX - sx + "px",
    btn.style.top = by + e.clientY - sy + "px"
  );
  document.onmouseup = () => dragging = false;

  btn.onclick = () => {
    if (moved) return;
    collectImages();
    index = 0;
    openModal();
  };

  /* ---------------- EVENTS ---------------- */
  document.getElementById("pp-close").onclick = closeModal;
  document.getElementById("pp-next").onclick = () => next(true);
  document.getElementById("pp-prev").onclick = () => prev(true);
  const autoBtn = document.getElementById("pp-auto");
  autoBtn.onclick = () => autoplay ? stopAuto() : startAuto();

  document.onkeydown = e => {
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowRight") next(true);
    if (e.key === "ArrowLeft") prev(true);
  };
})();