/* ==========================================================
   Programmer’s Picnic — Draggable Image Gallery v3
   Amazon-Level Zoom • Desktop + Mobile
   Author: Champak Roy
   ========================================================== */

(function () {
  "use strict";

  /* ---------------- CONFIG ---------------- */
  const AUTOPLAY_INTERVAL = 3000;
  let ZOOM_LEVEL = 2;

  /* ---------------- STYLES ---------------- */
  const style = document.createElement("style");
  style.textContent = `
  #pp-open-gallery-btn{
    position:fixed;bottom:20px;right:20px;
    background:#ff9933;color:#fff;
    padding:12px 18px;border-radius:8px;
    font-size:15px;cursor:grab;
    z-index:99999;box-shadow:0 4px 10px rgba(0,0,0,.3);
    user-select:none;
  }
  #pp-gallery-modal{
    display:none;position:fixed;inset:0;
    background:rgba(0,0,0,.94);z-index:100000;
  }

  /* ---------- AMAZON LAYOUT ---------- */
  #pp-stage{
    display:flex;gap:30px;
    align-items:center;justify-content:center;
    height:100%;
    padding:80px 60px 60px;
  }

  #pp-left{
    position:relative;
  }

  #pp-left img{
    max-height:80vh;max-width:42vw;
    border-radius:12px;
    transition:.35s;
  }

  #pp-right{
    width:420px;height:420px;
    border-radius:14px;
    border:2px solid #ffb74d;
    background-repeat:no-repeat;
    background-size:200%;
    display:none;
    box-shadow:0 12px 30px rgba(0,0,0,.45);
  }

  #pp-zoom-lens{
    position:absolute;
    width:140px;height:140px;
    border:2px solid #ffb74d;
    background:rgba(255,255,255,.15);
    display:none;pointer-events:none;
    border-radius:10px;
  }

  /* ---------- CONTROLS ---------- */
  .pp-nav{position:fixed;top:50%;font-size:42px;color:#fff;cursor:pointer;z-index:100001}
  #pp-prev{left:20px} #pp-next{right:20px}
  #pp-close{position:fixed;top:20px;right:25px;font-size:42px;color:#fff;cursor:pointer}
  #pp-auto{position:fixed;top:22px;left:25px;font-size:26px;color:#fff;cursor:pointer}

  #pp-zoom-ui{
    position:fixed;bottom:26px;left:50%;
    transform:translateX(-50%);
    background:#111;border-radius:12px;
    padding:8px 14px;color:#ffd7a3;
    display:flex;gap:10px;align-items:center;
    z-index:100002;
  }

  #pp-zoom-ui input{width:120px}

  /* ---------- MOBILE ---------- */
  @media(max-width:900px){
    #pp-stage{flex-direction:column;padding:80px 20px}
    #pp-left img{max-width:92vw}
    #pp-right{display:none !important}
    #pp-zoom-ui{display:none}
  }
  `;
  document.head.appendChild(style);

  /* ---------------- HTML ---------------- */
  document.body.insertAdjacentHTML("beforeend", `
    <div id="pp-open-gallery-btn">📷 View Images</div>

    <div id="pp-gallery-modal">
      <span id="pp-close">&times;</span>
      <span id="pp-auto">▶</span>
      <span id="pp-prev" class="pp-nav">&#10094;</span>
      <span id="pp-next" class="pp-nav">&#10095;</span>

      <div id="pp-stage">
        <div id="pp-left">
          <img id="pp-img">
          <div id="pp-zoom-lens"></div>
        </div>
        <div id="pp-right"></div>
      </div>

      <div id="pp-zoom-ui">
        🔍 Zoom
        <input type="range" min="1.5" max="3" step="0.1" value="2">
      </div>
    </div>
  `);

  /* ---------------- LOGIC ---------------- */
  let imgs = [], index = 0, autoplay = null;
  const modal = document.getElementById("pp-gallery-modal");
  const img = document.getElementById("pp-img");
  const lens = document.getElementById("pp-zoom-lens");
  const zoomBox = document.getElementById("pp-right");
  const zoomSlider = document.querySelector("#pp-zoom-ui input");

  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  function collect() {
    imgs = [...document.querySelectorAll("img")]
      .filter(i => i.src && !i.closest("#pp-gallery-modal") && i.naturalWidth > 200);
  }

  function show() {
    img.src = imgs[index].src;
    zoomBox.style.backgroundImage = `url('${img.src}')`;
    zoomBox.style.backgroundSize = `${ZOOM_LEVEL * 100}%`;
  }

  function open() {
    show(); modal.style.display = "block";
  }

  function close() {
    stopAuto();
    modal.style.display = "none";
    lens.style.display = zoomBox.style.display = "none";
  }

  function next(m=true){ if(m)stopAuto(); index=(index+1)%imgs.length; show(); }
  function prev(m=true){ if(m)stopAuto(); index=(index-1+imgs.length)%imgs.length; show(); }

  function startAuto(){
    autoplay=setInterval(()=>next(false),AUTOPLAY_INTERVAL);
    autoBtn.textContent="⏸";
  }
  function stopAuto(){
    clearInterval(autoplay); autoplay=null;
    autoBtn.textContent="▶";
  }

  /* ---------- DESKTOP ZOOM ---------- */
  if(!isTouch){
    img.onmouseenter=()=>{lens.style.display=zoomBox.style.display="block"};
    img.onmouseleave=()=>{lens.style.display=zoomBox.style.display="none"};
    img.onmousemove=e=>{
      const r=img.getBoundingClientRect(), s=lens.offsetWidth/2;
      let x=e.clientX-r.left-s, y=e.clientY-r.top-s;
      x=Math.max(0,Math.min(x,r.width-lens.offsetWidth));
      y=Math.max(0,Math.min(y,r.height-lens.offsetHeight));
      lens.style.left=x+"px"; lens.style.top=y+"px";
      zoomBox.style.backgroundPosition=
        (x/r.width*100)+"% "+(y/r.height*100)+"%";
    };
  }

  zoomSlider.oninput=e=>{
    ZOOM_LEVEL=e.target.value;
    zoomBox.style.backgroundSize=`${ZOOM_LEVEL*100}%`;
  };

  /* ---------- MOBILE DOUBLE TAP ---------- */
  if(isTouch){
    let zoomed=false;
    img.ontouchstart=e=>{
      if(!zoomed){
        zoomed=true;
        img.style.transform="scale(2)";
      }else{
        zoomed=false;
        img.style.transform="scale(1)";
      }
    };
  }

  /* ---------- EVENTS ---------- */
  const autoBtn=document.getElementById("pp-auto");
  document.getElementById("pp-open-gallery-btn").onclick=()=>{
    collect(); index=0; open();
  };
  document.getElementById("pp-close").onclick=close;
  document.getElementById("pp-next").onclick=()=>next(true);
  document.getElementById("pp-prev").onclick=()=>prev(true);
  autoBtn.onclick=()=>autoplay?stopAuto():startAuto();

})();