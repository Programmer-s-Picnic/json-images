(function () {
  "use strict";

  const cfg = {
    selector: '[id^="speak"]',
    activeClass: "pp-speaking-active",
    scrollBehavior: "smooth",
    scrollBlock: "center",
    pauseBetween: 700,
    rate: 1,
    pitch: 1,
    volume: 1,
    voiceName: "",
    controlsContainerId: "pp-auto-speak-controls-v8-3-4",
    readSpeak0First: true,
    titleSelector: "[data-pp-speak-title]",
    addTitleButton: true,

    avatarName: "Champak Roy",
    avatarSubtitle: "Live speaking guide",
    avatarImage: "https://programmer-s-picnic.github.io/json-images/mee.jpg",

    whatsappNumber: "919335874326",
    whatsappLabel: "💬 Contact Champak Roy on WhatsApp",
    whatsappMessage: "Hi Champak Roy, I am interested in your course.",

    storageMiniKey: "pp_v834_mini",
    storagePositionKey: "pp_v834_position"
  };

  const U = {
    getNumericSpeakIndex(id) {
      const match = String(id || "").match(/^speak(\d+)$/i);
      return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
    },

    getSpeakText(el) {
      if (!el) return "";
      const dataSpeak = el.getAttribute("data-speak-text");
      if (dataSpeak && dataSpeak.trim()) return dataSpeak.trim();
      return (el.textContent || "").replace(/\s+/g, " ").trim();
    },

    isValidSpeakNode(el) {
      if (!el) return false;
      if (!el.id || !/^speak\d+$/i.test(el.id)) return false;
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
    }
  };

  class App {
    constructor() {
      this.o = { ...cfg };
      this.items = [];
      this.state = {
        i: 0,
        running: false,
        paused: false,
        utterance: null,
        mini: false,
        dragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0
      };

      this.panel = null;
      this.dragHandle = null;
      this.voiceCache = [];

      this.boundMouseMove = null;
      this.boundMouseUp = null;
      this.boundTouchMove = null;
      this.boundTouchEnd = null;
      this.boundVoicesChanged = null;
    }

    init(userOptions = {}) {
      this.o = { ...this.o, ...userOptions };
      this.collectSpeakItems();
      this.injectStyle();
      this.render();
      this.restoreMiniState();
      this.restorePosition();
      this.bindVoices();
      this.bind();
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
          background:rgba(245,158,11,.12)!important;
          border-radius:14px;
          box-shadow:0 10px 24px rgba(217,119,6,.12);
          transition:all .25s ease;
        }

        .pp-v834-panel{
          position:fixed;
          right:16px;
          bottom:16px;
          width:320px;
          max-width:calc(100vw - 20px);
          z-index:99999;
          background:#fff8ef;
          border:1px solid #f59e0b;
          border-radius:16px;
          padding:14px;
          box-shadow:0 12px 30px rgba(0,0,0,0.18);
          font-family:Arial,sans-serif;
        }

        .pp-v834-panel.pp-mini{
          width:auto;
          min-width:220px;
          padding:10px;
          border-radius:999px;
        }

        .pp-v834-topbar{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:8px;
          margin-bottom:10px;
        }

        .pp-v834-topbar-left{
          display:flex;
          align-items:center;
          gap:8px;
          min-width:0;
        }

        .pp-v834-chip{
          font-size:11px;
          font-weight:700;
          color:#92400e;
          background:#ffedd5;
          border:1px solid #fdba74;
          padding:5px 8px;
          border-radius:999px;
          white-space:nowrap;
        }

        .pp-v834-topbar-actions{
          display:flex;
          gap:6px;
          flex-shrink:0;
        }

        .pp-v834-icon-btn{
          width:34px;
          height:34px;
          border:none;
          border-radius:10px;
          background:#fff;
          color:#b45309;
          font-weight:700;
          cursor:pointer;
          box-shadow:0 2px 10px rgba(0,0,0,0.08);
        }

        .pp-v834-drag-btn{
          cursor:grab;
          touch-action:none;
        }

        .pp-v834-drag-btn:active{
          cursor:grabbing;
        }

        .pp-v834-main{
          display:block;
        }

        .pp-v834-panel.pp-mini .pp-v834-main{
          display:none;
        }

        .pp-v834-mini-bar{
          display:none;
          align-items:center;
          gap:8px;
        }

        .pp-v834-panel.pp-mini .pp-v834-mini-bar{
          display:flex;
        }

        .pp-v834-mini-title{
          min-width:0;
          flex:1;
          font-size:12px;
          color:#4b5563;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        .pp-v834-avatar-row{
          display:flex;
          gap:12px;
          align-items:center;
          margin-bottom:12px;
        }

        .pp-v834-avatar-wrap{
          position:relative;
          width:72px;
          height:72px;
          border-radius:50%;
          flex-shrink:0;
        }

        .pp-v834-avatar-glow{
          position:absolute;
          inset:-8px;
          border-radius:50%;
          background:radial-gradient(circle, rgba(245,158,11,.45), rgba(245,158,11,.12) 45%, transparent 72%);
          opacity:.35;
          transform:scale(1);
          transition:opacity .2s ease;
          pointer-events:none;
        }

        .pp-v834-panel.pp-speaking .pp-v834-avatar-glow{
          opacity:1;
          animation:ppV834Glow 1.2s ease-in-out infinite;
        }

        @keyframes ppV834Glow{
          0%{ transform:scale(1); filter:blur(0px); }
          50%{ transform:scale(1.16); filter:blur(1px); }
          100%{ transform:scale(1); filter:blur(0px); }
        }

        .pp-v834-avatar-img{
          position:relative;
          z-index:1;
          width:72px;
          height:72px;
          border-radius:50%;
          object-fit:cover;
          border:3px solid #fff;
          box-shadow:0 0 0 4px rgba(245,158,11,.18), 0 8px 18px rgba(0,0,0,.14);
          transition:transform .2s ease, box-shadow .2s ease;
          display:block;
        }

        .pp-v834-panel.pp-speaking .pp-v834-avatar-img{
          animation:ppV834Breath 1.2s ease-in-out infinite;
          box-shadow:0 0 0 4px rgba(245,158,11,.28), 0 0 22px rgba(245,158,11,.42), 0 8px 18px rgba(0,0,0,.14);
        }

        @keyframes ppV834Breath{
          0%{ transform:scale(1); }
          50%{ transform:scale(1.05); }
          100%{ transform:scale(1); }
        }

        .pp-v834-avatar-text{
          min-width:0;
          flex:1;
        }

        .pp-v834-avatar-name{
          font-weight:700;
          font-size:20px;
          color:#1f2937;
          margin:0 0 3px;
        }

        .pp-v834-avatar-sub{
          font-size:13px;
          color:#6b7280;
          margin:0 0 4px;
        }

        .pp-v834-caption{
          font-size:12px;
          color:#4b5563;
          margin-top:4px;
        }

        .pp-v834-label{
          display:block;
          font-size:12px;
          font-weight:700;
          margin-bottom:6px;
          color:#6b7280;
        }

        .pp-v834-select{
          width:100%;
          padding:10px;
          border-radius:10px;
          border:1px solid #e5c38a;
          margin-bottom:10px;
          background:#fff;
        }

        .pp-v834-buttons{
          display:grid;
          grid-template-columns:1fr;
          gap:8px;
        }

        .pp-v834-btn{
          padding:12px;
          border-radius:12px;
          font-weight:700;
          cursor:pointer;
          border:1px solid #e5c38a;
          background:#fff;
          color:#b45309;
        }

        .pp-v834-btn-primary{
          border:none;
          background:linear-gradient(135deg,#d97706,#f59e0b);
          color:#fff;
        }

        .pp-v834-btn-wa{
          border:none;
          background:linear-gradient(135deg,#25D366,#128C7E);
          color:#fff;
        }

        .pp-v834-status{
          margin-top:12px;
          font-size:12px;
          color:#4b5563;
        }

        @media (max-width:640px){
          .pp-v834-panel{
            right:10px !important;
            left:10px !important;
            width:auto !important;
            max-width:none !important;
            bottom:10px !important;
            top:auto !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    collectSpeakItems() {
      const raw = Array.from(document.querySelectorAll(this.o.selector));

      this.items = raw
        .filter(U.isValidSpeakNode)
        .sort((a, b) => U.getNumericSpeakIndex(a.id) - U.getNumericSpeakIndex(b.id));

      if (this.o.readSpeak0First) {
        const idx = this.items.findIndex(el => String(el.id).toLowerCase() === "speak0");
        if (idx > 0) {
          const [speak0] = this.items.splice(idx, 1);
          this.items.unshift(speak0);
        }
      }

      return this.items;
    }

    refreshSpeakItems() {
      this.collectSpeakItems();
      if (this.state.i >= this.items.length) {
        this.state.i = Math.max(0, this.items.length - 1);
      }
      this.updateStartDropdown();
    }

    render() {
      if (document.getElementById(this.o.controlsContainerId)) {
        this.panel = document.getElementById(this.o.controlsContainerId);
        this.dragHandle = this.panel.querySelector("#pp-drag");
        return;
      }

      const titleBtn = this.o.addTitleButton
        ? `<button id="pp-title" class="pp-v834-btn">Read page title</button>`
        : "";

      const p = document.createElement("div");
      p.id = this.o.controlsContainerId;
      p.className = "pp-v834-panel";

      p.innerHTML = `
        <div class="pp-v834-topbar">
          <div class="pp-v834-topbar-left">
            <div class="pp-v834-chip">PPSpeak</div>
          </div>
          <div class="pp-v834-topbar-actions">
            <button id="pp-drag" class="pp-v834-icon-btn pp-v834-drag-btn" title="Drag panel">⠿</button>
            <button id="pp-toggle" class="pp-v834-icon-btn" title="Minimize / Restore">—</button>
          </div>
        </div>

        <div class="pp-v834-mini-bar">
          <button id="pp-mini-restore" class="pp-v834-icon-btn" title="Restore">☰</button>
          <div class="pp-v834-mini-title" id="pp-mini-title">Ready</div>
          <button id="pp-mini-next" class="pp-v834-icon-btn" title="Next">⏭</button>
        </div>

        <div class="pp-v834-main">
          <div class="pp-v834-avatar-row">
            <div class="pp-v834-avatar-wrap">
              <div class="pp-v834-avatar-glow"></div>
              <img class="pp-v834-avatar-img" src="${this.o.avatarImage}" alt="Avatar" />
            </div>
            <div class="pp-v834-avatar-text">
              <div class="pp-v834-avatar-name">${this.o.avatarName}</div>
              <div class="pp-v834-avatar-sub">${this.o.avatarSubtitle}</div>
              <div id="pp-caption" class="pp-v834-caption">Waiting to start narration.</div>
            </div>
          </div>

          <label for="pp-start-from" class="pp-v834-label">Start from</label>
          <select id="pp-start-from" class="pp-v834-select"></select>

          <div class="pp-v834-buttons">
            ${titleBtn}
            <button id="pp-start" class="pp-v834-btn pp-v834-btn-primary">Start</button>
            <button id="pp-prev" class="pp-v834-btn">Prev</button>
            <button id="pp-next" class="pp-v834-btn">Next</button>
            <button id="pp-pause" class="pp-v834-btn">Pause</button>
            <button id="pp-stop" class="pp-v834-btn">Stop</button>
            <button id="pp-refresh" class="pp-v834-btn">Refresh speak tags</button>
            <button id="pp-wa" class="pp-v834-btn pp-v834-btn-wa">${this.o.whatsappLabel}</button>
          </div>

          <div id="pp-status" class="pp-v834-status">Detected ${this.items.length} speak tag(s).</div>
        </div>
      `;

      document.body.appendChild(p);
      this.panel = p;
      this.dragHandle = this.panel.querySelector("#pp-drag");
      this.updateStartDropdown();
    }

    q(selector) {
      return this.panel ? this.panel.querySelector(selector) : null;
    }

    bindVoices() {
      if (!("speechSynthesis" in window)) return;
      this.voiceCache = speechSynthesis.getVoices() || [];
      this.boundVoicesChanged = () => {
        this.voiceCache = speechSynthesis.getVoices() || [];
      };
      speechSynthesis.addEventListener("voiceschanged", this.boundVoicesChanged);
    }

    updateStartDropdown() {
      const select = this.q("#pp-start-from");
      if (!select) return;

      select.innerHTML = "";

      if (!this.items.length) {
        const opt = document.createElement("option");
        opt.value = "0";
        opt.textContent = "No speak tags found";
        select.appendChild(opt);
        return;
      }

      this.items.forEach((el, idx) => {
        const opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent = `${el.id} — ${U.getSpeakText(el).slice(0, 40)}`;
        select.appendChild(opt);
      });

      select.value = String(this.state.i);

      const miniTitle = this.q("#pp-mini-title");
      if (miniTitle) {
        miniTitle.textContent = this.items[this.state.i]
          ? this.items[this.state.i].id
          : "Ready";
      }
    }

    bind() {
      if (!this.panel) return;

      this.q("#pp-title")?.addEventListener("click", () => this.readTitle());

      this.q("#pp-start")?.addEventListener("click", () => {
        this.refreshSpeakItems();
        const selected = parseInt(this.q("#pp-start-from")?.value || "0", 10) || 0;
        this.start(selected);
      });

      this.q("#pp-prev")?.addEventListener("click", () => {
        this.refreshSpeakItems();
        this.previous();
      });

      this.q("#pp-next")?.addEventListener("click", () => {
        this.refreshSpeakItems();
        this.next();
      });

      this.q("#pp-mini-next")?.addEventListener("click", () => {
        this.refreshSpeakItems();
        this.next();
      });

      this.q("#pp-pause")?.addEventListener("click", () => {
        if (this.state.paused) this.resume();
        else this.pause();
      });

      this.q("#pp-stop")?.addEventListener("click", () => this.stop());

      this.q("#pp-refresh")?.addEventListener("click", () => {
        this.refreshSpeakItems();
        this.setStatus(`Detected ${this.items.length} speak tag(s).`);
      });

      this.q("#pp-wa")?.addEventListener("click", () => {
        const url = `https://wa.me/${this.o.whatsappNumber}?text=${encodeURIComponent(this.o.whatsappMessage)}`;
        window.open(url, "_blank", "noopener");
      });

      this.q("#pp-toggle")?.addEventListener("click", () => this.toggleMini());
      this.q("#pp-mini-restore")?.addEventListener("click", () => this.toggleMini(false));

      this.enableDragging();
    }

    enableDragging() {
      if (!this.dragHandle || !this.panel) return;

      const moveTo = (clientX, clientY) => {
        if (!this.state.dragging) return;
        if (window.innerWidth <= 640) return;

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
      };

      this.boundMouseMove = (e) => moveTo(e.clientX, e.clientY);
      this.boundMouseUp = () => this.stopDragging();

      this.boundTouchMove = (e) => {
        if (!e.touches || !e.touches[0]) return;
        moveTo(e.touches[0].clientX, e.touches[0].clientY);
      };

      this.boundTouchEnd = () => this.stopDragging();

      this.dragHandle.addEventListener("mousedown", (e) => {
        if (window.innerWidth <= 640) return;
        this.startDragging(e.clientX, e.clientY);
        document.addEventListener("mousemove", this.boundMouseMove);
        document.addEventListener("mouseup", this.boundMouseUp, { once: true });
      });

      this.dragHandle.addEventListener(
        "touchstart",
        (e) => {
          if (window.innerWidth <= 640) return;
          if (!e.touches || !e.touches[0]) return;
          this.startDragging(e.touches[0].clientX, e.touches[0].clientY);
          document.addEventListener("touchmove", this.boundTouchMove, { passive: false });
          document.addEventListener("touchend", this.boundTouchEnd, { once: true });
        },
        { passive: true }
      );
    }

    startDragging(clientX, clientY) {
      const rect = this.panel.getBoundingClientRect();
      this.state.dragging = true;
      this.state.dragOffsetX = clientX - rect.left;
      this.state.dragOffsetY = clientY - rect.top;
      this.dragHandle.style.cursor = "grabbing";
    }

    stopDragging() {
      if (!this.state.dragging) return;
      this.state.dragging = false;
      this.dragHandle.style.cursor = "grab";
      document.removeEventListener("mousemove", this.boundMouseMove);
      document.removeEventListener("touchmove", this.boundTouchMove);
      this.savePosition();
    }

    savePosition() {
      if (!this.panel || window.innerWidth <= 640) return;
      const rect = this.panel.getBoundingClientRect();
      U.save(this.o.storagePositionKey, {
        left: rect.left,
        top: rect.top
      });
    }

    restorePosition() {
      if (!this.panel || window.innerWidth <= 640) return;
      const pos = U.load(this.o.storagePositionKey, null);
      if (!pos || typeof pos.left !== "number" || typeof pos.top !== "number") return;

      this.panel.style.left = pos.left + "px";
      this.panel.style.top = pos.top + "px";
      this.panel.style.right = "auto";
      this.panel.style.bottom = "auto";
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
    }

    restoreMiniState() {
      const saved = U.load(this.o.storageMiniKey, false);
      this.toggleMini(!!saved);
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
      const el = this.q("#pp-caption");
      if (el) el.textContent = text;
      const miniTitle = this.q("#pp-mini-title");
      if (miniTitle) miniTitle.textContent = text || "Ready";
    }

    setPauseButtonLabel(text) {
      const btn = this.q("#pp-pause");
      if (btn) btn.textContent = text;
    }

    clearActive() {
      this.items.forEach(el => el.classList.remove(this.o.activeClass));
    }

    markActive(el) {
      this.clearActive();
      if (el) el.classList.add(this.o.activeClass);
    }

    getVoice() {
      if (!("speechSynthesis" in window)) return null;
      const voices = this.voiceCache.length ? this.voiceCache : (speechSynthesis.getVoices() || []);
      if (!voices.length) return null;

      if (this.o.voiceName) {
        const exact = voices.find(v => v.name === this.o.voiceName);
        if (exact) return exact;
      }

      const english = voices.find(v => /en/i.test(v.lang || ""));
      return english || voices[0] || null;
    }

    readTitle() {
      const titleEl = document.querySelector(this.o.titleSelector);
      const text = U.getSpeakText(titleEl) || document.title || "Untitled page";
      this.speakRaw(text, "Reading title");
    }

    speakRaw(text, statusText = "Speaking") {
      if (!text) return;

      try { speechSynthesis.cancel(); } catch {}

      this.state.running = false;
      this.state.paused = false;
      this.setPauseButtonLabel("Pause");
      this.setSpeakingUI(true);
      this.setStatus(statusText);
      this.setCaption(text.slice(0, 110));

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.o.rate;
      utterance.pitch = this.o.pitch;
      utterance.volume = this.o.volume;

      const voice = this.getVoice();
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        this.setSpeakingUI(false);
        this.setStatus(`Detected ${this.items.length} speak tag(s).`);
      };

      utterance.onerror = () => {
        this.setSpeakingUI(false);
        this.setStatus("Unable to speak title.");
      };

      speechSynthesis.speak(utterance);
    }

    speakIndex(index) {
      if (!this.items.length) {
        this.setStatus("No valid speak tags found.");
        this.setCaption("No valid speak tags found.");
        this.setSpeakingUI(false);
        return;
      }

      if (index < 0) index = 0;

      if (index >= this.items.length) {
        this.state.running = false;
        this.state.paused = false;
        this.setPauseButtonLabel("Pause");
        this.setStatus("Completed.");
        this.setCaption("Narration finished.");
        this.setSpeakingUI(false);
        this.clearActive();
        return;
      }

      this.state.i = index;
      const el = this.items[index];
      const text = U.getSpeakText(el);

      if (!text) {
        this.speakIndex(index + 1);
        return;
      }

      this.markActive(el);

      try {
        el.scrollIntoView({
          behavior: this.o.scrollBehavior,
          block: this.o.scrollBlock
        });
      } catch {}

      this.setSpeakingUI(true);
      this.setStatus(`Speaking ${el.id}`);
      this.setCaption(text.slice(0, 110));
      this.updateStartDropdown();
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
        setTimeout(() => this.speakIndex(this.state.i + 1), this.o.pauseBetween);
      };

      utterance.onerror = () => {
        if (!this.state.running) return;
        setTimeout(() => this.speakIndex(this.state.i + 1), this.o.pauseBetween);
      };

      speechSynthesis.speak(utterance);
    }

    start(index = 0) {
      this.refreshSpeakItems();

      if (!this.items.length) {
        this.setStatus("No valid speak tags found.");
        this.setCaption("Add elements like speak0, speak1, speak2.");
        this.setSpeakingUI(false);
        return;
      }

      try { speechSynthesis.cancel(); } catch {}
      this.state.running = true;
      this.state.paused = false;
      this.setPauseButtonLabel("Pause");
      this.setSpeakingUI(true);
      this.speakIndex(index);
    }

    next() {
      if (!this.items.length) return;
      try { speechSynthesis.cancel(); } catch {}
      this.state.running = true;
      this.state.paused = false;
      this.setPauseButtonLabel("Pause");
      this.setSpeakingUI(true);
      this.speakIndex(Math.min(this.state.i + 1, this.items.length - 1));
    }

    previous() {
      if (!this.items.length) return;
      try { speechSynthesis.cancel(); } catch {}
      this.state.running = true;
      this.state.paused = false;
      this.setPauseButtonLabel("Pause");
      this.setSpeakingUI(true);
      this.speakIndex(Math.max(this.state.i - 1, 0));
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
      this.state.paused = false;
      try {
        speechSynthesis.resume();
        this.setStatus("Resumed.");
        this.setPauseButtonLabel("Pause");
        this.setSpeakingUI(true);
      } catch {
        this.speakIndex(this.state.i);
      }
    }

    stop() {
      try { speechSynthesis.cancel(); } catch {}
      this.state.running = false;
      this.state.paused = false;
      this.state.utterance = null;
      this.clearActive();
      this.updateStartDropdown();
      this.setStatus(`Detected ${this.items.length} speak tag(s).`);
      this.setCaption("Waiting to start narration.");
      this.setPauseButtonLabel("Pause");
      this.setSpeakingUI(false);
    }

    update() {
      this.updateStartDropdown();
      this.setPauseButtonLabel("Pause");
      this.setSpeakingUI(false);
    }
  }

  function boot() {
    const app = new App();

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