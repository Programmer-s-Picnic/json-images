(function(){
"use strict";

const cfg = {
  selector:'[id^="speak"]',
  activeClass:'pp-speaking-active',
  scrollBehavior:'smooth',
  scrollBlock:'center',
  pauseBetween:700,
  rate:1,
  pitch:1,
  volume:1,
  voiceName:'',
  controlsContainerId:'pp-auto-speak-controls-v8-3-1',
  readSpeak0First:true,
  titleSelector:'[data-pp-speak-title]',
  addTitleButton:true,

  avatarName:'Champak Roy',
  avatarSubtitle:'Live speaking guide',
  avatarImage:'https://programmer-s-picnic.github.io/json-images/mee.jpg',

  whatsappNumber:'919335874326',
  whatsappLabel:'💬 Contact Champak Roy on WhatsApp',
  whatsappMessage:'Hi Champak Roy, I am interested in your course.'
};

const U = {
  num(id){
    const m = String(id||'').match(/(\d+)/);
    return m ? parseInt(m[1],10) : 999999;
  },
  txt(el){
    return (el?.getAttribute('data-speak-text') || el?.textContent || '').trim();
  }
};

class App {
  constructor(){
    this.o = {...cfg};
    this.items = [];
    this.state = {i:0, running:false, paused:false};
    this.panel = null;
  }

  init(){
    this.collect();
    this.render();
    this.bind();
    this.update();
  }

  collect(){
    this.items = [...document.querySelectorAll(this.o.selector)]
      .sort((a,b)=>U.num(a.id)-U.num(b.id));
  }

  render(){
    if(document.getElementById(this.o.controlsContainerId)) return;

    const p = document.createElement('div');
    p.id = this.o.controlsContainerId;
    p.style.position = 'fixed';
    p.style.bottom = '20px';
    p.style.right = '20px';
    p.style.background = '#fff';
    p.style.border = '2px solid #f59e0b';
    p.style.borderRadius = '14px';
    p.style.padding = '14px';
    p.style.zIndex = 99999;
    p.style.width = '260px';
    p.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';

    p.innerHTML = `
      <div style="text-align:center;">
        <img src="${this.o.avatarImage}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;">
        <div style="font-weight:bold;margin-top:6px;">${this.o.avatarName}</div>
      </div>

      <button id="pp-start" style="width:100%;margin-top:10px;">▶ Start</button>
      <button id="pp-prev" style="width:100%;margin-top:6px;">⏮ Prev</button>
      <button id="pp-next" style="width:100%;margin-top:6px;">⏭ Next</button>
      <button id="pp-pause" style="width:100%;margin-top:6px;">⏸ Pause</button>
      <button id="pp-stop" style="width:100%;margin-top:6px;">⏹ Stop</button>

      <button id="pp-wa" style="width:100%;margin-top:10px;background:#25D366;color:#fff;">
        ${this.o.whatsappLabel}
      </button>
    `;

    document.body.appendChild(p);
    this.panel = p;
  }

  bind(){
    if(!this.panel) return;

    const q = (id)=>this.panel.querySelector(id);

    q('#pp-start').onclick = ()=>this.start();
    q('#pp-prev').onclick = ()=>this.prev();
    q('#pp-next').onclick = ()=>this.next();
    q('#pp-pause').onclick = ()=>this.pause();
    q('#pp-stop').onclick = ()=>this.stop();

    q('#pp-wa').onclick = ()=>{
      window.open(
        `https://wa.me/${this.o.whatsappNumber}?text=${encodeURIComponent(this.o.whatsappMessage)}`
      );
    };
  }

  speak(i){
    if(i >= this.items.length){
      this.stop();
      return;
    }

    this.state.i = i;
    const el = this.items[i];
    const text = U.txt(el);

    el.scrollIntoView({behavior:'smooth',block:'center'});
    this.items.forEach(x=>x.classList.remove(this.o.activeClass));
    el.classList.add(this.o.activeClass);

    const u = new SpeechSynthesisUtterance(text);
    u.rate = this.o.rate;
    u.pitch = this.o.pitch;

    u.onend = ()=>{
      if(this.state.running && !this.state.paused){
        setTimeout(()=>this.speak(i+1), this.o.pauseBetween);
      }
    };

    speechSynthesis.speak(u);
  }

  start(){
    speechSynthesis.cancel();
    this.state.running = true;
    this.state.paused = false;
    this.speak(this.state.i || 0);
  }

  next(){
    speechSynthesis.cancel();
    this.speak(this.state.i + 1);
  }

  prev(){
    speechSynthesis.cancel();
    this.speak(Math.max(0, this.state.i - 1));
  }

  pause(){
    if(this.state.paused){
      speechSynthesis.resume();
      this.state.paused = false;
    } else {
      speechSynthesis.pause();
      this.state.paused = true;
    }
  }

  stop(){
    speechSynthesis.cancel();
    this.state.running = false;
    this.state.paused = false;
    this.state.i = 0;
  }

  update(){}
}

function boot(){
  const app = new App();
  app.init();
  window.PPSpeak = app;
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
}else{
  boot();
}

})();