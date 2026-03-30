(function () {
  "use strict";

  const PPSpeakV3 = {
    items: [],
    currentIndex: 0,
    running: false,
    paused: false,
    speaking: false,
    activeUtterance: null,
    sessionId: 0, // ✅ FIX: speech session tracking
    voicesHandler: null,

    options: {
      selector: '[id^="speak"]',
      activeClass: "pp-speaking-active",
      scrollBehavior: "smooth",
      scrollBlock: "center",
      pauseBetween: 700,
      rate: 1,
      pitch: 1,
      volume: 1,
      voiceName: "",
      autoInjectStyle: true,
      autoCreateControls: true,
      controlsContainerId: "pp-auto-speak-controls-v3",
      skipHiddenScroll: true,
      readSpeak0First: true, // ✅ NOW IMPLEMENTED
      addTitleButton: true,
      titleSelector: "[data-pp-speak-title]",
      miniModeDefault: false,
      draggable: true,
      log: false
    },

    init(userOptions) {
      this.options = Object.assign({}, this.options, userOptions || {});
      this.collectItems();

      if (this.options.autoInjectStyle) this.injectStyle();
      if (this.options.autoCreateControls) this.createControls();
      if (this.options.addTitleButton) this.attachTitleButton();

      this.bindGlobalAPI();
      this.loadVoices();

      if ("speechSynthesis" in window) {
        // ✅ FIX: safe event listener
        this.voicesHandler = () => this.loadVoices();
        speechSynthesis.addEventListener("voiceschanged", this.voicesHandler);
      }

      this.updateUI();
      return this;
    },

    destroy() {
      // ✅ FIX: proper cleanup
      this.stop();

      const panel = document.getElementById(this.options.controlsContainerId);
      if (panel) panel.remove();

      const style = document.getElementById("pp-auto-speak-v3-style");
      if (style) style.remove();

      if (this.voicesHandler && "speechSynthesis" in window) {
        speechSynthesis.removeEventListener("voiceschanged", this.voicesHandler);
      }

      delete window.PPSpeakV3;
    },

    collectItems() {
      const found = Array.from(document.querySelectorAll(this.options.selector));

      found.sort((a, b) => this.extractNumber(a.id) - this.extractNumber(b.id));

      this.items = found.map((el, index) => ({
        index,
        id: el.id,
        el,
        text: this.getSpeakText(el),
        scrollTarget: this.getScrollTarget(el)
      }));
    },

    extractNumber(id) {
      const match = String(id).match(/(\d+)/);
      return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
    },

    getSpeakText(el) {
      const dataText = el.getAttribute("data-speak-text");
      return dataText?.trim() || (el.textContent || "").trim();
    },

    getScrollTarget(el) {
      const selector = el.getAttribute("data-scroll-target");
      if (!selector) return el;
      try {
        return document.querySelector(selector) || el;
      } catch {
        return el;
      }
    },

    injectStyle() {
      if (document.getElementById("pp-auto-speak-v3-style")) return;

      const style = document.createElement("style");
      style.id = "pp-auto-speak-v3-style";
      style.textContent = `
        .${this.options.activeClass} {
          outline: 3px solid rgba(217,119,6,.32);
          background: rgba(245,158,11,.12);
        }
        .pp-speak-panel {
          position: fixed;
          right: 16px;
          bottom: 16px;
          z-index: 99999;
          background: #fff8eb;
          padding: 12px;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,.2);
        }
      `;
      document.head.appendChild(style);
    },

    createControls() {
      if (document.getElementById(this.options.controlsContainerId)) return;

      const panel = document.createElement("div");
      panel.id = this.options.controlsContainerId;
      panel.className = "pp-speak-panel";
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-label", "Narration controls");

      panel.innerHTML = `
        <button id="pp-start" aria-label="Start narration">▶ Start</button>
        <button id="pp-pause" aria-label="Pause narration">⏸ Pause</button>
        <button id="pp-stop" aria-label="Stop narration">⏹ Stop</button>
        <div id="pp-status" aria-live="polite">Ready</div>
      `;

      document.body.appendChild(panel);

      panel.querySelector("#pp-start").onclick = () => this.start();
      panel.querySelector("#pp-pause").onclick = () => this.paused ? this.resume() : this.pause();
      panel.querySelector("#pp-stop").onclick = () => this.stop();
    },

    start(startAt) {
      if (!("speechSynthesis" in window)) return;

      speechSynthesis.cancel();

      this.sessionId++; // ✅ FIX
      const session = this.sessionId;

      this.running = true;
      this.paused = false;

      if (this.options.readSpeak0First) {
        const idx = this.items.findIndex(i => i.id === "speak0");
        this.currentIndex = idx >= 0 ? idx : 0;
      } else {
        this.currentIndex = startAt || 0;
      }

      this.speakCurrent(session);
    },

    speakCurrent(session) {
      if (!this.running || session !== this.sessionId) return;

      if (this.currentIndex >= this.items.length) {
        this.stop();
        return;
      }

      const item = this.items[this.currentIndex];
      if (!item.text) {
        this.currentIndex++;
        this.speakCurrent(session);
        return;
      }

      this.highlight(item);
      item.scrollTarget.scrollIntoView({ behavior: "smooth", block: "center" });

      const utter = new SpeechSynthesisUtterance(item.text);
      this.activeUtterance = utter;

      utter.onend = () => {
        if (session !== this.sessionId) return; // ✅ FIX
        setTimeout(() => {
          this.currentIndex++;
          this.speakCurrent(session);
        }, this.options.pauseBetween);
      };

      utter.onerror = () => {
        if (session !== this.sessionId) return; // ✅ FIX
        this.currentIndex++;
        this.speakCurrent(session);
      };

      speechSynthesis.speak(utter);
    },

    pause() {
      this.paused = true;
      speechSynthesis.pause();
    },

    resume() {
      this.paused = false;
      speechSynthesis.resume();
    },

    stop() {
      this.running = false;
      this.paused = false;
      this.activeUtterance = null;
      speechSynthesis.cancel();
      this.clearActive();
    },

    highlight(item) {
      this.clearActive();
      item.el.classList.add(this.options.activeClass);
    },

    clearActive() {
      this.items.forEach(i => i.el.classList.remove(this.options.activeClass));
    },

    loadVoices() {
      if (!("speechSynthesis" in window)) return;
      speechSynthesis.getVoices();
    },

    bindGlobalAPI() {
      window.PPSpeakV3 = {
        init: (o) => this.init(o),
        start: (i) => this.start(i),
        stop: () => this.stop(),
        pause: () => this.pause(),
        resume: () => this.resume(),
        destroy: () => this.destroy()
      };
    }
  };

  function boot() {
    PPSpeakV3.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();