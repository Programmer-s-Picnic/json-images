(function () {
  "use strict";

  const PPSpeakV3 = {
    items: [],
    currentIndex: 0,
    running: false,
    paused: false,
    speaking: false,
    activeUtterance: null,
    dragged: false,

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
      readSpeak0First: true,
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
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }

      this.updateUI();
      this.log("Initialized with " + this.items.length + " items.");
      return this;
    },

    log(message) {
      if (this.options.log) {
        console.log("[PPSpeakV3]", message);
      }
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

      this.items.forEach((item, i) => (item.index = i));
    },

    extractNumber(id) {
      const match = String(id).match(/(\d+)/);
      return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
    },

    getSpeakText(el) {
      if (!el) return "";
      const dataText = el.getAttribute("data-speak-text");
      if (dataText && dataText.trim()) return dataText.trim();
      return (el.textContent || "").trim();
    },

    getScrollTarget(el) {
      const selector = el.getAttribute("data-scroll-target");
      if (selector) {
        try {
          const target = document.querySelector(selector);
          if (target) return target;
        } catch (err) {
          this.log("Invalid data-scroll-target for #" + el.id);
        }
      }
      return el;
    },

    isHidden(el) {
      if (!el) return true;
      const style = window.getComputedStyle(el);
      return (
        style.display === "none" ||
        style.visibility === "hidden" ||
        el.hidden === true
      );
    },

    injectStyle() {
      if (document.getElementById("pp-auto-speak-v3-style")) return;

      const style = document.createElement("style");
      style.id = "pp-auto-speak-v3-style";
      style.textContent = `
        .${this.options.activeClass} {
          outline: 3px solid rgba(217,119,6,.32);
          background: rgba(245,158,11,.12) !important;
          border-radius: 14px;
          transition: background .25s ease, outline .25s ease, transform .25s ease;
          box-shadow: 0 10px 24px rgba(217,119,6,.12);
        }

        .pp-speak-title-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-left: 12px;
          padding: 10px 14px;
          border: none;
          border-radius: 999px;
          background: linear-gradient(135deg, #d97706, #f59e0b);
          color: #fff;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(217,119,6,.22);
          vertical-align: middle;
        }

        .pp-speak-title-btn:hover {
          transform: translateY(-1px);
        }

        .pp-speak-panel {
          position: fixed;
          right: 16px;
          bottom: 16px;
          width: min(380px, calc(100vw - 24px));
          z-index: 99999;
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          color: #172033;
          background: rgba(255, 248, 235, .98);
          border: 1px solid rgba(217,119,6,.18);
          border-radius: 22px;
          box-shadow: 0 20px 60px rgba(15,23,42,.16);
          overflow: hidden;
          backdrop-filter: blur(12px);
          user-select: none;
        }

        .pp-speak-panel.mini .pp-speak-body {
          display: none;
        }

        .pp-speak-panel.mini .pp-speak-mini-row {
          display: grid;
        }

        .pp-speak-panel .pp-speak-mini-row {
          display: none;
          grid-template-columns: auto 1fr auto;
          gap: 8px;
          align-items: center;
          padding: 10px 12px 12px;
          border-top: 1px solid rgba(217,119,6,.12);
          background: rgba(255,255,255,.75);
        }

        .pp-speak-panel .pp-speak-mini-row button {
          border: none;
          cursor: pointer;
          border-radius: 12px;
          padding: 10px 12px;
          font-weight: 800;
        }

        .pp-speak-mini-main {
          font-size: 13px;
          color: #4b5563;
          min-width: 0;
        }

        .pp-speak-mini-main strong {
          display: block;
          color: #172033;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pp-speak-head {
          padding: 14px 14px 10px;
          background: linear-gradient(135deg, rgba(217,119,6,.12), rgba(245,158,11,.12));
          border-bottom: 1px solid rgba(217,119,6,.12);
          cursor: grab;
        }

        .pp-speak-head:active {
          cursor: grabbing;
        }

        .pp-speak-topline {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .pp-speak-kicker {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #b45309;
          background: rgba(255,255,255,.72);
          border: 1px solid rgba(217,119,6,.12);
          border-radius: 999px;
          padding: 6px 10px;
          margin-bottom: 8px;
        }

        .pp-speak-title {
          margin: 0;
          font-size: 18px;
          line-height: 1.2;
        }

        .pp-speak-sub {
          margin: 6px 0 0;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
        }

        .pp-speak-head-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .pp-speak-icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          border: 1px solid rgba(217,119,6,.16);
          background: rgba(255,255,255,.82);
          color: #b45309;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
        }

        .pp-speak-body {
          padding: 12px 14px 14px;
          display: grid;
          gap: 10px;
        }

        .pp-speak-row {
          display: grid;
          gap: 8px;
        }

        .pp-speak-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 700;
        }

        .pp-speak-grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .pp-speak-select,
        .pp-speak-btn {
          border-radius: 12px;
          border: 1px solid rgba(217,119,6,.16);
          background: #fff;
          color: #172033;
          font-size: 14px;
          padding: 11px 12px;
          width: 100%;
          box-sizing: border-box;
        }

        .pp-speak-btn {
          cursor: pointer;
          font-weight: 800;
          background: linear-gradient(135deg, #d97706, #f59e0b);
          color: #fff;
          border: none;
          box-shadow: 0 10px 24px rgba(217,119,6,.22);
        }

        .pp-speak-btn.secondary {
          background: #fff;
          color: #b45309;
          border: 1px solid rgba(217,119,6,.16);
          box-shadow: none;
        }

        .pp-speak-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .pp-speak-actions2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .pp-speak-meta {
          display: grid;
          gap: 6px;
          background: rgba(255,255,255,.75);
          border: 1px solid rgba(217,119,6,.12);
          border-radius: 14px;
          padding: 10px 12px;
        }

        .pp-speak-progress {
          height: 8px;
          background: rgba(217,119,6,.1);
          border-radius: 999px;
          overflow: hidden;
        }

        .pp-speak-progress-bar {
          height: 100%;
          width: 0%;
          background: linear-gradient(135deg, #d97706, #f59e0b);
          transition: width .3s ease;
        }

        .pp-speak-status,
        .pp-speak-current {
          font-size: 13px;
          color: #4b5563;
          line-height: 1.45;
        }

        @media (max-width: 640px) {
          .pp-speak-panel {
            right: 10px;
            left: 10px;
            bottom: 10px;
            width: auto;
          }

          .pp-speak-grid2,
          .pp-speak-actions,
          .pp-speak-actions2 {
            grid-template-columns: 1fr;
          }

          .pp-speak-title-btn {
            margin-left: 0;
            margin-top: 10px;
          }
        }
      `;
      document.head.appendChild(style);
    },

    createControls() {
      if (document.getElementById(this.options.controlsContainerId)) return;

      const panel = document.createElement("div");
      panel.id = this.options.controlsContainerId;
      panel.className = "pp-speak-panel" + (this.options.miniModeDefault ? " mini" : "");
      panel.innerHTML = `
        <div class="pp-speak-head" id="pp-speak-drag-handle">
          <div class="pp-speak-topline">
            <div>
              <div class="pp-speak-kicker">Auto Narration V3</div>
              <h3 class="pp-speak-title">Speak and Scroll Player</h3>
              <p class="pp-speak-sub">
                Reads <strong>speak0</strong>, <strong>speak1</strong>, <strong>speak2</strong> and more, while moving through the page.
              </p>
            </div>
            <div class="pp-speak-head-actions">
              <button type="button" class="pp-speak-icon-btn" id="pp-speak-mini-toggle" title="Mini mode">—</button>
              <button type="button" class="pp-speak-icon-btn" id="pp-speak-reset-pos" title="Reset position">⌂</button>
            </div>
          </div>
        </div>

        <div class="pp-speak-body">
          <div class="pp-speak-grid2">
            <div class="pp-speak-row">
              <label class="pp-speak-label" for="pp-speak-start-at">Start from</label>
              <select id="pp-speak-start-at" class="pp-speak-select"></select>
            </div>

            <div class="pp-speak-row">
              <label class="pp-speak-label" for="pp-speak-rate">Rate</label>
              <select id="pp-speak-rate" class="pp-speak-select">
                <option value="0.75">0.75x</option>
                <option value="0.9">0.9x</option>
                <option value="1" selected>1x</option>
                <option value="1.1">1.1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
              </select>
            </div>
          </div>

          <div class="pp-speak-row">
            <label class="pp-speak-label" for="pp-speak-voice">Voice</label>
            <select id="pp-speak-voice" class="pp-speak-select">
              <option value="">Default voice</option>
            </select>
          </div>

          <div class="pp-speak-actions">
            <button type="button" class="pp-speak-btn secondary" id="pp-speak-prev">Previous</button>
            <button type="button" class="pp-speak-btn" id="pp-speak-start">Start</button>
            <button type="button" class="pp-speak-btn secondary" id="pp-speak-next">Next</button>
          </div>

          <div class="pp-speak-actions2">
            <button type="button" class="pp-speak-btn secondary" id="pp-speak-pause">Pause</button>
            <button type="button" class="pp-speak-btn secondary" id="pp-speak-stop">Stop</button>
          </div>

          <div class="pp-speak-meta">
            <div class="pp-speak-status" id="pp-speak-status">Ready.</div>
            <div class="pp-speak-current" id="pp-speak-current">No paragraph selected.</div>
            <div class="pp-speak-progress">
              <div class="pp-speak-progress-bar" id="pp-speak-progress-bar"></div>
            </div>
          </div>
        </div>

        <div class="pp-speak-mini-row">
          <button type="button" class="pp-speak-icon-btn" id="pp-speak-mini-play" title="Start or resume">▶</button>
          <div class="pp-speak-mini-main">
            <strong id="pp-speak-mini-title">Ready</strong>
            <span id="pp-speak-mini-text">Tap play to begin narration.</span>
          </div>
          <button type="button" class="pp-speak-icon-btn" id="pp-speak-mini-next" title="Next">⏭</button>
        </div>
      `;

      document.body.appendChild(panel);

      panel.querySelector("#pp-speak-start").addEventListener("click", () => {
        const select = document.getElementById("pp-speak-start-at");
        const idx = parseInt(select.value, 10) || 0;
        this.options.rate = parseFloat(document.getElementById("pp-speak-rate").value) || 1;
        this.options.voiceName = document.getElementById("pp-speak-voice").value || "";
        this.start(idx);
      });

      panel.querySelector("#pp-speak-pause").addEventListener("click", () => {
        if (this.paused) {
          this.resume();
        } else {
          this.pause();
        }
      });

      panel.querySelector("#pp-speak-stop").addEventListener("click", () => this.stop());
      panel.querySelector("#pp-speak-prev").addEventListener("click", () => this.previous());
      panel.querySelector("#pp-speak-next").addEventListener("click", () => this.next());

      panel.querySelector("#pp-speak-rate").addEventListener("change", (e) => {
        this.options.rate = parseFloat(e.target.value) || 1;
      });

      panel.querySelector("#pp-speak-voice").addEventListener("change", (e) => {
        this.options.voiceName = e.target.value || "";
      });

      panel.querySelector("#pp-speak-mini-toggle").addEventListener("click", () => {
        this.toggleMiniMode();
      });

      panel.querySelector("#pp-speak-reset-pos").addEventListener("click", () => {
        this.resetPanelPosition();
      });

      panel.querySelector("#pp-speak-mini-play").addEventListener("click", () => {
        if (!this.running) {
          this.start(this.currentIndex || 0);
        } else if (this.paused) {
          this.resume();
        } else {
          this.pause();
        }
      });

      panel.querySelector("#pp-speak-mini-next").addEventListener("click", () => {
        this.next();
      });

      this.refreshStartDropdown();
      if (this.options.draggable) this.enableDragging(panel, panel.querySelector("#pp-speak-drag-handle"));
    },

    enableDragging(panel, handle) {
      if (!panel || !handle) return;

      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let startLeft = 0;
      let startTop = 0;

      const onPointerDown = (e) => {
        if (e.target.closest("button, select, option, input")) return;

        isDragging = true;
        this.dragged = false;
        panel.style.right = "auto";
        panel.style.bottom = "auto";

        const rect = panel.getBoundingClientRect();
        panel.style.left = rect.left + "px";
        panel.style.top = rect.top + "px";

        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;

        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
      };

      const onPointerMove = (e) => {
        if (!isDragging) return;
        this.dragged = true;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        const maxLeft = window.innerWidth - panel.offsetWidth;
        const maxTop = window.innerHeight - panel.offsetHeight;

        newLeft = Math.max(0, Math.min(maxLeft, newLeft));
        newTop = Math.max(0, Math.min(maxTop, newTop));

        panel.style.left = newLeft + "px";
        panel.style.top = newTop + "px";
      };

      const onPointerUp = () => {
        isDragging = false;
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      };

      handle.addEventListener("pointerdown", onPointerDown);
    },

    resetPanelPosition() {
      const panel = document.getElementById(this.options.controlsContainerId);
      if (!panel) return;
      panel.style.left = "";
      panel.style.top = "";
      panel.style.right = "16px";
      panel.style.bottom = "16px";
    },

    toggleMiniMode(forceValue) {
      const panel = document.getElementById(this.options.controlsContainerId);
      if (!panel) return;

      const makeMini = typeof forceValue === "boolean"
        ? forceValue
        : !panel.classList.contains("mini");

      panel.classList.toggle("mini", makeMini);

      const btn = document.getElementById("pp-speak-mini-toggle");
      if (btn) btn.textContent = makeMini ? "□" : "—";
    },

    attachTitleButton() {
      const titleEl = document.querySelector(this.options.titleSelector);
      if (!titleEl) return;
      if (titleEl.parentNode.querySelector(".pp-speak-title-btn")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pp-speak-title-btn";
      btn.innerHTML = "🔊 Start narration";
      btn.addEventListener("click", () => {
        this.start(0);
      });

      titleEl.insertAdjacentElement("afterend", btn);
    },

    refreshStartDropdown() {
      const select = document.getElementById("pp-speak-start-at");
      if (!select) return;

      select.innerHTML = this.items
        .map((item, i) => {
          const label = item.id + (item.id === "speak0" ? " — Introduction" : "");
          return `<option value="${i}">${this.escapeHtml(label)}</option>`;
        })
        .join("");
    },

    loadVoices() {
      if (!("speechSynthesis" in window)) return;
      const voices = window.speechSynthesis.getVoices() || [];

      const select = document.getElementById("pp-speak-voice");
      if (!select) return;

      const current = select.value || "";
      select.innerHTML =
        `<option value="">Default voice</option>` +
        voices.map(v => {
          const value = this.escapeHtml(v.name);
          const label = this.escapeHtml(v.name + (v.lang ? " (" + v.lang + ")" : ""));
          return `<option value="${value}">${label}</option>`;
        }).join("");

      if (current) select.value = current;
    },

    getVoice() {
      const voices = ("speechSynthesis" in window) ? speechSynthesis.getVoices() : [];
      if (!voices.length) return null;

      if (this.options.voiceName) {
        const exact = voices.find(v => v.name === this.options.voiceName);
        if (exact) return exact;

        const partial = voices.find(v =>
          v.name.toLowerCase().includes(this.options.voiceName.toLowerCase())
        );
        if (partial) return partial;
      }

      return voices[0] || null;
    },

    clearActive() {
      this.items.forEach(item => {
        if (item.el) item.el.classList.remove(this.options.activeClass);
        if (item.scrollTarget && item.scrollTarget !== item.el) {
          item.scrollTarget.classList.remove(this.options.activeClass);
        }
      });
    },

    highlight(item) {
      this.clearActive();
      if (!item) return;

      if (item.el && !this.isHidden(item.el)) {
        item.el.classList.add(this.options.activeClass);
      }

      if (
        item.scrollTarget &&
        item.scrollTarget !== item.el &&
        !this.isHidden(item.scrollTarget)
      ) {
        item.scrollTarget.classList.add(this.options.activeClass);
      }
    },

    scrollToItem(item) {
      if (!item || !item.scrollTarget) return;
      if (this.options.skipHiddenScroll && this.isHidden(item.scrollTarget)) return;

      try {
        item.scrollTarget.scrollIntoView({
          behavior: this.options.scrollBehavior,
          block: this.options.scrollBlock
        });
      } catch (err) {
        this.log("Scroll failed for " + item.id);
      }
    },

    start(startAt) {
      if (!("speechSynthesis" in window)) {
        this.setStatus("Speech synthesis is not supported in this browser.");
        return;
      }

      if (!this.items.length) this.collectItems();
      if (!this.items.length) {
        this.setStatus("No speak paragraphs found.");
        return;
      }

      speechSynthesis.cancel();
      this.running = true;
      this.paused = false;
      this.speaking = false;

      this.currentIndex = typeof startAt === "number"
        ? Math.max(0, Math.min(startAt, this.items.length - 1))
        : 0;

      this.speakCurrent();
    },

    startFromId(id) {
      const index = this.items.findIndex(item => item.id === id);
      if (index >= 0) this.start(index);
    },

    stop() {
      this.running = false;
      this.paused = false;
      this.speaking = false;
      this.activeUtterance = null;
      this.clearActive();

      if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
      }

      this.setStatus("Stopped.");
      this.setCurrent("No paragraph selected.");
      this.updateProgress();
      this.updatePauseButton();
      this.updateMiniText("Ready", "Tap play to begin narration.");
    },

    pause() {
      if (!this.running || this.paused) return;
      this.paused = true;
      if ("speechSynthesis" in window) speechSynthesis.pause();
      this.setStatus("Paused.");
      this.updatePauseButton();
      this.updateMiniPlayButton();
    },

    resume() {
      if (!this.running || !this.paused) return;
      this.paused = false;
      if ("speechSynthesis" in window) speechSynthesis.resume();
      this.setStatus("Resumed.");
      this.updatePauseButton();
      this.updateMiniPlayButton();
    },

    next() {
      if (!this.items.length) return;

      if (!this.running) {
        const nextIndex = Math.min(this.currentIndex + 1, this.items.length - 1);
        this.start(nextIndex);
        return;
      }

      speechSynthesis.cancel();
      this.currentIndex = Math.min(this.currentIndex + 1, this.items.length - 1);
      this.speakCurrent();
    },

    previous() {
      if (!this.items.length) return;

      if (!this.running) {
        const prevIndex = Math.max(this.currentIndex - 1, 0);
        this.start(prevIndex);
        return;
      }

      speechSynthesis.cancel();
      this.currentIndex = Math.max(this.currentIndex - 1, 0);
      this.speakCurrent();
    },

    speakCurrent() {
      if (!this.running) return;

      if (this.currentIndex >= this.items.length) {
        this.setStatus("Completed.");
        this.running = false;
        this.paused = false;
        this.speaking = false;
        this.updatePauseButton();
        this.updateMiniPlayButton();
        this.updateMiniText("Completed", "Narration finished.");
        return;
      }

      const item = this.items[this.currentIndex];
      if (!item) {
        this.stop();
        return;
      }

      item.text = this.getSpeakText(item.el);

      if (!item.text) {
        this.currentIndex += 1;
        this.speakCurrent();
        return;
      }

      this.highlight(item);
      this.scrollToItem(item);
      this.setStatus("Speaking " + item.id + "...");
      this.setCurrent(item.id + ": " + this.truncate(item.text, 140));
      this.updateProgress();
      this.updateStartAtDropdownValue();
      this.updatePauseButton();
      this.updateMiniPlayButton();
      this.updateMiniText(item.id, this.truncate(item.text, 70));

      const utterance = new SpeechSynthesisUtterance(item.text);
      utterance.rate = this.options.rate;
      utterance.pitch = this.options.pitch;
      utterance.volume = this.options.volume;

      const voice = this.getVoice();
      if (voice) utterance.voice = voice;

      this.activeUtterance = utterance;
      this.speaking = true;

      utterance.onend = () => {
        if (!this.running) return;
        this.speaking = false;

        setTimeout(() => {
          if (!this.running || this.paused) return;
          this.currentIndex += 1;
          this.speakCurrent();
        }, this.options.pauseBetween);
      };

      utterance.onerror = () => {
        if (!this.running) return;
        this.speaking = false;

        setTimeout(() => {
          if (!this.running) return;
          this.currentIndex += 1;
          this.speakCurrent();
        }, this.options.pauseBetween);
      };

      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    },

    updateUI() {
      this.refreshStartDropdown();
      this.updateProgress();
      this.updatePauseButton();
      this.updateMiniPlayButton();
    },

    updateStartAtDropdownValue() {
      const select = document.getElementById("pp-speak-start-at");
      if (select) select.value = String(this.currentIndex);
    },

    updatePauseButton() {
      const btn = document.getElementById("pp-speak-pause");
      if (!btn) return;
      btn.textContent = this.paused ? "Resume" : "Pause";
    },

    updateMiniPlayButton() {
      const btn = document.getElementById("pp-speak-mini-play");
      if (!btn) return;

      if (!this.running) {
        btn.textContent = "▶";
        btn.title = "Start";
      } else if (this.paused) {
        btn.textContent = "▶";
        btn.title = "Resume";
      } else {
        btn.textContent = "⏸";
        btn.title = "Pause";
      }
    },

    updateMiniText(title, text) {
      const titleEl = document.getElementById("pp-speak-mini-title");
      const textEl = document.getElementById("pp-speak-mini-text");
      if (titleEl) titleEl.textContent = title;
      if (textEl) textEl.textContent = text;
    },

    updateProgress() {
      const bar = document.getElementById("pp-speak-progress-bar");
      if (!bar || !this.items.length) {
        if (bar) bar.style.width = "0%";
        return;
      }

      const value = this.running
        ? ((this.currentIndex + 1) / this.items.length) * 100
        : 0;

      bar.style.width = Math.max(0, Math.min(100, value)) + "%";
    },

    setStatus(text) {
      const el = document.getElementById("pp-speak-status");
      if (el) el.textContent = text;
    },

    setCurrent(text) {
      const el = document.getElementById("pp-speak-current");
      if (el) el.textContent = text;
    },

    truncate(text, max) {
      const str = String(text || "");
      return str.length > max ? str.slice(0, max - 1) + "…" : str;
    },

    escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },

    bindGlobalAPI() {
      window.PPSpeakV3 = {
        init: (options) => this.init(options),
        start: (index) => this.start(index),
        startFromId: (id) => this.startFromId(id),
        stop: () => this.stop(),
        pause: () => this.pause(),
        resume: () => this.resume(),
        next: () => this.next(),
        previous: () => this.previous(),
        refresh: () => {
          this.collectItems();
          this.refreshStartDropdown();
        },
        toggleMiniMode: (value) => this.toggleMiniMode(value),
        resetPanelPosition: () => this.resetPanelPosition(),
        getItems: () => this.items.slice()
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