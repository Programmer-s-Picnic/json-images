
(function () {
  "use strict";

  const defaults = {
    selector: '[id^="speak"]',
    activeClass: "pp-speaking-active",
    scrollBehavior: "smooth",
    scrollBlock: "center",
    pauseBetween: 700,
    rate: 1,
    pitch: 1,
    volume: 1,
    voiceName: "",
    controlsContainerId: "pp-auto-speak-controls-v8-3",
    readSpeak0First: true,
    addTitleButton: true,
    titleSelector: "[data-pp-speak-title]",
    miniModeDefault: false,
    whatsappEnabled: true,
    whatsappNumber: "919335874326",
    whatsappLabel: "💬 Contact Champak Roy on WhatsApp",
    whatsappMessage: "Hi Champak Roy, I am interested in your course.",
    avatarName: "Champak Roy",
    avatarSubtitle: "Live speaking guide",
    avatarUseImage: true,
    avatarImage: "https://programmer-s-picnic.github.io/json-images/mee.jpg",
    avatarImageAlt: "Champak Roy",
    storageKeyMiniMode: "ppSpeakMiniModeV83",
    storageKeyRate: "ppSpeakRateV83",
    storageKeyPitch: "ppSpeakPitchV83",
    storageKeyVoice: "ppSpeakVoiceV83"
  };

  const U = {
    num(id){ const m = String(id||"").match(/(\d+)/); return m ? parseInt(m[1],10) : Number.MAX_SAFE_INTEGER; },
    esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); },
    txt(el){ return (el.getAttribute("data-speak-text") || el.textContent || "").trim(); },
    get(k){ try { return localStorage.getItem(k); } catch { return null; } },
    set(k,v){ try { localStorage.setItem(k,v); } catch {} },
    trunc(t,n){ t=String(t||""); return t.length>n ? t.slice(0,n-1)+"…" : t; }
  };

  class PPSpeak {
    constructor(opts={}) {
      this.options = Object.assign({}, defaults, opts);
      this.items = [];
      this.state = { i: 0, running: false, paused: false, token: 0 };
      this.boundVoices = null;
    }

    init(opts={}) {
      this.options = Object.assign({}, this.options, opts);
      this.collect();
      this.injectStyle();
      this.render();
      this.restorePrefs();
      this.fillVoices();
      this.updateAll();
      this.attachTitleButton();
      if ("speechSynthesis" in window) {
        this.boundVoices = () => this.fillVoices();
        if (speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", this.boundVoices);
      }
      return this;
    }

    collect() {
      this.items = Array.from(document.querySelectorAll(this.options.selector))
        .sort((a,b)=>U.num(a.id)-U.num(b.id));
    }

    injectStyle() {
      const id = this.options.controlsContainerId + "-style";
      if (document.getElementById(id)) return;
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `
        .${this.options.activeClass}{outline:3px solid rgba(217,119,6,.28);background:rgba(245,158,11,.12)!important;border-radius:14px;box-shadow:0 10px 24px rgba(217,119,6,.12)}
        .pp-speak-title-btn{display:inline-flex;align-items:center;gap:8px;margin-left:12px;padding:10px 15px;border:none;border-radius:999px;background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 12px 28px rgba(217,119,6,.24)}
        .pp-speak-panel{position:fixed;right:14px;bottom:14px;width:min(398px,calc(100vw - 20px));z-index:99999;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#172033;background:radial-gradient(circle at top right, rgba(245,158,11,.14), transparent 28%),linear-gradient(180deg, rgba(255,255,255,.98), rgba(255,248,235,.98));border:1px solid rgba(217,119,6,.16);border-radius:24px;box-shadow:0 22px 60px rgba(15,23,42,.18);overflow:hidden;backdrop-filter:blur(12px)}
        .pp-speak-panel.mini{width:auto;max-width:calc(100vw - 16px);border-radius:999px;overflow:visible;background:transparent;border:none;box-shadow:none}
        .pp-speak-panel.mini .pp-speak-head,.pp-speak-panel.mini .pp-speak-body{display:none}
        .pp-speak-panel.mini .pp-speak-mini-row{display:grid}
        .pp-speak-mini-row{display:none;grid-template-columns:auto auto 1fr auto auto;gap:8px;align-items:center;padding:8px;background:rgba(255,255,255,.98);border:1px solid rgba(217,119,6,.16);border-radius:999px;box-shadow:0 18px 40px rgba(15,23,42,.16)}
        .pp-speak-mini-main{min-width:0;font-size:12px;color:#4b5563;line-height:1.35}
        .pp-speak-mini-main strong{display:block;color:#172033;font-size:12px;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px}
        .pp-speak-head{padding:14px 14px 10px;background:radial-gradient(circle at top right, rgba(245,158,11,.22), transparent 35%),linear-gradient(135deg, rgba(217,119,6,.12), rgba(245,158,11,.08));border-bottom:1px solid rgba(217,119,6,.10)}
        .pp-speak-topline{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:start}
        .pp-speak-kicker{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#b45309;background:rgba(255,255,255,.78);border:1px solid rgba(217,119,6,.10);border-radius:999px;padding:5px 9px;margin-bottom:8px}
        .pp-speak-title{margin:0;font-size:18px;line-height:1.15;font-weight:850;letter-spacing:-.01em}
        .pp-speak-sub{margin:5px 0 0;font-size:12px;color:#6b7280;line-height:1.45;max-width:30ch}
        .pp-speak-head-actions{display:flex;gap:7px;align-items:center}
        .pp-speak-icon-btn{width:38px;height:38px;border-radius:13px;border:1px solid rgba(217,119,6,.14);background:rgba(255,255,255,.92);color:#b45309;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 6px 16px rgba(15,23,42,.06)}
        .pp-speak-body{padding:14px;display:grid;gap:12px}
        .pp-speak-avatar-shell{display:grid;grid-template-columns:104px 1fr;gap:16px;align-items:center;background:rgba(255,255,255,.92);border:1px solid rgba(217,119,6,.10);border-radius:22px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.05)}
        .pp-speak-avatar-wrap{position:relative;width:104px;height:104px;display:grid;place-items:center;flex-shrink:0}
        .pp-speak-avatar-ring{position:absolute;inset:-7px;border-radius:50%;background:radial-gradient(circle, rgba(245,158,11,.24), rgba(245,158,11,.05) 58%, transparent 76%);opacity:.75}
        .pp-speak-panel.is-speaking .pp-speak-avatar-ring{animation:ppGlow 1.2s ease-in-out infinite}
        @keyframes ppGlow{0%{transform:scale(1)}50%{transform:scale(1.1)}100%{transform:scale(1)}}
        .pp-speak-avatar{position:relative;width:94px;height:94px;border-radius:50%;overflow:hidden;border:4px solid #fff;box-shadow:0 8px 24px rgba(0,0,0,.15), 0 0 0 6px rgba(217,119,6,.12);background:#ead7c4}
        .pp-speak-panel.is-speaking .pp-speak-avatar{animation:ppFloat 3s ease-in-out infinite}
        @keyframes ppFloat{0%{transform:translateY(0)}50%{transform:translateY(-4px)}100%{transform:translateY(0)}}
        .pp-speak-avatar-img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(1.03) contrast(1.03)}
        .pp-speak-avatar-facefx{position:absolute;inset:0;pointer-events:none}
        .pp-speak-eye-blink{position:absolute;top:35px;width:13px;height:2px;background:rgba(20,20,20,.76);border-radius:999px;opacity:0;transform:scaleY(.15)}
        .pp-speak-eye-blink.left{left:25px}.pp-speak-eye-blink.right{right:25px}
        .pp-speak-avatar.pp-blink .pp-speak-eye-blink{animation:ppBlink 5s infinite}
        @keyframes ppBlink{0%,44%,48%,100%{opacity:0;transform:scaleY(.15)}45%,47%{opacity:.95;transform:scaleY(1)}}
        .pp-speak-mouth-image{position:absolute;left:50%;top:63%;transform:translateX(-50%);width:24px;height:6px;border-radius:0 0 12px 12px;background:rgba(110,35,20,.88);box-shadow:0 0 0 1px rgba(255,255,255,.14) inset;opacity:.92}
        .pp-speak-mouth-image::after{content:"";position:absolute;left:50%;bottom:-1px;transform:translateX(-50%);width:12px;height:5px;border-radius:10px 10px 0 0;background:rgba(236,72,153,.62)}
        .pp-speak-avatar-mouth-shape{position:absolute;left:50%;top:63%;transform:translateX(-50%);width:24px;height:6px;border-radius:999px;opacity:0}
        .pp-speak-panel.is-speaking .shape-a{animation:ppShapeA .42s linear infinite}
        .pp-speak-panel.is-speaking .shape-b{animation:ppShapeB .42s linear infinite}
        .pp-speak-panel.is-speaking .shape-c{animation:ppShapeC .42s linear infinite}
        @keyframes ppShapeA{0%,100%{opacity:.92;width:22px;height:6px;top:64%;background:rgba(110,35,20,.88)}33%{opacity:.95;width:25px;height:11px;top:61%;background:rgba(110,35,20,.90)}66%{opacity:.9;width:26px;height:15px;top:58.5%;background:rgba(110,35,20,.92)}}
        @keyframes ppShapeB{0%,100%{opacity:0;width:0;height:0}30%{opacity:.9;width:16px;height:8px;top:62%;background:rgba(120,38,21,.9)}70%{opacity:.92;width:20px;height:13px;top:59.2%;background:rgba(120,38,21,.92)}}
        @keyframes ppShapeC{0%,100%{opacity:0;width:0;height:0}25%{opacity:.88;width:14px;height:14px;top:60%;border-radius:50%;background:rgba(104,31,18,.94)}65%{opacity:.9;width:17px;height:17px;top:58%;border-radius:50%;background:rgba(104,31,18,.96)}}
        .pp-speak-panel.is-speaking .pp-speak-mouth-image{animation:ppLipShadow .16s ease-in-out infinite alternate}
        .pp-speak-panel.is-paused .pp-speak-mouth-image{animation:none;height:5px;top:64%}
        @keyframes ppLipShadow{0%{opacity:.75}100%{opacity:0}}
        .pp-speak-avatar-name{font-size:20px;font-weight:700;color:#1f2937;margin:0 0 4px}
        .pp-speak-avatar-role{margin:0;color:#6b7280;font-size:14px}
        .pp-speak-avatar-caption{margin-top:10px;color:#4b5563;font-size:13px;line-height:1.5;min-height:40px}
        .pp-speak-wave{display:flex;gap:5px;align-items:flex-end;height:24px;margin-top:10px}
        .pp-speak-wave span{width:5px;height:6px;background:#d97706;border-radius:3px}
        .pp-speak-panel.is-speaking .pp-speak-wave span{animation:ppWave 1s ease-in-out infinite}
        .pp-speak-panel.is-speaking .pp-speak-wave span:nth-child(2){animation-delay:.1s}
        .pp-speak-panel.is-speaking .pp-speak-wave span:nth-child(3){animation-delay:.2s}
        .pp-speak-panel.is-speaking .pp-speak-wave span:nth-child(4){animation-delay:.3s}
        .pp-speak-panel.is-speaking .pp-speak-wave span:nth-child(5){animation-delay:.4s}
        @keyframes ppWave{0%,100%{height:6px}50%{height:20px}}
        .pp-speak-row{display:grid;gap:6px}
        .pp-speak-label{font-size:11px;color:#6b7280;font-weight:800;letter-spacing:.01em}
        .pp-speak-grid3,.pp-speak-actions,.pp-speak-actions2{display:grid;gap:10px}
        .pp-speak-grid3{grid-template-columns:1fr 1fr 1fr}
        .pp-speak-actions{grid-template-columns:repeat(3,1fr)}
        .pp-speak-actions2{grid-template-columns:repeat(2,1fr)}
        .pp-speak-select,.pp-speak-btn{border-radius:14px;border:1px solid rgba(217,119,6,.14);background:rgba(255,255,255,.96);color:#172033;font-size:13px;padding:12px;width:100%;box-sizing:border-box;outline:none}
        .pp-speak-select:focus,.pp-speak-btn:focus,.pp-speak-icon-btn:focus{box-shadow:0 0 0 3px rgba(245,158,11,.18)}
        .pp-speak-btn{cursor:pointer;font-weight:800;background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;border:none;box-shadow:0 10px 24px rgba(217,119,6,.20)}
        .pp-speak-btn.secondary{background:rgba(255,255,255,.96);color:#b45309;border:1px solid rgba(217,119,6,.14);box-shadow:none}
        .pp-speak-btn.pp-whatsapp-btn{position:relative;overflow:hidden;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;box-shadow:0 14px 30px rgba(18,140,126,.28),0 8px 18px rgba(37,211,102,.18);animation:ppWhatsappFloat 2.7s ease-in-out infinite}
        .pp-speak-btn.pp-whatsapp-btn::before{content:"";position:absolute;top:-120%;left:-40%;width:42%;height:320%;transform:rotate(24deg);background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.18) 45%,rgba(255,255,255,.42) 50%,rgba(255,255,255,.18) 55%,rgba(255,255,255,0) 100%);animation:ppWhatsappShine 3.2s linear infinite;pointer-events:none}
        .pp-whatsapp-mini{background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border:none;box-shadow:0 10px 20px rgba(18,140,126,.22);animation:ppWhatsappFloat 2.7s ease-in-out infinite}
        @keyframes ppWhatsappFloat{0%{transform:translateY(0px)}50%{transform:translateY(-6px)}100%{transform:translateY(0px)}}
        @keyframes ppWhatsappShine{0%{left:-55%}100%{left:125%}}
        .pp-speak-meta{display:grid;gap:7px;background:rgba(255,255,255,.82);border:1px solid rgba(217,119,6,.10);border-radius:14px;padding:12px}
        .pp-speak-progress{height:8px;background:rgba(217,119,6,.10);border-radius:999px;overflow:hidden}
        .pp-speak-progress-bar{height:100%;width:0%;background:linear-gradient(135deg,#d97706,#f59e0b);transition:width .3s ease}
        .pp-speak-status,.pp-speak-current{font-size:12px;color:#4b5563;line-height:1.45}
        .pp-speak-status{font-weight:700}
        .pp-hamburger svg{width:17px;height:17px;display:block}
        @media (max-width:640px){
          .pp-speak-panel{right:8px;left:8px;bottom:max(8px, env(safe-area-inset-bottom));width:auto;border-radius:20px;max-height:calc(100vh - 16px - env(safe-area-inset-bottom));overflow:auto}
          .pp-speak-head{padding:10px 10px 8px}
          .pp-speak-kicker{font-size:9px;padding:4px 8px;margin-bottom:6px}
          .pp-speak-title{font-size:16px}
          .pp-speak-sub{font-size:11px;max-width:none}
          .pp-speak-head-actions{gap:6px}
          .pp-speak-icon-btn{width:34px;height:34px;border-radius:11px}
          .pp-speak-body{padding:10px;gap:10px}
          .pp-speak-avatar-shell{grid-template-columns:72px 1fr;gap:12px;padding:12px;border-radius:18px;align-items:center}
          .pp-speak-avatar-wrap{width:72px;height:72px}
          .pp-speak-avatar{width:66px;height:66px;box-shadow:0 6px 20px rgba(0,0,0,.14),0 0 0 5px rgba(217,119,6,.10)}
          .pp-speak-eye-blink{top:24px;width:10px}
          .pp-speak-eye-blink.left{left:17px}.pp-speak-eye-blink.right{right:17px}
          .pp-speak-mouth-image,.pp-speak-avatar-mouth-shape{width:18px}
          .pp-speak-avatar-name{font-size:17px;line-height:1.08;margin-bottom:2px}
          .pp-speak-avatar-role{font-size:12px}
          .pp-speak-avatar-caption{margin-top:6px;font-size:12px;min-height:22px}
          .pp-speak-wave{margin-top:6px;height:18px;gap:4px}
          .pp-speak-wave span{width:4px}
          .pp-speak-label{font-size:10px}
          .pp-speak-select,.pp-speak-btn{padding:10px 12px;font-size:14px;min-height:46px}
          .pp-speak-grid3{grid-template-columns:1fr}
          .pp-speak-actions{grid-template-columns:1fr}
          .pp-speak-actions2{grid-template-columns:1fr 1fr}
          #pp-speak-start{order:-1}
          .pp-speak-meta{padding:10px;border-radius:12px}
          .pp-speak-status,.pp-speak-current{font-size:11px}
          .pp-speak-progress{height:7px}
          .pp-speak-panel.mini{left:auto;right:8px;bottom:max(8px, env(safe-area-inset-bottom));width:auto;max-width:calc(100vw - 16px)}
          .pp-speak-mini-row{grid-template-columns:auto auto 1fr auto auto;gap:6px;padding:6px 7px;border-radius:999px}
          .pp-speak-mini-main strong{max-width:90px}
        }
        @media (max-width:380px){
          .pp-speak-actions2{grid-template-columns:1fr}
          .pp-speak-mini-main strong{max-width:72px}
          .pp-speak-panel{border-radius:16px}
        }
      `;
      document.head.appendChild(style);
    }

    render() {
      if (this.panel) return;
      const o = this.options;
      const panel = document.createElement("div");
      panel.id = o.controlsContainerId;
      panel.className = "pp-speak-panel";
      panel.innerHTML = `
        <div class="pp-speak-head">
          <div class="pp-speak-topline">
            <div>
              <div class="pp-speak-kicker">Auto Narration V8.3</div>
              <h3 class="pp-speak-title">Speak Player</h3>
              <p class="pp-speak-sub">Reads speak paragraphs, scrolls, highlights, and shows a realistic talking face avatar.</p>
            </div>
            <div class="pp-speak-head-actions">
              <button type="button" class="pp-speak-icon-btn" id="pp-speak-mini-toggle" title="Collapse / expand panel">☰</button>
            </div>
          </div>
        </div>

        <div class="pp-speak-body">
          <div class="pp-speak-avatar-shell">
            <div class="pp-speak-avatar-wrap">
              <div class="pp-speak-avatar-ring"></div>
              <div class="pp-speak-avatar is-image pp-blink">
                <img class="pp-speak-avatar-img" src="${U.esc(o.avatarImage)}" alt="${U.esc(o.avatarImageAlt)}">
                <div class="pp-speak-avatar-facefx">
                  <div class="pp-speak-eye-blink left"></div>
                  <div class="pp-speak-eye-blink right"></div>
                  <div class="pp-speak-mouth-image"></div>
                  <div class="pp-speak-avatar-mouth-shape shape-a"></div>
                  <div class="pp-speak-avatar-mouth-shape shape-b"></div>
                  <div class="pp-speak-avatar-mouth-shape shape-c"></div>
                </div>
              </div>
            </div>
            <div class="pp-speak-avatar-meta">
              <div class="pp-speak-avatar-name">${U.esc(o.avatarName)}</div>
              <p class="pp-speak-avatar-role">${U.esc(o.avatarSubtitle)}</p>
              <div class="pp-speak-avatar-caption" id="pp-speak-avatar-caption">Waiting to start narration.</div>
              <div class="pp-speak-wave" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
            </div>
          </div>

          <div class="pp-speak-row">
            <label class="pp-speak-label" for="pp-speak-start-at">Start from</label>
            <select id="pp-speak-start-at" class="pp-speak-select"></select>
          </div>

          <div class="pp-speak-grid3">
            <div class="pp-speak-row">
              <label class="pp-speak-label" for="pp-speak-rate">Speed</label>
              <select id="pp-speak-rate" class="pp-speak-select">
                <option value="0.75">0.75x</option><option value="0.9">0.9x</option><option value="1">1x</option>
                <option value="1.1">1.1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option>
              </select>
            </div>
            <div class="pp-speak-row">
              <label class="pp-speak-label" for="pp-speak-pitch">Pitch</label>
              <select id="pp-speak-pitch" class="pp-speak-select">
                <option value="0.7">0.7</option><option value="0.85">0.85</option><option value="1">1.0</option>
                <option value="1.15">1.15</option><option value="1.3">1.3</option>
              </select>
            </div>
            <div class="pp-speak-row">
              <label class="pp-speak-label" for="pp-speak-voice">Voice</label>
              <select id="pp-speak-voice" class="pp-speak-select"><option value="">Default</option></select>
            </div>
          </div>

          <div class="pp-speak-actions">
            <button type="button" class="pp-speak-btn" id="pp-speak-start">Start</button>
            <button type="button" class="pp-speak-btn secondary" id="pp-speak-prev">Prev</button>
            <button type="button" class="pp-speak-btn secondary" id="pp-speak-next">Next</button>
          </div>

          <div class="pp-speak-actions2">
            <button type="button" class="pp-speak-btn secondary" id="pp-speak-pause">Pause</button>
            <button type="button" class="pp-speak-btn secondary" id="pp-speak-stop">Stop</button>
          </div>

          <div class="pp-speak-meta">
            <div class="pp-speak-status" id="pp-speak-status" aria-live="polite">Ready.</div>
            <div class="pp-speak-current" id="pp-speak-current">No paragraph selected.</div>
            <div class="pp-speak-progress"><div class="pp-speak-progress-bar" id="pp-speak-progress-bar"></div></div>
          </div>

          <div class="pp-speak-row">
            <button type="button" class="pp-speak-btn pp-whatsapp-btn" id="pp-whatsapp-contact">${U.esc(o.whatsappLabel)}</button>
          </div>
        </div>

        <div class="pp-speak-mini-row">
          <button type="button" class="pp-speak-icon-btn" id="pp-speak-mini-toggle-2">☰</button>
          <button type="button" class="pp-speak-icon-btn" id="pp-speak-mini-play">▶</button>
          <div class="pp-speak-mini-main">
            <strong id="pp-speak-mini-title">Ready</strong>
            <span id="pp-speak-mini-text">Tap play.</span>
          </div>
          <button type="button" class="pp-speak-icon-btn" id="pp-speak-mini-next">⏭</button>
          <button type="button" class="pp-speak-icon-btn pp-whatsapp-mini" id="pp-speak-mini-whatsapp">💬</button>
        </div>
      `;
      document.body.appendChild(panel);

      this.q("#pp-speak-start").addEventListener("click", () => {
        this.options.rate = parseFloat(this.q("#pp-speak-rate").value) || 1;
        this.options.pitch = parseFloat(this.q("#pp-speak-pitch").value) || 1;
        this.options.voiceName = this.q("#pp-speak-voice").value || "";
        this.savePrefs();
        this.start(parseInt(this.q("#pp-speak-start-at").value, 10) || 0);
      });
      this.q("#pp-speak-prev").addEventListener("click", () => this.previous());
      this.q("#pp-speak-next").addEventListener("click", () => this.next());
      this.q("#pp-speak-pause").addEventListener("click", () => this.state.paused ? this.resume() : this.pause());
      this.q("#pp-speak-stop").addEventListener("click", () => this.stop());
      this.q("#pp-speak-mini-play").addEventListener("click", () => this.state.running ? (this.state.paused ? this.resume() : this.pause()) : this.start(this.state.i || 0));
      this.q("#pp-speak-mini-next").addEventListener("click", () => this.next());
      this.q("#pp-speak-mini-toggle").addEventListener("click", () => this.toggleMini());
      this.q("#pp-speak-mini-toggle-2").addEventListener("click", () => this.toggleMini(false));
      this.q("#pp-whatsapp-contact").addEventListener("click", () => this.openWhatsApp());
      this.q("#pp-speak-mini-whatsapp").addEventListener("click", () => this.openWhatsApp());
      this.q("#pp-speak-rate").addEventListener("change", e => { this.options.rate = parseFloat(e.target.value) || 1; this.savePrefs(); });
      this.q("#pp-speak-pitch").addEventListener("change", e => { this.options.pitch = parseFloat(e.target.value) || 1; this.savePrefs(); });
      this.q("#pp-speak-voice").addEventListener("change", e => { this.options.voiceName = e.target.value || ""; this.savePrefs(); });

      if (this.options.miniModeDefault || U.get(this.options.storageKeyMiniMode) === "1") this.panel.classList.add("mini");
    }

    q(sel){ return this.panel.querySelector(sel); }

    fillVoices() {
      if (!("speechSynthesis" in window)) return;
      const select = this.q("#pp-speak-voice");
      if (!select) return;
      const voices = speechSynthesis.getVoices() || [];
      const current = this.options.voiceName || "";
      select.innerHTML = `<option value="">Default</option>` + voices.map(v => `<option value="${U.esc(v.name)}">${U.esc(v.name + (v.lang ? " (" + v.lang + ")" : ""))}</option>`).join("");
      if (current) select.value = current;
    }

    restorePrefs() {
      const r = U.get(this.options.storageKeyRate), p = U.get(this.options.storageKeyPitch), v = U.get(this.options.storageKeyVoice);
      if (r) this.options.rate = parseFloat(r) || this.options.rate;
      if (p) this.options.pitch = parseFloat(p) || this.options.pitch;
      if (v !== null) this.options.voiceName = v;
    }

    savePrefs() {
      U.set(this.options.storageKeyRate, String(this.options.rate));
      U.set(this.options.storageKeyPitch, String(this.options.pitch));
      U.set(this.options.storageKeyVoice, String(this.options.voiceName || ""));
    }

    updateAll() {
      this.q("#pp-speak-rate").value = String(this.options.rate);
      this.q("#pp-speak-pitch").value = String(this.options.pitch);
      this.q("#pp-speak-start-at").innerHTML = this.items.map((el, i) => `<option value="${i}">${U.esc(el.id + (el.id === "speak0" ? " — Introduction" : ""))}</option>`).join("");
      this.updateButtons();
      this.updateMeta("Ready.", "No paragraph selected.");
      this.updateMini("Ready", "Tap play.");
      this.updateProgress();
    }

    updateButtons() {
      const b = this.q("#pp-speak-pause");
      if (b) b.textContent = this.state.paused ? "Resume" : "Pause";
      const m = this.q("#pp-speak-mini-play");
      if (m) m.textContent = !this.state.running || this.state.paused ? "▶" : "⏸";
    }

    updateMeta(status, current) {
      this.q("#pp-speak-status").textContent = status;
      this.q("#pp-speak-current").textContent = current;
      this.q("#pp-speak-avatar-caption").textContent = current === "No paragraph selected." ? "Waiting to start narration." : current;
    }

    updateMini(title, text) {
      this.q("#pp-speak-mini-title").textContent = title;
      this.q("#pp-speak-mini-text").textContent = text;
    }

    updateProgress() {
      const bar = this.q("#pp-speak-progress-bar");
      const pct = this.state.running && this.items.length ? ((this.state.i + 1) / this.items.length) * 100 : 0;
      bar.style.width = pct + "%";
      const sel = this.q("#pp-speak-start-at");
      if (sel) sel.value = String(this.state.i);
    }

    setSpeaking(on) {
      this.panel.classList.toggle("is-speaking", !!on);
      this.panel.classList.toggle("is-paused", this.state.paused);
    }

    clearActive() { this.items.forEach(el => el.classList.remove(this.options.activeClass)); }
    markActive(el) { this.clearActive(); if (el) el.classList.add(this.options.activeClass); }

    speakIndex(i) {
      if (!this.items.length) return;
      if (i >= this.items.length) {
        this.state.running = false;
        this.state.paused = false;
        this.state.i = 0;
        this.clearActive();
        this.setSpeaking(false);
        this.updateButtons();
        this.updateMeta("Completed.", "Narration finished.");
        this.updateMini("Completed", "Narration finished.");
        this.updateProgress();
        return;
      }

      const el = this.items[i];
      const text = U.txt(el);
      if (!text) return this.speakIndex(i + 1);

      this.state.i = i;
      this.markActive(el);
      try { el.scrollIntoView({ behavior: this.options.scrollBehavior, block: this.options.scrollBlock }); } catch {}
      this.setSpeaking(true);
      this.updateButtons();
      this.updateMeta("Speaking " + el.id + "...", U.trunc(text, 110));
      this.updateMini(el.id, U.trunc(text, 40));
      this.updateProgress();

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = this.options.rate;
      utter.pitch = this.options.pitch;
      utter.volume = this.options.volume;
      const voice = this.getVoice();
      if (voice) utter.voice = voice;

      const token = ++this.state.token;
      utter.onend = () => {
        if (!this.state.running || token !== this.state.token) return;
        setTimeout(() => {
          if (!this.state.running || this.state.paused || token !== this.state.token) return;
          this.speakIndex(this.state.i + 1);
        }, this.options.pauseBetween);
      };
      utter.onerror = utter.onend;
      speechSynthesis.speak(utter);
    }

    start(i) {
      if (!("speechSynthesis" in window)) return;
      if (!this.items.length) this.collect();
      speechSynthesis.cancel();
      this.state.running = true;
      this.state.paused = false;
      if (typeof i === "number") this.state.i = Math.max(0, Math.min(i, this.items.length - 1));
      else if (this.options.readSpeak0First) {
        const idx = this.items.findIndex(el => el.id === "speak0");
        this.state.i = idx >= 0 ? idx : 0;
      } else this.state.i = 0;
      this.speakIndex(this.state.i);
    }

    next() {
      if (!this.items.length) return;
      speechSynthesis.cancel();
      this.state.running = true;
      this.state.paused = false;
      this.speakIndex(Math.min(this.state.i + 1, this.items.length - 1));
    }

    previous() {
      if (!this.items.length) return;
      speechSynthesis.cancel();
      this.state.running = true;
      this.state.paused = false;
      this.speakIndex(Math.max(this.state.i - 1, 0));
    }

    pause() {
      if (!this.state.running || this.state.paused) return;
      this.state.paused = true;
      try { speechSynthesis.pause(); } catch {}
      this.panel.classList.remove("is-speaking");
      this.panel.classList.add("is-paused");
      this.updateButtons();
      this.updateMeta("Paused.", "Narration is paused.");
    }

    resume() {
      if (!this.state.running || !this.state.paused) return;
      this.state.paused = false;
      try { speechSynthesis.resume(); } catch { this.speakIndex(this.state.i); return; }
      this.panel.classList.add("is-speaking");
      this.panel.classList.remove("is-paused");
      this.updateButtons();
      this.updateMeta("Resumed.", "Narration has resumed.");
    }

    stop() {
      try { speechSynthesis.cancel(); } catch {}
      this.state.running = false;
      this.state.paused = false;
      this.state.i = 0;
      this.clearActive();
      this.setSpeaking(false);
      this.updateButtons();
      this.updateMeta("Stopped.", "No paragraph selected.");
      this.updateMini("Ready", "Tap play.");
      this.updateProgress();
    }

    toggleMini(force) {
      const makeMini = typeof force === "boolean" ? force : !this.panel.classList.contains("mini");
      this.panel.classList.toggle("mini", makeMini);
      U.set(this.options.storageKeyMiniMode, makeMini ? "1" : "0");
    }

    openWhatsApp() {
      const n = String(this.options.whatsappNumber || "").replace(/[^\d]/g, "");
      if (!n) return;
      const msg = encodeURIComponent(this.options.whatsappMessage || "");
      window.open("https://wa.me/" + n + (msg ? "?text=" + msg : ""), "_blank", "noopener");
    }

    attachTitleButton() {
      if (!this.options.addTitleButton) return;
      const t = document.querySelector(this.options.titleSelector);
      if (!t || (t.parentNode && t.parentNode.querySelector(".pp-speak-title-btn"))) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pp-speak-title-btn";
      btn.textContent = "🔊 Start narration";
      btn.addEventListener("click", () => this.start(0));
      t.insertAdjacentElement("afterend", btn);
    }
  }

  function boot() {
    const app = new PPSpeak();
    window.PPSpeakV83 = window.PPSpeakV82 = window.PPSpeakV8 = window.PPSpeakV7 = window.PPSpeakV6 = window.PPSpeakV5 = window.PPSpeakV3 = {
      init: opts => app.init(opts),
      start: i => app.start(i),
      startFromId: id => { const i = app.items.findIndex(el => el.id === id); if (i >= 0) app.start(i); },
      stop: () => app.stop(),
      pause: () => app.pause(),
      resume: () => app.resume(),
      next: () => app.next(),
      previous: () => app.previous(),
      refresh: () => app.collect(),
      toggleMiniMode: v => app.toggleMini(v),
      openWhatsApp: () => app.openWhatsApp()
    };
    app.init();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
