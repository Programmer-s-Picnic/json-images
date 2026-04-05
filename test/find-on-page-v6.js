
/* PPSpeak V6 – Full Modular Version (Core + UI + Plugins) */
(function () {
  "use strict";

  const PPSpeakCore = {
    items: [],
    index: 0,
    running: false,
    paused: false,
    utterance: null,

    options: {
      selector: '[id^="speak"]',
      rate: 1,
      pitch: 1,
      volume: 1,
      voiceName: "",
      pauseBetween: 500
    },

    init(opts = {}) {
      this.options = Object.assign(this.options, opts);
      this.collect();
    },

    collect() {
      this.items = Array.from(document.querySelectorAll(this.options.selector))
        .sort((a, b) => {
          return Number(a.id.replace("speak","")) - Number(b.id.replace("speak",""));
        });
    },

    speak(i) {
      if (!this.items[i]) return;
      this.index = i;

      const el = this.items[i];
      const text = el.dataset.speakText || el.textContent;

      if (this.utterance) speechSynthesis.cancel();

      const u = new SpeechSynthesisUtterance(text);
      u.rate = this.options.rate;
      u.pitch = this.options.pitch;
      u.volume = this.options.volume;

      const voices = speechSynthesis.getVoices();
      if (this.options.voiceName) {
        const v = voices.find(v => v.name === this.options.voiceName);
        if (v) u.voice = v;
      }

      this.utterance = u;

      u.onend = () => {
        if (this.running && !this.paused) {
          setTimeout(() => this.next(), this.options.pauseBetween);
        }
      };

      speechSynthesis.speak(u);
      this.running = true;
      this.paused = false;

      PPSpeakUI.highlight(el);
      PPSpeakUI.updateProgress(this.index, this.items.length);
    },

    start(i = 0) {
      this.running = true;
      this.speak(i);
    },

    pause() {
      speechSynthesis.pause();
      this.paused = true;
    },

    resume() {
      speechSynthesis.resume();
      this.paused = false;
    },

    stop() {
      speechSynthesis.cancel();
      this.running = false;
      this.paused = false;
      PPSpeakUI.clearHighlight();
    },

    next() {
      if (this.index < this.items.length - 1) {
        this.speak(this.index + 1);
      } else {
        this.stop();
      }
    },

    prev() {
      if (this.index > 0) {
        this.speak(this.index - 1);
      }
    }
  };

  const PPSpeakUI = {
    panel: null,

    init() {
      this.inject();
    },

    inject() {
      if (document.getElementById("pp-ui")) return;

      const div = document.createElement("div");
      div.id = "pp-ui";
      div.innerHTML = `
        <div style="position:fixed;bottom:20px;right:20px;background:#fff3df;padding:10px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.2);z-index:9999;">
          <button onclick="PPSpeak.start()">▶</button>
          <button onclick="PPSpeak.pause()">⏸</button>
          <button onclick="PPSpeak.resume()">▶</button>
          <button onclick="PPSpeak.next()">⏭</button>
          <button onclick="PPSpeak.prev()">⏮</button>
          <button onclick="PPSpeak.stop()">⏹</button>
          <div id="pp-progress" style="height:4px;background:#ddd;margin-top:6px;"></div>
        </div>
      `;
      document.body.appendChild(div);
      this.panel = div;
    },

    highlight(el) {
      this.clearHighlight();
      el.style.background = "#fff3cd";
    },

    clearHighlight() {
      document.querySelectorAll('[id^="speak"]').forEach(e => e.style.background="");
    },

    updateProgress(i, total) {
      const p = document.getElementById("pp-progress");
      if (p) p.style.width = ((i+1)/total*100)+"%";
    }
  };

  const PPSpeakPlugins = {
    whatsapp() {
      const btn = document.createElement("button");
      btn.innerText = "WhatsApp";
      btn.onclick = () => {
        window.open("https://wa.me/919335874326");
      };
      document.getElementById("pp-ui").appendChild(btn);
    }
  };

  const PPSpeak = {
    init(opts={}) {
      PPSpeakCore.init(opts);
      PPSpeakUI.init();
      PPSpeakPlugins.whatsapp();
    },
    start: (...a)=>PPSpeakCore.start(...a),
    pause: ()=>PPSpeakCore.pause(),
    resume: ()=>PPSpeakCore.resume(),
    stop: ()=>PPSpeakCore.stop(),
    next: ()=>PPSpeakCore.next(),
    prev: ()=>PPSpeakCore.prev()
  };

  window.PPSpeak = PPSpeak;

  document.addEventListener("DOMContentLoaded", () => PPSpeak.init());
})();
