<!-- 🔶 Draggable Image Slideshow Modal – Programmer's Picnic -->
<style>
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

/* ---------- MODAL ---------- */
#pp-gallery-modal{
  display:none;
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.92);
  z-index:100000;
}

/* 🔑 Image stays below controls */
#pp-gallery-modal img{
  position:relative;
  z-index:1;
  max-width:92%;
  max-height:85vh;
  display:block;
  margin:70px auto 10px;
  border-radius:10px;
}

/* ---------- CONTROLS (ALWAYS ABOVE IMAGE) ---------- */
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
  position:relative;
  z-index:100001;
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
</style>

<div id="pp-open-gallery-btn">📷 View Images</div>

<div id="pp-gallery-modal">
  <span id="pp-close">&times;</span>
  <span id="pp-auto">▶</span>
  <span id="pp-prev" class="pp-nav-btn">&#10094;</span>
  <span id="pp-next" class="pp-nav-btn">&#10095;</span>

  <img id="pp-modal-img" />
  <div id="pp-caption"></div>
  <div id="pp-brand">Programmer’s Picnic • Learn with Champak</div>
</div>

<script>
(function(){

let images=[], index=0;
let autoplay=null;
const interval=3000;

/* ---------- IMAGE COLLECTION ---------- */
function collectImages(){
  images=[...document.querySelectorAll("img")]
    .filter(img =>
      img.src &&
      !img.closest("#pp-gallery-modal") &&
      img.naturalWidth>150
    );
}

/* ---------- DISPLAY ---------- */
function show(){
  const img=images[index];
  document.getElementById("pp-modal-img").src = img.src;
  document.getElementById("pp-caption").innerHTML = img.alt || "";
}

function openModal(){
  if(!images.length) return;
  show();
  document.getElementById("pp-gallery-modal").style.display="block";
}

function closeModal(){
  stopAuto();
  document.getElementById("pp-gallery-modal").style.display="none";
}

/* ---------- NAV ---------- */
function next(manual=true){
  if(manual) stopAuto();
  index=(index+1)%images.length;
  show();
}
function prev(manual=true){
  if(manual) stopAuto();
  index=(index-1+images.length)%images.length;
  show();
}

/* ---------- AUTORUN ---------- */
function startAuto(){
  if(autoplay) return;
  autoplay=setInterval(()=>next(false), interval);
  autoBtn.innerHTML="⏸";
  autoBtn.classList.add("running");
}
function stopAuto(){
  clearInterval(autoplay);
  autoplay=null;
  autoBtn.innerHTML="▶";
  autoBtn.classList.remove("running");
}

/* ---------- DRAGGABLE BUTTON ---------- */
const btn=document.getElementById("pp-open-gallery-btn");
let dragging=false, moved=false, sx=0, sy=0, bx=0, by=0;

function startDrag(x,y){
  dragging=true;
  moved=false;
  const r=btn.getBoundingClientRect();
  btn.style.width=r.width+"px";
  btn.style.height=r.height+"px";
  btn.style.left=r.left+"px";
  btn.style.top=r.top+"px";
  btn.style.right="auto";
  btn.style.bottom="auto";
  bx=r.left; by=r.top; sx=x; sy=y;
  btn.classList.add("dragging");
}

btn.addEventListener("mousedown",e=>startDrag(e.clientX,e.clientY));
btn.addEventListener("touchstart",e=>{
  const t=e.touches[0];
  startDrag(t.clientX,t.clientY);
},{passive:true});

document.addEventListener("mousemove",e=>{
  if(!dragging) return;
  moved=true;
  btn.style.left=bx+(e.clientX-sx)+"px";
  btn.style.top =by+(e.clientY-sy)+"px";
});
document.addEventListener("touchmove",e=>{
  if(!dragging) return;
  const t=e.touches[0];
  moved=true;
  btn.style.left=bx+(t.clientX-sx)+"px";
  btn.style.top =by+(t.clientY-sy)+"px";
},{passive:true});

function endDrag(){
  dragging=false;
  btn.classList.remove("dragging");
}
document.addEventListener("mouseup",endDrag);
document.addEventListener("touchend",endDrag);

/* ---------- CLICK vs DRAG ---------- */
btn.addEventListener("click",()=>{
  if(moved) return;
  collectImages();
  index=0;
  openModal();
});

/* ---------- EVENTS ---------- */
document.getElementById("pp-close").onclick=closeModal;
document.getElementById("pp-next").onclick=()=>next(true);
document.getElementById("pp-prev").onclick=()=>prev(true);

const autoBtn=document.getElementById("pp-auto");
autoBtn.onclick=()=> autoplay ? stopAuto() : startAuto();

document.addEventListener("keydown",e=>{
  if(e.key==="Escape") closeModal();
  if(e.key==="ArrowRight") next(true);
  if(e.key==="ArrowLeft") prev(true);
});

})();
</script>
