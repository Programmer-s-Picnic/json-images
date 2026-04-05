(function () {
  "use strict";

  const PPSpeakV9 = {
    items: [],
    currentIndex: 0,
    running: false,
    paused: false,
    activeUtterance: null,

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
      avatarVideo: "mee.mp4", // 👈 your video file
      avatarPoster: "mee.jpg",
    },

    init(opts = {}) {
      this.options = { ...this.options, ...opts };
      this.collectSpeakItems();
      this.createUI();
      this.bindEvents();
      this.populateDropdown();
    },

    collectSpeakItems() {
      this.items = Array.from(document.querySelectorAll(this.options.selector))
        .filter(el => el.id.match(/^speak\d+$/))
        .sort((a, b) => {
          return parseInt(a.id.replace("speak", "")) - parseInt(b.id.replace("speak", ""));
        });
    },

    createUI() {
      if (document.getElementById("pp-panel")) return;

      const panel = document.createElement("div");
      panel.id = "pp-panel";

      panel.innerHTML = `
        <style>
          #pp-panel {
            position: fixed;
            bottom: 15px;
            right: 15px;
            width: 320px;
            background: #fff8ef;
            border-radius: 18px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            padding: 14px;
            z-index: 9999;
            font-family: Arial;
          }

          #pp-avatar {
            width: 100%;
            border-radius: 14px;
            overflow: hidden;
            margin-bottom: 10px;
          }

          #pp-avatar video {
            width: 100%;
            display: block;
          }

          #pp-controls button {
            margin: 4px;
            padding: 8px 12px;
            border: none;
            border-radius: 8px;
            background: #d97706;
            color: white;
            cursor: pointer;
          }

          .pp-speaking-active {
            outline: 3px solid orange;
            background: #fff3df !important;
          }
        </style>

        <div id="pp-avatar">
          <video id="pp-video" muted loop poster="${this.options.avatarPoster}">
            <source src="${this.options.avatarVideo}" type="video/mp4">
          </video>
        </div>

        <select id="pp-start"></select>

        <div id="pp-controls">
          <button id="pp-start-btn">Start</button>
          <button id="pp-pause-btn">Pause</button>
          <button id="pp-stop-btn">Stop</button>
          <button id="pp-next-btn">Next</button>
        </div>

        <div id="pp-status">Ready</div>
      `;

      document.body.appendChild(panel);
    },

    bindEvents() {
      const q = (id) => document.getElementById(id);

      q("pp-start-btn").onclick = () => {
        const idx = parseInt(q("pp-start").value || 0);
        this.start(idx);
      };

      q("pp-pause-btn").onclick = () => {
        this.paused ? this.resume() : this.pause();
      };

      q("pp-stop-btn").onclick = () => this.stop();
      q("pp-next-btn").onclick = () => this.next();
    },

    populateDropdown() {
      const select = document.getElementById("pp-start");
      select.innerHTML = this.items
        .map((el, i) => `<option value="${i}">${el.id}</option>`)
        .join("");
    },

    playVideo() {
      const v = document.getElementById("pp-video");
      if (!v) return;
      v.currentTime = 0;
      v.play().catch(()=>{});
    },

    stopVideo() {
      const v = document.getElementById("pp-video");
      if (!v) return;
      v.pause();
      v.currentTime = 0;
    },

    speakIndex(i) {
      if (i >= this.items.length) {
        this.stop();
        return;
      }

      const el = this.items[i];
      const text = el.textContent.trim();

      this.currentIndex = i;
      this.highlight(el);

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = this.options.rate;
      utter.pitch = this.options.pitch;

      this.playVideo();

      utter.onend = () => {
        if (!this.running || this.paused) return;
        setTimeout(() => this.speakIndex(i + 1), this.options.pauseBetween);
      };

      speechSynthesis.speak(utter);
    },

    highlight(el) {
      this.items.forEach(e => e.classList.remove(this.options.activeClass));
      el.classList.add(this.options.activeClass);
    },

    start(i = 0) {
      if (!this.items.length) return;

      speechSynthesis.cancel();
      this.running = true;
      this.paused = false;
      this.speakIndex(i);
    },

    pause() {
      speechSynthesis.pause();
      this.paused = true;
      this.stopVideo();
    },

    resume() {
      speechSynthesis.resume();
      this.paused = false;
      this.playVideo();
    },

    stop() {
      speechSynthesis.cancel();
      this.running = false;
      this.paused = false;
      this.currentIndex = 0;
      this.stopVideo();
      this.items.forEach(e => e.classList.remove(this.options.activeClass));
    },

    next() {
      speechSynthesis.cancel();
      this.speakIndex(this.currentIndex + 1);
    }
  };

  window.PPSpeakV9 = PPSpeakV9;

  document.addEventListener("DOMContentLoaded", () => {
    PPSpeakV9.init();
  });

})();