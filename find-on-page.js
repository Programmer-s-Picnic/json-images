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
    controlsContainerId: "pp-auto-speak-controls-v8-3-2",
    readSpeak0First: true,
    titleSelector: "[data-pp-speak-title]",
    addTitleButton: true,

    avatarName: "Champak Roy",
    avatarSubtitle: "Live speaking guide",
    avatarImage: "https://programmer-s-picnic.github.io/json-images/mee.jpg",

    whatsappNumber: "919335874326",
    whatsappLabel: "💬 Contact Champak Roy on WhatsApp",
    whatsappMessage: "Hi Champak Roy, I am interested in your course."
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
      return (el.textContent || "").trim();
    },

    isValidSpeakNode(el) {
      if (!el) return false;
      if (!el.id || !/^speak\d+$/i.test(el.id)) return false;

      const txt = U.getSpeakText(el);
      return txt.length > 0;
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
        utterance: null
      };
      this.panel = null;
    }

    init(userOptions = {}) {
      this.o = { ...this.o, ...userOptions };
      this.collectSpeakItems();
      this.render();
      this.bind();
      this.update();
      return this;
    }

    collectSpeakItems() {
      const raw = Array.from(document.querySelectorAll(this.o.selector));

      this.items = raw
        .filter(U.isValidSpeakNode)
        .sort((a, b) => U.getNumericSpeakIndex(a.id) - U.getNumericSpeakIndex(b.id));

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
        return;
      }

      const p = document.createElement("div");
      p.id = this.o.controlsContainerId;
      p.style.position = "fixed";
      p.style.right = "16px";
      p.style.bottom = "16px";
      p.style.width = "280px";
      p.style.maxWidth = "calc(100vw - 20px)";
      p.style.zIndex = "99999";
      p.style.background = "#fff8ef";
      p.style.border = "1px solid #f59e0b";
      p.style.borderRadius = "16px";
      p.style.padding = "14px";
      p.style.boxShadow = "0 12px 30px rgba(0,0,0,0.18)";
      p.style.fontFamily = "Arial, sans-serif";

      p.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">
          <img
            src="${this.o.avatarImage}"
            alt="Avatar"
            style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 0 0 4px rgba(245,158,11,.18);"
          />
          <div>
            <div style="font-weight:700;font-size:20px;color:#1f2937;">${this.o.avatarName}</div>
            <div style="font-size:13px;color:#6b7280;">${this.o.avatarSubtitle}</div>
            <div id="pp-caption" style="font-size:12px;color:#4b5563;margin-top:4px;">Waiting to start narration.</div>
          </div>
        </div>

        <label for="pp-start-from" style="display:block;font-size:12px;font-weight:700;margin-bottom:6px;color:#6b7280;">Start from</label>
        <select id="pp-start-from" style="width:100%;padding:10px;border-radius:10px;border:1px solid #e5c38a;margin-bottom:10px;"></select>

        <div style="display:grid;grid-template-columns:1fr;gap:8px;">
          <button id="pp-start" style="padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;font-weight:700;">Start</button>
          <button id="pp-prev" style="padding:12px;border:1px solid #e5c38a;border-radius:12px;background:#fff;color:#b45309;font-weight:700;">Prev</button>
          <button id="pp-next" style="padding:12px;border:1px solid #e5c38a;border-radius:12px;background:#fff;color:#b45309;font-weight:700;">Next</button>
          <button id="pp-pause" style="padding:12px;border:1px solid #e5c38a;border-radius:12px;background:#fff;color:#b45309;font-weight:700;">Pause</button>
          <button id="pp-stop" style="padding:12px;border:1px solid #e5c38a;border-radius:12px;background:#fff;color:#b45309;font-weight:700;">Stop</button>
          <button id="pp-refresh" style="padding:12px;border:1px solid #e5c38a;border-radius:12px;background:#fff;color:#b45309;font-weight:700;">Refresh speak tags</button>
          <button id="pp-wa" style="padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;font-weight:700;">${this.o.whatsappLabel}</button>
        </div>

        <div id="pp-status" style="margin-top:12px;font-size:12px;color:#4b5563;">Detected ${this.items.length} speak tag(s).</div>
      `;

      document.body.appendChild(p);
      this.panel = p;
      this.updateStartDropdown();
    }

    q(selector) {
      return this.panel ? this.panel.querySelector(selector) : null;
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
    }

    bind() {
      if (!this.panel) return;

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
    }

    setStatus(text) {
      const el = this.q("#pp-status");
      if (el) el.textContent = text;
    }

    setCaption(text) {
      const el = this.q("#pp-caption");
      if (el) el.textContent = text;
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
      const voices = speechSynthesis.getVoices() || [];
      if (!voices.length) return null;

      if (this.o.voiceName) {
        const exact = voices.find(v => v.name === this.o.voiceName);
        if (exact) return exact;
      }
      return voices[0] || null;
    }

    speakIndex(index) {
      if (!this.items.length) {
        this.setStatus("No valid speak tags found.");
        this.setCaption("No valid speak tags found.");
        return;
      }

      if (index < 0) index = 0;

      if (index >= this.items.length) {
        this.stop();
        this.setStatus("Completed.");
        this.setCaption("Narration finished.");
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

      this.setStatus(`Speaking ${el.id}`);
      this.setCaption(text.slice(0, 110));
      this.updateStartDropdown();

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
        return;
      }

      speechSynthesis.cancel();
      this.state.running = true;
      this.state.paused = false;
      this.speakIndex(index);
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
      this.setStatus("Paused.");
      this.setCaption("Narration is paused.");
    }

    resume() {
      if (!this.state.running || !this.state.paused) return;
      this.state.paused = false;
      try { speechSynthesis.resume(); } catch {
        this.speakIndex(this.state.i);
        return;
      }
      this.setStatus("Resumed.");
    }

    stop() {
      try { speechSynthesis.cancel(); } catch {}
      this.state.running = false;
      this.state.paused = false;
      this.state.i = 0;
      this.state.utterance = null;
      this.clearActive();
      this.updateStartDropdown();
      this.setStatus(`Detected ${this.items.length} speak tag(s).`);
      this.setCaption("Waiting to start narration.");
    }
  }

  function boot() {
    const app = new App();

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