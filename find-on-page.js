 (function () {
  "use strict";

  const cfg = {
    selector: '[id^="speak"]',
    activeClass: "pp-speaking-active",
    scrollBehavior: "smooth",
    scrollBlock: "center",
    pauseBetween: 180,
    rate: 1.12,
    pitch: 1,
    volume: 1,
    voiceName: "",
    controlsContainerId: "pp-auto-speak-controls-v9-ultra-fix",
    readSpeak0First: true,
    titleSelector: "[data-pp-speak-title]",
    addTitleButton: true,
    autoScrollOffset: 0,
    skipHidden: false,
    autoRefreshOnMutation: true,

    avatarName: "Champak Roy",
    avatarSubtitle: "Ultra live speaking guide",
    avatarImage: "https://programmer-s-picnic.github.io/json-images/mee.jpg",

    whatsappNumber: "919335874326",
    whatsappLabel: "💬 Contact Champak Roy on WhatsApp",
    whatsappMessage: "Hi Champak Roy, I am interested in your course.",

    storageMiniKey: "pp_v9_ultra_fix_mini_center_v10",
    storagePositionKey: "pp_v9_ultra_fix_position_center_v10",
    storageRateKey: "pp_v9_ultra_fix_rate",
    storagePitchKey: "pp_v9_ultra_fix_pitch",
    storageVoiceKey: "pp_v9_ultra_fix_voice",
    storageThemeKey: "pp_v9_ultra_fix_theme"
  };

  const U = {
    getNumericSpeakIndex(id) {
      const m = String(id || "").match(/^speak(\d+)$/i);
      return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
    },

    getSpeakText(el) {
      if (!el) return "";
      const dataSpeak = el.getAttribute("data-speak-text");
      if (dataSpeak && dataSpeak.trim()) return dataSpeak.trim().replace(/\s+/g, " ");
      return (el.textContent || "").trim().replace(/\s+/g, " ");
    },

    isActuallyHidden(el) {
      if (!el) return true;
      const cs = window.getComputedStyle(el);
      return cs.display === "none" || cs.visibility === "hidden" || el.hidden;
    },

    isValidSpeakNode(el, skipHidden) {
      if (!el || !el.id || !/^speak\d+$/i.test(el.id)) return false;
      if (skipHidden && U.isActuallyHidden(el)) return false;
      return U.getSpeakText(el).length > 0;
    },

    save(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    },

    load(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },

    clamp(n, min, max) {
      return Math.max(min, Math.min(max, n));
    }
  };

  class App {
    constructor() {
      this.o = { ...cfg };
      this.items = [];
      this.voiceCache = [];
      this.panel = null;
      this.dragHandle = null;
      this.mutationObserver = null;
      this.isProgrammaticDomChange = false;
      this.pendingNextTimer = null;
      this.refreshDebounce = null;

      this.state = {
        i: 0,
        running: false,
        paused: false,
        utterance: null,
        mini: false,
        dragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
        theme: "light"
      };

      this.boundMouseMove = null;
      this.boundMouseUp = null;
      this.boundTouchMove = null;
      this.boundTouchEnd = null;
      this.boundVoicesChanged = null;
      this.boundResize = null;
      this.boundVisibility = null;
    }

    init(userOptions = {}) {
      this.o = { ...this.o, ...userOptions };

      const savedRate = U.load(this.o.storageRateKey, null);
      const savedPitch = U.load(this.o.storagePitchKey, null);
      const savedVoice = U.load(this.o.storageVoiceKey, null);
      const savedTheme = U.load(this.o.storageThemeKey, "light");

      if (typeof savedRate === "number") this.o.rate = savedRate;
      if (typeof savedPitch === "number") this.o.pitch = savedPitch;
      if (typeof savedVoice === "string") this.o.voiceName = savedVoice;
      if (typeof savedTheme === "string") this.state.theme = savedTheme;

      this.collectSpeakItems();
      this.injectStyle();
      this.render();
      this.restoreMiniState();
      this.restorePosition();
      this.bindVoices();
      this.enforcePreferredVoice();
      this.bind();
      this.startMutationWatch();
      this.update();
      return this;
    }

    injectStyle() {
      const styleId = this.o.controlsContainerId + "-style";
      if (document.getElementById(styleId)) return;

      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .${this.o.activeClass}{
          outline:3px solid rgba(217,119,6,.28);
          background:rgba(245,158,11,.10)!important;
          border-radius:16px;
          box-shadow:0 10px 24px rgba(217,119,6,.12);
          transition:all .18s ease;
        }

        .pp-v9uf-panel{
          --pp-bg:#fff8ef;
          --pp-bg2:#fff3df;
          --pp-text:#1f2937;
          --pp-muted:#6b7280;
          --pp-btn:#ffffff;
          --pp-brand:#d97706;
          --pp-brand2:#f59e0b;
          --pp-chip-bg:#ffedd5;
          --pp-shadow:0 16px 38px rgba(0,0,0,.18);
          position:fixed;
          left:50%;
          top:50%;
          right:auto;
          bottom:auto;
          transform:translate(-50%,-50%);
          width:350px;
          max-width:calc(100vw - 20px);
          z-index:99999;
          background:linear-gradient(180deg,var(--pp-bg),var(--pp-bg2));
          color:var(--pp-text);
          border:1px solid rgba(245,158,11,.8);
          border-radius:18px;
          padding:14px;
          box-shadow:var(--pp-shadow);
          font-family:Arial,sans-serif;
          backdrop-filter:blur(10px);
        }

        .pp-v9uf-panel.pp-dark{
          --pp-bg:#111827;
          --pp-bg2:#0f172a;
          --pp-text:#f8fafc;
          --pp-muted:#cbd5e1;
          --pp-btn:#1e293b;
          --pp-brand:#f59e0b;
          --pp-brand2:#fb923c;
          --pp-chip-bg:#1f2937;
          --pp-shadow:0 16px 38px rgba(0,0,0,.34);
        }

        .pp-v9uf-panel.pp-mini{
          width:58px;
          min-width:58px;
          max-width:58px;
          height:58px;
          padding:8px;
          border-radius:999px;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .pp-v9uf-topbar{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:8px;
          margin-bottom:10px;
        }

        .pp-v9uf-topbar-left{
          display:flex;
          align-items:center;
          gap:8px;
          min-width:0;
        }

        .pp-v9uf-chip{
          font-size:11px;
          font-weight:800;
          color:var(--pp-brand);
          background:var(--pp-chip-bg);
          border:1px solid rgba(245,158,11,.45);
          padding:6px 9px;
          border-radius:999px;
          white-space:nowrap;
          letter-spacing:.4px;
        }

        .pp-v9uf-topbar-actions{
          display:flex;
          gap:6px;
          flex-shrink:0;
        }

        .pp-v9uf-icon-btn{
          width:34px;
          height:34px;
          border:none;
          border-radius:10px;
          background:var(--pp-btn);
          color:var(--pp-brand);
          font-weight:800;
          cursor:pointer;
          box-shadow:0 2px 10px rgba(0,0,0,0.08);
        }

        .pp-v9uf-panel button,
        .pp-v9uf-panel select,
        .pp-v9uf-panel input[type="range"]{
          outline:none;
          transition:box-shadow .18s ease, transform .18s ease, border-color .18s ease, background .18s ease;
        }

        .pp-v9uf-panel button:focus-visible,
        .pp-v9uf-panel select:focus-visible,
        .pp-v9uf-panel input[type="range"]:focus-visible{
          outline:4px solid rgba(245,158,11,.36);
          outline-offset:3px;
          box-shadow:0 0 0 7px rgba(245,158,11,.16), 0 10px 24px rgba(217,119,6,.20);
          border-color:rgba(217,119,6,.95);
          transform:translateY(-1px);
        }

        .pp-v9uf-panel button:focus-visible{
          background:linear-gradient(135deg, rgba(255,255,255,.98), rgba(255,237,213,.98));
        }

        .pp-v9uf-panel.pp-dark button:focus-visible{
          background:linear-gradient(135deg, rgba(30,41,59,.98), rgba(251,146,60,.18));
        }

        .pp-v9uf-panel input[type="range"]:focus-visible{
          transform:none;
        }

        .pp-v9uf-panel:focus-within{
          box-shadow:0 0 0 5px rgba(245,158,11,.12), var(--pp-shadow);
        }

        .pp-v9uf-drag-btn{
          cursor:grab;
          touch-action:none;
        }

        .pp-v9uf-main{
          display:block;
        }

        .pp-v9uf-panel.pp-mini .pp-v9uf-main{
          display:none;
        }

        .pp-v9uf-mini-bar{
          display:none;
          align-items:center;
          gap:8px;
          width:100%;
        }

        .pp-v9uf-panel.pp-mini .pp-v9uf-mini-bar{
          display:flex;
          width:auto;
          justify-content:center;
        }

        .pp-v9uf-panel.pp-mini .pp-v9uf-topbar,
        .pp-v9uf-panel.pp-mini .pp-v9uf-mini-title,
        .pp-v9uf-panel.pp-mini #pp-mini-next,
        .pp-v9uf-panel.pp-mini #pp-mini-toggle{
          display:none;
        }

        .pp-v9uf-panel.pp-mini #pp-mini-restore{
          width:42px;
          height:42px;
          border-radius:999px;
          font-size:20px;
        }

        .pp-v9uf-mini-title{
          min-width:0;
          flex:1;
          font-size:12px;
          color:var(--pp-muted);
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        #pp-mini-toggle{
          flex-shrink:0;
        }

        .pp-v9uf-avatar-row{
          display:flex;
          gap:12px;
          align-items:center;
          margin-bottom:12px;
        }

        .pp-v9uf-avatar-wrap{
          position:relative;
          width:76px;
          height:76px;
          border-radius:50%;
          flex-shrink:0;
        }

        .pp-v9uf-avatar-glow{
          position:absolute;
          inset:-8px;
          border-radius:50%;
          background:radial-gradient(circle, rgba(245,158,11,.55), rgba(245,158,11,.15) 45%, transparent 72%);
          opacity:.3;
          transform:scale(1);
          transition:opacity .16s ease;
          pointer-events:none;
        }

        .pp-v9uf-panel.pp-speaking .pp-v9uf-avatar-glow{
          opacity:1;
          animation:ppV9UFGlow .85s ease-in-out infinite;
        }

        @keyframes ppV9UFGlow{
          0%{ transform:scale(1); }
          50%{ transform:scale(1.18); }
          100%{ transform:scale(1); }
        }

        .pp-v9uf-avatar-img{
          position:relative;
          z-index:1;
          width:76px;
          height:76px;
          border-radius:50%;
          object-fit:cover;
          border:3px solid #fff;
          box-shadow:0 0 0 4px rgba(245,158,11,.18), 0 10px 20px rgba(0,0,0,.16);
          display:block;
          transition:transform .12s ease;
        }

        .pp-v9uf-panel.pp-dark .pp-v9uf-avatar-img{
          border-color:#1f2937;
        }

        .pp-v9uf-panel.pp-speaking .pp-v9uf-avatar-img{
          animation:ppV9UFBreath .8s ease-in-out infinite;
        }

        @keyframes ppV9UFBreath{
          0%{ transform:scale(1); }
          50%{ transform:scale(1.06); }
          100%{ transform:scale(1); }
        }

        .pp-v9uf-mouth{
          position:absolute;
          left:53%;
          bottom:24px;
          width:4px;
          height:4px;
          transform:translateX(-50%);
          background:rgba(198, 134, 102, 0.05);
          border-radius:0 0 18px 18px;
          z-index:2;
          opacity:.95;
          box-shadow:0 1px 0 rgba(255,255,255,.15) inset;
        }

        .pp-v9uf-panel.pp-speaking .pp-v9uf-mouth{
          animation:ppV9UFMouth .22s ease-in-out infinite alternate;
        }

        @keyframes ppV9UFMouth{
          from{ height:4px; width:4px; border-radius:0 0 14px 14px; }
          to{ height:6px; width:6px; border-radius:0 0 20px 20px; }
        }

        .pp-v9uf-avatar-text{
          min-width:0;
          flex:1;
        }

        .pp-v9uf-avatar-name{
          font-weight:800;
          font-size:20px;
          color:var(--pp-text);
          margin:0 0 3px;
        }

        .pp-v9uf-avatar-sub{
          font-size:13px;
          color:var(--pp-muted);
          margin:0 0 6px;
        }

        .pp-v9uf-caption{
          font-size:12px;
          color:var(--pp-muted);
          margin-top:4px;
          line-height:1.45;
        }

        .pp-v9uf-wave{
          display:flex;
          align-items:flex-end;
          gap:3px;
          height:24px;
          margin-top:8px;
        }

        .pp-v9uf-wave span{
          width:5px;
          height:6px;
          border-radius:999px;
          background:linear-gradient(180deg,var(--pp-brand2),var(--pp-brand));
          opacity:.9;
        }

        .pp-v9uf-panel.pp-speaking .pp-v9uf-wave span:nth-child(1){ animation:ppV9UFWave .55s infinite ease-in-out; }
        .pp-v9uf-panel.pp-speaking .pp-v9uf-wave span:nth-child(2){ animation:ppV9UFWave .42s infinite ease-in-out .04s; }
        .pp-v9uf-panel.pp-speaking .pp-v9uf-wave span:nth-child(3){ animation:ppV9UFWave .50s infinite ease-in-out .08s; }
        .pp-v9uf-panel.pp-speaking .pp-v9uf-wave span:nth-child(4){ animation:ppV9UFWave .38s infinite ease-in-out .03s; }
        .pp-v9uf-panel.pp-speaking .pp-v9uf-wave span:nth-child(5){ animation:ppV9UFWave .47s infinite ease-in-out .07s; }

        @keyframes ppV9UFWave{
          0%{ height:6px; opacity:.55; }
          50%{ height:24px; opacity:1; }
          100%{ height:8px; opacity:.6; }
        }

        .pp-v9uf-label{
          display:block;
          font-size:12px;
          font-weight:800;
          margin:10px 0 6px;
          color:var(--pp-muted);
        }

        .pp-v9uf-select,
        .pp-v9uf-range{
          width:100%;
          padding:10px;
          border-radius:10px;
          border:1px solid rgba(245,158,11,.35);
          margin-bottom:8px;
          background:var(--pp-btn);
          color:var(--pp-text);
        }

        .pp-v9uf-range-wrap{
          display:grid;
          grid-template-columns:1fr auto;
          gap:8px;
          align-items:center;
          margin-bottom:6px;
        }

        .pp-v9uf-range-value{
          font-size:12px;
          font-weight:800;
          color:var(--pp-brand);
          min-width:42px;
          text-align:right;
        }

        .pp-v9uf-buttons{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:8px;
          margin-top:8px;
        }

        .pp-v9uf-btn{
          padding:11px 10px;
          border-radius:12px;
          font-weight:800;
          cursor:pointer;
          border:1px solid rgba(245,158,11,.35);
          background:var(--pp-btn);
          color:var(--pp-brand);
        }

        .pp-v9uf-btn-primary{
          border:none;
          background:linear-gradient(135deg,var(--pp-brand),var(--pp-brand2));
          color:#fff;
        }

        .pp-v9uf-btn-wa{
          border:none;
          background:linear-gradient(135deg,#25D366,#128C7E);
          color:#fff;
          grid-column:1 / -1;
        }

        .pp-v9uf-btn-wide{
          grid-column:1 / -1;
        }

        .pp-v9uf-status{
          margin-top:12px;
          font-size:12px;
          color:var(--pp-muted);
          line-height:1.5;
        }

        .pp-v9uf-progress{
          margin-top:10px;
          height:10px;
          background:rgba(148,163,184,.20);
          border-radius:999px;
          overflow:hidden;
        }

        .pp-v9uf-progress-bar{
          height:100%;
          width:0%;
          background:linear-gradient(90deg,var(--pp-brand),var(--pp-brand2));
          border-radius:999px;
          transition:width .16s ease;
        }

        @media (max-width:640px){
          .pp-v9uf-panel{
            width:min(350px, calc(100vw - 20px)) !important;
            max-width:calc(100vw - 20px) !important;
          }

          .pp-v9uf-panel.pp-mini{
            width:58px !important;
            min-width:58px !important;
            max-width:58px !important;
            height:58px !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    collectSpeakItems() {
      const raw = Array.from(document.querySelectorAll(this.o.selector));

      this.items = raw
        .filter(el => U.isValidSpeakNode(el, this.o.skipHidden))
        .sort((a, b) => U.getNumericSpeakIndex(a.id) - U.getNumericSpeakIndex(b.id));

      if (this.o.readSpeak0First) {
        const i0 = this.items.findIndex(el => String(el.id).toLowerCase() === "speak0");
        if (i0 > 0) {
          const node = this.items.splice(i0, 1)[0];
          this.items.unshift(node);
        }
      }

      return this.items;
    }

    refreshSpeakItems(silent = false) {
      const currentId = this.items[this.state.i] ? this.items[this.state.i].id : null;

      this.collectSpeakItems();

      if (currentId) {
        const newIndex = this.items.findIndex(el => el.id === currentId);
        if (newIndex >= 0) this.state.i = newIndex;
      }

      if (this.state.i >= this.items.length) {
        this.state.i = Math.max(0, this.items.length - 1);
      }

      this.withDomMute(() => {
        this.updateStartDropdown();
        this.updateProgress();
      });

      if (!silent) {
        const preferred = this.getPreferredIndianMaleVoice();
        this.setStatus(
          preferred
            ? `Detected ${this.items.length} speak tag(s). Using ${preferred.name}.`
            : `Detected ${this.items.length} speak tag(s). Preferred English Indian male voice not found.`
        );
      }
    }

    render() {
      if (document.getElementById(this.o.controlsContainerId)) {
        this.panel = document.getElementById(this.o.controlsContainerId);
        this.dragHandle = this.panel.querySelector("#pp-drag");
        return;
      }

      const titleBtn = this.o.addTitleButton
        ? `<button id="pp-title" class="pp-v9uf-btn pp-v9uf-btn-wide" aria-label="Read page title">Read title</button>`
        : "";

      const p = document.createElement("div");
      p.id = this.o.controlsContainerId;
      p.className = "pp-v9uf-panel";

      p.innerHTML = `
        <div class="pp-v9uf-topbar">
          <div class="pp-v9uf-topbar-left">
          <br><br>
            <div class="pp-v9uf-chip">Champak Speak</div>
          </div>
          <div class="pp-v9uf-topbar-actions">
            <button id="pp-theme" class="pp-v9uf-icon-btn" title="Theme" aria-label="Change theme">◐</button>
            <button id="pp-drag" class="pp-v9uf-icon-btn pp-v9uf-drag-btn" title="Drag panel" aria-label="Drag speak panel">⠿</button>
            <button id="pp-toggle" class="pp-v9uf-icon-btn" title="Minimize / Restore" aria-label="Minimize or restore speak panel">—</button>
          </div>
        </div>

        <div class="pp-v9uf-mini-bar">
          <button id="pp-mini-restore" class="pp-v9uf-icon-btn" title="Open Champak Speak" aria-label="Open Champak Speak">🔊</button>
          <div class="pp-v9uf-mini-title" id="pp-mini-title">Ready</div>
          <button id="pp-mini-next" class="pp-v9uf-icon-btn" title="Next" aria-label="Go to next speak section">⏭</button>
          <button id="pp-mini-toggle" class="pp-v9uf-icon-btn" title="Minimize / Restore" aria-label="Minimize or restore speak panel">☰</button>
        </div>

        <div class="pp-v9uf-main">
          <div class="pp-v9uf-avatar-row">
            <div class="pp-v9uf-avatar-wrap">
              <div class="pp-v9uf-avatar-glow"></div>
              <img class="pp-v9uf-avatar-img" src="${this.o.avatarImage}" alt="Avatar" />
              <div class="pp-v9uf-mouth"></div>
            </div>
            <div class="pp-v9uf-avatar-text">
              <div class="pp-v9uf-avatar-name">${this.o.avatarName}</div>
              <div class="pp-v9uf-avatar-sub">${this.o.avatarSubtitle}</div>
              <div id="pp-caption" class="pp-v9uf-caption">Waiting to start narration.</div>
              <div class="pp-v9uf-wave" aria-hidden="true">
                <span></span><span></span><span></span><span></span><span></span>
              </div>
            </div>
          </div>

          <label for="pp-start-from" class="pp-v9uf-label">Start from</label>
          <select id="pp-start-from" class="pp-v9uf-select"></select>

          <label for="pp-voice" id="pp-voice-label" class="pp-v9uf-label">Voice</label>
          <select id="pp-voice" class="pp-v9uf-select"></select>

          <label class="pp-v9uf-label">Rate</label>
          <div class="pp-v9uf-range-wrap">
            <input id="pp-rate" type="range" min="0.7" max="2" step="0.01" class="pp-v9uf-range" />
            <div id="pp-rate-value" class="pp-v9uf-range-value">1.00x</div>
          </div>

          <label class="pp-v9uf-label">Pitch</label>
          <div class="pp-v9uf-range-wrap">
            <input id="pp-pitch" type="range" min="0.5" max="2" step="0.01" class="pp-v9uf-range" />
            <div id="pp-pitch-value" class="pp-v9uf-range-value">1.00</div>
          </div>

          <div class="pp-v9uf-buttons">
            ${titleBtn}
            <button id="pp-start" class="pp-v9uf-btn pp-v9uf-btn-primary" aria-label="Start narration">Start</button>
            <button id="pp-pause" class="pp-v9uf-btn" aria-label="Pause or resume narration">Pause</button>
            <button id="pp-prev" class="pp-v9uf-btn" aria-label="Previous speak section">Prev</button>
            <button id="pp-next" class="pp-v9uf-btn" aria-label="Next speak section">Next</button>
            <button id="pp-stop" class="pp-v9uf-btn" aria-label="Stop narration">Stop</button>
            <button id="pp-refresh" class="pp-v9uf-btn" aria-label="Refresh speak tags">Refresh</button>
            <button id="pp-wa" class="pp-v9uf-btn pp-v9uf-btn-wa" aria-label="Contact Champak Roy on WhatsApp">${this.o.whatsappLabel}</button>
          </div>

          <div class="pp-v9uf-progress">
            <div id="pp-progress-bar" class="pp-v9uf-progress-bar"></div>
          </div>

          <div id="pp-status" class="pp-v9uf-status">Detected ${this.items.length} speak tag(s).</div>
        </div>
      `;

      document.body.appendChild(p);
      this.panel = p;
      this.dragHandle = this.panel.querySelector("#pp-drag");
      this.applyTheme();
      this.withDomMute(() => {
        this.updateStartDropdown();
        this.populateVoiceDropdown();
        this.syncRangeUI();
      });
    }

    q(sel) {
      return this.panel ? this.panel.querySelector(sel) : null;
    }

    withDomMute(fn) {
      this.isProgrammaticDomChange = true;
      try {
        fn();
      } finally {
        clearTimeout(this._domMuteTimer);
        this._domMuteTimer = setTimeout(() => {
          this.isProgrammaticDomChange = false;
        }, 60);
      }
    }

    bindVoices() {
      if (!("speechSynthesis" in window)) return;
      this.voiceCache = speechSynthesis.getVoices() || [];
      this.boundVoicesChanged = () => {
        this.voiceCache = speechSynthesis.getVoices() || [];
        this.enforcePreferredVoice();
        this.withDomMute(() => this.populateVoiceDropdown());
      };
      speechSynthesis.addEventListener("voiceschanged", this.boundVoicesChanged);
    }

    getVoices() {
      const voices = this.voiceCache.length
        ? this.voiceCache
        : (speechSynthesis.getVoices() || []);

      return voices.slice().sort((a, b) => {
        const aScore = /en_IN/i.test(a.lang || "") ? 0 : /en/i.test(a.lang || "") ? 1 : 2;
        const bScore = /en_IN/i.test(b.lang || "") ? 0 : /en/i.test(b.lang || "") ? 1 : 2;
        if (aScore !== bScore) return aScore - bScore;
        return String(a.name).localeCompare(String(b.name));
      });
    }

    getPreferredIndianMaleVoice() {
      const voices = this.getVoices();
      if (!voices.length) return null;

      const scoreVoice = (v) => {
        const name = String(v.name || "").toLowerCase();
        const lang = String(v.lang || "").toLowerCase();

        let score = 0;

        if (lang === "en_in") score += 100;
        else if (lang.startsWith("en_in")) score += 95;
        else if (lang === "en-in") score += 100;
        else if (lang.startsWith("en-in")) score += 95;
        else if (lang.startsWith("en")) score += 40;

        if (name.includes("male")) score += 40;
        if (name.includes("man")) score += 25;
        if (name.includes("india")) score += 20;
        if (name.includes("indian")) score += 20;

        if (name.includes("rahul")) score += 30;
        if (name.includes("aditya")) score += 25;
        if (name.includes("arjun")) score += 25;
        if (name.includes("rishi")) score += 25;
        if (name.includes("prabhat")) score += 25;

        if (name.includes("female")) score -= 40;
        if (name.includes("woman")) score -= 25;
        if (name.includes("zira")) score -= 20;
        if (name.includes("susan")) score -= 20;
        if (name.includes("hazel")) score -= 20;
        if (name.includes("heera")) score -= 20;

        return score;
      };

      const ranked = voices
        .map(v => ({ voice: v, score: scoreVoice(v) }))
        .sort((a, b) => b.score - a.score);

      const best = ranked[0] ? ranked[0].voice : null;
      if (!best) return null;

      const bestLang = String(best.lang || "").toLowerCase();
      if (!(bestLang.startsWith("en_in") || bestLang.startsWith("en-in"))) return null;

      return best;
    }

    enforcePreferredVoice() {
      const preferred = this.getPreferredIndianMaleVoice();
      if (!preferred) return false;

      this.o.voiceName = preferred.name;
      U.save(this.o.storageVoiceKey, preferred.name);

      const select = this.q("#pp-voice");
      if (select) {
        select.value = preferred.name;
      }

      return true;
    }

    populateVoiceDropdown() {
      const select = this.q("#pp-voice");
      const label = this.q("#pp-voice-label");
      if (!select) return;

      const voices = this.getVoices();
      const preferred = this.getPreferredIndianMaleVoice();

      select.innerHTML = "";

      if (preferred) {
        this.o.voiceName = preferred.name;
        U.save(this.o.storageVoiceKey, preferred.name);

        const opt = document.createElement("option");
        opt.value = preferred.name;
        opt.textContent = `${preferred.name} (${preferred.lang})`;
        select.appendChild(opt);
        select.value = preferred.name;

        select.disabled = true;
        select.style.display = "none";
        if (label) label.style.display = "none";
      } else {
        if (label) label.style.display = "";

        const autoOpt = document.createElement("option");
        autoOpt.value = "";
        autoOpt.textContent = "Select a voice";
        select.appendChild(autoOpt);

        voices.forEach(v => {
          const opt = document.createElement("option");
          opt.value = v.name;
          opt.textContent = `${v.name} (${v.lang})`;
          select.appendChild(opt);
        });

        select.disabled = false;
        select.style.display = "";
        const hasSaved = voices.some(v => v.name === this.o.voiceName);
        select.value = hasSaved ? this.o.voiceName : "";
      }
    }

    updateStartDropdown() {
      const select = this.q("#pp-start-from");
      if (!select) return;

      const currentValue = String(this.state.i);
      select.innerHTML = "";

      if (!this.items.length) {
        const opt = document.createElement("option");
        opt.value = "0";
        opt.textContent = "No speak tags found";
        select.appendChild(opt);
      } else {
        this.items.forEach((el, idx) => {
          const opt = document.createElement("option");
          opt.value = String(idx);
          opt.textContent = `${el.id} — ${U.getSpeakText(el).slice(0, 48)}`;
          select.appendChild(opt);
        });

        select.value = currentValue;
      }

      const miniTitle = this.q("#pp-mini-title");
      if (miniTitle) {
        miniTitle.textContent = this.items[this.state.i]
          ? `${this.items[this.state.i].id}`
          : "Ready";
      }
    }

    syncRangeUI() {
      const rate = this.q("#pp-rate");
      const pitch = this.q("#pp-pitch");
      const rateValue = this.q("#pp-rate-value");
      const pitchValue = this.q("#pp-pitch-value");

      if (rate) rate.value = String(this.o.rate);
      if (pitch) pitch.value = String(this.o.pitch);
      if (rateValue) rateValue.textContent = `${Number(this.o.rate).toFixed(2)}x`;
      if (pitchValue) pitchValue.textContent = Number(this.o.pitch).toFixed(2);
    }

    bind() {
      if (!this.panel) return;

      this.q("#pp-title")?.addEventListener("click", () => this.readTitle());
      this.q("#pp-theme")?.addEventListener("click", () => this.toggleTheme());

      this.q("#pp-start")?.addEventListener("click", () => {
        this.refreshSpeakItems(true);
        const selected = parseInt(this.q("#pp-start-from")?.value || "0", 10) || 0;
        this.start(selected);
      });

      this.q("#pp-prev")?.addEventListener("click", () => {
        this.refreshSpeakItems(true);
        this.previous();
      });

      this.q("#pp-next")?.addEventListener("click", () => {
        this.refreshSpeakItems(true);
        this.next();
      });

      this.q("#pp-mini-next")?.addEventListener("click", () => {
        this.refreshSpeakItems(true);
        this.next();
      });

      this.q("#pp-pause")?.addEventListener("click", () => {
        if (this.state.paused) this.resume();
        else this.pause();
      });

      this.q("#pp-stop")?.addEventListener("click", () => this.stop());

      this.q("#pp-refresh")?.addEventListener("click", () => {
        this.refreshSpeakItems();
      });

      this.q("#pp-wa")?.addEventListener("click", () => {
        const url = `https://wa.me/${this.o.whatsappNumber}?text=${encodeURIComponent(this.o.whatsappMessage)}`;
        window.open(url, "_blank", "noopener");
      });

      this.q("#pp-toggle")?.addEventListener("click", () => this.toggleMini());
      this.q("#pp-mini-restore")?.addEventListener("click", () => this.toggleMini(false));
      this.q("#pp-mini-toggle")?.addEventListener("click", () => this.toggleMini(false));

      this.q("#pp-voice")?.addEventListener("change", (e) => {
        const preferred = this.getPreferredIndianMaleVoice();
        if (preferred) {
          this.o.voiceName = preferred.name;
          U.save(this.o.storageVoiceKey, preferred.name);
          if (e && e.target) e.target.value = preferred.name;
        } else {
          this.o.voiceName = e.target.value || "";
          U.save(this.o.storageVoiceKey, this.o.voiceName);
        }
      });

      this.q("#pp-rate")?.addEventListener("input", (e) => {
        this.o.rate = U.clamp(parseFloat(e.target.value || "1"), 0.7, 2);
        U.save(this.o.storageRateKey, this.o.rate);
        this.syncRangeUI();
      });

      this.q("#pp-pitch")?.addEventListener("input", (e) => {
        this.o.pitch = U.clamp(parseFloat(e.target.value || "1"), 0.5, 2);
        U.save(this.o.storagePitchKey, this.o.pitch);
        this.syncRangeUI();
      });

      this.enableDragging();

      this.boundResize = () => {
        if (!this.panel) return;

        if (window.innerWidth <= 640) {
          this.centerPanel();
        } else {
          this.restorePosition();
        }
      };
      window.addEventListener("resize", this.boundResize);

      this.boundVisibility = () => {
        if (document.hidden && this.state.running && !this.state.paused) {
          this.pause();
        }
      };
      document.addEventListener("visibilitychange", this.boundVisibility);

      document.addEventListener("keydown", (e) => {
        if (e.altKey && e.key === "s") {
          e.preventDefault();
          if (this.state.running && !this.state.paused) this.pause();
          else if (this.state.running && this.state.paused) this.resume();
          else this.start(this.state.i || 0);
        } else if (e.altKey && e.key === "ArrowRight") {
          e.preventDefault();
          this.next();
        } else if (e.altKey && e.key === "ArrowLeft") {
          e.preventDefault();
          this.previous();
        } else if (e.altKey && e.key === "x") {
          e.preventDefault();
          this.stop();
        }
      });
    }

    startMutationWatch() {
      if (!this.o.autoRefreshOnMutation || !("MutationObserver" in window)) return;

      this.mutationObserver = new MutationObserver((mutations) => {
        if (this.isProgrammaticDomChange) return;

        let shouldRefresh = false;

        for (const m of mutations) {
          if (m.type === "childList") {
            shouldRefresh = true;
            break;
          }

          if (m.type === "characterData") {
            const parent = m.target && m.target.parentElement;
            if (parent && parent.closest && parent.closest(this.o.selector)) {
              shouldRefresh = true;
              break;
            }
          }

          if (m.type === "attributes") {
            const target = m.target;
            if (target === this.panel || (this.panel && this.panel.contains(target))) {
              continue;
            }

            if (
              target &&
              target.matches &&
              (
                target.matches(this.o.selector) ||
                target.closest(this.o.selector)
              )
            ) {
              shouldRefresh = true;
              break;
            }
          }
        }

        if (!shouldRefresh) return;

        clearTimeout(this.refreshDebounce);
        this.refreshDebounce = setTimeout(() => {
          this.refreshSpeakItems(true);
        }, 180);
      });

      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["id", "data-speak-text", "hidden", "style", "class"]
      });
    }

    enableDragging() {
      if (!this.dragHandle || !this.panel) return;

      const moveTo = (clientX, clientY) => {
        if (!this.state.dragging || window.innerWidth <= 640) return;

        const x = clientX - this.state.dragOffsetX;
        const y = clientY - this.state.dragOffsetY;

        const maxX = Math.max(0, window.innerWidth - this.panel.offsetWidth);
        const maxY = Math.max(0, window.innerHeight - this.panel.offsetHeight);

        const finalX = Math.max(0, Math.min(maxX, x));
        const finalY = Math.max(0, Math.min(maxY, y));

        this.panel.style.left = finalX + "px";
        this.panel.style.top = finalY + "px";
        this.panel.style.right = "auto";
        this.panel.style.bottom = "auto";
        this.panel.style.transform = "none";
      };

      this.boundMouseMove = (e) => moveTo(e.clientX, e.clientY);
      this.boundMouseUp = () => this.stopDragging();

      this.boundTouchMove = (e) => {
        if (!e.touches || !e.touches[0]) return;
        e.preventDefault();
        moveTo(e.touches[0].clientX, e.touches[0].clientY);
      };

      this.boundTouchEnd = () => this.stopDragging();

      this.dragHandle.addEventListener("mousedown", (e) => {
        if (window.innerWidth <= 640) return;
        this.startDragging(e.clientX, e.clientY);
        document.addEventListener("mousemove", this.boundMouseMove);
        document.addEventListener("mouseup", this.boundMouseUp, { once: true });
      });

      this.dragHandle.addEventListener("touchstart", (e) => {
        if (window.innerWidth <= 640) return;
        if (!e.touches || !e.touches[0]) return;
        this.startDragging(e.touches[0].clientX, e.touches[0].clientY);
        document.addEventListener("touchmove", this.boundTouchMove, { passive: false });
        document.addEventListener("touchend", this.boundTouchEnd, { once: true });
      }, { passive: true });
    }

    startDragging(clientX, clientY) {
      const rect = this.panel.getBoundingClientRect();
      this.state.dragging = true;
      this.state.dragOffsetX = clientX - rect.left;
      this.state.dragOffsetY = clientY - rect.top;
      if (this.dragHandle) this.dragHandle.style.cursor = "grabbing";
    }

    stopDragging() {
      if (!this.state.dragging) return;
      this.state.dragging = false;
      if (this.dragHandle) this.dragHandle.style.cursor = "grab";
      document.removeEventListener("mousemove", this.boundMouseMove);
      document.removeEventListener("touchmove", this.boundTouchMove);
      this.savePosition();
    }

    centerPanel() {
      if (!this.panel) return;

      this.panel.style.left = "50%";
      this.panel.style.top = "50%";
      this.panel.style.right = "auto";
      this.panel.style.bottom = "auto";
      this.panel.style.transform = "translate(-50%, -50%)";
    }

    savePosition() {
      if (!this.panel || window.innerWidth <= 640) return;
      const rect = this.panel.getBoundingClientRect();
      U.save(this.o.storagePositionKey, { left: rect.left, top: rect.top });
    }

    restorePosition() {
      if (!this.panel) return;
      const pos = window.innerWidth > 640 ? U.load(this.o.storagePositionKey, null) : null;

      if (!pos || typeof pos.left !== "number" || typeof pos.top !== "number") {
        this.centerPanel();
        return;
      }

      this.panel.style.left = pos.left + "px";
      this.panel.style.top = pos.top + "px";
      this.panel.style.right = "auto";
      this.panel.style.bottom = "auto";
      this.panel.style.transform = "none";
    }

    toggleMini(forceValue) {
      if (!this.panel) return;

      const makeMini = typeof forceValue === "boolean"
        ? forceValue
        : !this.panel.classList.contains("pp-mini");

      this.panel.classList.toggle("pp-mini", makeMini);
      this.state.mini = makeMini;
      U.save(this.o.storageMiniKey, makeMini);

      const toggleBtn = this.q("#pp-toggle");
      if (toggleBtn) toggleBtn.textContent = makeMini ? "☰" : "—";

      const miniToggleBtn = this.q("#pp-mini-toggle");
      if (miniToggleBtn) miniToggleBtn.textContent = makeMini ? "☰" : "—";
    }

    restoreMiniState() {
      /* Always start in the new compact round icon view on every page load.
         The icon/full-view toggle still works after the page opens. */
      this.toggleMini(true);
    }

    applyTheme() {
      if (!this.panel) return;
      this.panel.classList.toggle("pp-dark", this.state.theme === "dark");
      U.save(this.o.storageThemeKey, this.state.theme);
    }

    toggleTheme() {
      this.state.theme = this.state.theme === "dark" ? "light" : "dark";
      this.applyTheme();
    }

    setSpeakingUI(isSpeaking) {
      if (!this.panel) return;
      this.panel.classList.toggle("pp-speaking", !!isSpeaking);
    }

    setStatus(text) {
      const el = this.q("#pp-status");
      if (el) el.textContent = text;
    }

    setCaption(text) {
      const t = text || "Ready";
      const el = this.q("#pp-caption");
      if (el) el.textContent = t;

      const miniTitle = this.q("#pp-mini-title");
      if (miniTitle) miniTitle.textContent = t;
    }

    setPauseButtonLabel(text) {
      const btn = this.q("#pp-pause");
      if (btn) btn.textContent = text;
    }

    clearActive() {
      this.withDomMute(() => {
        this.items.forEach(el => el.classList.remove(this.o.activeClass));
      });
    }

    markActive(el) {
      this.withDomMute(() => {
        this.items.forEach(node => node.classList.remove(this.o.activeClass));
        if (el) el.classList.add(this.o.activeClass);
      });
    }

    getVoice() {
      const voices = this.getVoices();
      if (!voices.length) return null;

      const preferred = this.getPreferredIndianMaleVoice();
      if (preferred) {
        if (this.o.voiceName !== preferred.name) {
          this.o.voiceName = preferred.name;
          U.save(this.o.storageVoiceKey, preferred.name);
        }
        return preferred;
      }

      if (this.o.voiceName) {
        const exact = voices.find(v => v.name === this.o.voiceName);
        if (exact) return exact;
      }

      return (
        voices.find(v => /en_IN/i.test(v.lang || "")) ||
        voices.find(v => /en-IN/i.test(v.lang || "")) ||
        voices.find(v => /en-GB/i.test(v.lang || "")) ||
        voices.find(v => /en-US/i.test(v.lang || "")) ||
        voices.find(v => /en/i.test(v.lang || "")) ||
        voices[0] ||
        null
      );
    }

    scrollToElement(el) {
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const currentTop = window.scrollY || window.pageYOffset || 0;
      const targetTop = rect.top + currentTop - this.o.autoScrollOffset - (window.innerHeight * 0.24);
      const finalTop = Math.max(0, targetTop);

      if (Math.abs(finalTop - currentTop) < 8) return;

      window.scrollTo({
        top: finalTop,
        behavior: this.o.scrollBehavior
      });
    }

    cancelSpeech() {
      clearTimeout(this.pendingNextTimer);
      this.pendingNextTimer = null;
      try { speechSynthesis.cancel(); } catch {}
    }

    queueNext(index) {
      clearTimeout(this.pendingNextTimer);
      this.pendingNextTimer = setTimeout(() => {
        this.speakIndex(index);
      }, this.o.pauseBetween);
    }

    updateProgress() {
      const bar = this.q("#pp-progress-bar");
      if (!bar) return;

      if (!this.items.length) {
        bar.style.width = "0%";
        return;
      }

      const pct = this.state.running
        ? ((this.state.i + 1) / this.items.length) * 100
        : (this.state.i / this.items.length) * 100;

      bar.style.width = `${U.clamp(pct, 0, 100)}%`;
    }

    readTitle() {
      this.clearActive();
      const titleEl = document.querySelector(this.o.titleSelector);
      const text = U.getSpeakText(titleEl) || document.title || "Untitled page";
      this.speakRaw(text, "Reading title");
    }

    speakRaw(text, statusText = "Speaking") {
      if (!text) return;

      this.enforcePreferredVoice();
      this.cancelSpeech();
      this.state.running = false;
      this.state.paused = false;
      this.setPauseButtonLabel("Pause");
      this.setSpeakingUI(true);
      this.setStatus(statusText);
      this.setCaption(text.slice(0, 120));

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.o.rate;
      utterance.pitch = this.o.pitch;
      utterance.volume = this.o.volume;

      const voice = this.getVoice();
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        this.setSpeakingUI(false);
        const preferred = this.getPreferredIndianMaleVoice();
        this.setStatus(
          preferred
            ? `Detected ${this.items.length} speak tag(s). Using ${preferred.name}.`
            : `Detected ${this.items.length} speak tag(s). Preferred English Indian male voice not found.`
        );
      };

      utterance.onerror = () => {
        this.setSpeakingUI(false);
        this.setStatus("Unable to speak.");
      };

      speechSynthesis.speak(utterance);
    }

    speakIndex(index) {
      if (!this.items.length) {
        this.state.running = false;
        this.state.paused = false;
        this.setStatus("No valid speak tags found.");
        this.setCaption("Add elements like speak0, speak1, speak2.");
        this.setSpeakingUI(false);
        this.updateProgress();
        return;
      }

      this.enforcePreferredVoice();
      index = Math.max(0, index);

      if (index >= this.items.length) {
        this.state.running = false;
        this.state.paused = false;
        this.state.utterance = null;
        this.setPauseButtonLabel("Pause");
        this.setStatus("Completed.");
        this.setCaption("Narration finished.");
        this.setSpeakingUI(false);
        this.clearActive();
        this.updateProgress();
        return;
      }

      this.state.i = index;
      const el = this.items[index];
      const text = U.getSpeakText(el);

      if (!text) {
        this.queueNext(index + 1);
        return;
      }

      this.markActive(el);
      this.scrollToElement(el);

      this.setSpeakingUI(true);
      this.setStatus(`Speaking ${el.id} (${index + 1}/${this.items.length})`);
      this.setCaption(text.slice(0, 120));
      this.withDomMute(() => {
        this.updateStartDropdown();
        this.updateProgress();
      });
      this.setPauseButtonLabel("Pause");

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.o.rate;
      utterance.pitch = this.o.pitch;
      utterance.volume = this.o.volume;

      const voice = this.getVoice();
      if (voice) utterance.voice = voice;

      this.state.utterance = utterance;

      utterance.onend = () => {
        if (!this.state.running || this.state.paused) return;
        this.queueNext(this.state.i + 1);
      };

      utterance.onerror = () => {
        if (!this.state.running) return;
        this.queueNext(this.state.i + 1);
      };

      speechSynthesis.speak(utterance);
    }

    start(index = 0) {
      this.refreshSpeakItems(true);
      this.enforcePreferredVoice();

      if (!this.items.length) {
        this.state.running = false;
        this.state.paused = false;
        this.setStatus("No valid speak tags found.");
        this.setCaption("Add elements like speak0, speak1, speak2.");
        this.setSpeakingUI(false);
        return;
      }

      this.cancelSpeech();
      this.state.running = true;
      this.state.paused = false;
      this.setPauseButtonLabel("Pause");
      this.setSpeakingUI(true);
      this.speakIndex(index);
    }

    next() {
      if (!this.items.length) return;
      this.enforcePreferredVoice();
      this.cancelSpeech();
      this.state.running = true;
      this.state.paused = false;
      this.setPauseButtonLabel("Pause");
      this.setSpeakingUI(true);
      setTimeout(() => {
        this.speakIndex(Math.min(this.state.i + 1, this.items.length - 1));
      }, 40);
    }

    previous() {
      if (!this.items.length) return;
      this.enforcePreferredVoice();
      this.cancelSpeech();
      this.state.running = true;
      this.state.paused = false;
      this.setPauseButtonLabel("Pause");
      this.setSpeakingUI(true);
      setTimeout(() => {
        this.speakIndex(Math.max(this.state.i - 1, 0));
      }, 40);
    }

    pause() {
      if (!this.state.running || this.state.paused) return;
      this.state.paused = true;
      try { speechSynthesis.pause(); } catch {}
      this.setStatus("Paused.");
      this.setCaption("Narration is paused.");
      this.setPauseButtonLabel("Resume");
      this.setSpeakingUI(false);
    }

    resume() {
      if (!this.state.running || !this.state.paused) return;
      this.enforcePreferredVoice();
      this.state.paused = false;

      try {
        speechSynthesis.resume();
        this.setStatus(`Resumed at ${this.items[this.state.i] ? this.items[this.state.i].id : "current item"}.`);
        this.setPauseButtonLabel("Pause");
        this.setSpeakingUI(true);
      } catch {
        this.speakIndex(this.state.i);
      }
    }

    stop() {
      this.cancelSpeech();
      this.state.running = false;
      this.state.paused = false;
      this.state.utterance = null;
      this.clearActive();
      this.enforcePreferredVoice();
      this.withDomMute(() => {
        this.updateStartDropdown();
        this.updateProgress();
      });

      const preferred = this.getPreferredIndianMaleVoice();
      this.setStatus(
        preferred
          ? `Detected ${this.items.length} speak tag(s). Using ${preferred.name}.`
          : `Detected ${this.items.length} speak tag(s). Preferred English Indian male voice not found.`
      );

      this.setCaption("Waiting to start narration.");
      this.setPauseButtonLabel("Pause");
      this.setSpeakingUI(false);
    }

    update() {
      this.enforcePreferredVoice();
      this.withDomMute(() => {
        this.updateStartDropdown();
        this.populateVoiceDropdown();
        this.syncRangeUI();
        this.updateProgress();
      });
      this.setPauseButtonLabel("Pause");
      this.setSpeakingUI(false);

      const preferred = this.getPreferredIndianMaleVoice();
      this.setStatus(
        preferred
          ? `Detected ${this.items.length} speak tag(s). Using ${preferred.name}.`
          : `Detected ${this.items.length} speak tag(s). Preferred English Indian male voice not found.`
      );

      this.setCaption("Waiting to start narration.");
    }
  }

  function boot() {
    const app = new App();

    window.PPSpeakV2UltraFix = app;
    window.PPSpeakV2Ultra = app;
    window.PPSpeakV9UltraFix = app;
    window.PPSpeakV9Ultra = app;
    window.PPSpeakUltra = app;
    window.PPSpeakV834 = app;
    window.PPSpeakV833 = app;
    window.PPSpeakV832 = app;
    window.PPSpeakV831 = app;
    window.PPSpeakV83 = app;
    window.PPSpeakV82 = app;
    window.PPSpeakV8 = app;
    window.PPSpeakV7 = app;
    window.PPSpeakV6 = app;
    window.PPSpeakV5 = app;
    window.PPSpeakV3 = app;

    app.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();