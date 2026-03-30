(function () {
  "use strict";

  const PP_AUTO_SPEAK = {
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
      pauseBetween: 600,
      rate: 1,
      pitch: 1,
      volume: 1,
      voiceName: "",
      autoInjectStyle: true,
      skipHiddenScroll: true,
      log: false
    },

    init(userOptions) {
      this.options = Object.assign({}, this.options, userOptions || {});
      this.collectItems();
      if (this.options.autoInjectStyle) this.injectStyle();
      this.bindGlobalAPI();
      this.log("Initialized with " + this.items.length + " speak items.");
      return this;
    },

    log(message) {
      if (this.options.log) {
        console.log("[PP Auto Speak]", message);
      }
    },

    collectItems() {
      const found = Array.from(document.querySelectorAll(this.options.selector));

      found.sort((a, b) => {
        const aNum = this.extractNumber(a.id);
        const bNum = this.extractNumber(b.id);
        return aNum - bNum;
      });

      this.items = found.map((el, index) => {
        return {
          index,
          id: el.id,
          el,
          text: this.getSpeakText(el),
          scrollTarget: this.getScrollTarget(el)
        };
      });
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
          this.log("Invalid data-scroll-target on #" + el.id);
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
      if (document.getElementById("pp-auto-speak-style")) return;

      const style = document.createElement("style");
      style.id = "pp-auto-speak-style";
      style.textContent = `
        .${this.options.activeClass}{
          outline: 3px solid rgba(217,119,6,.35);
          background: rgba(245,158,11,.12) !important;
          border-radius: 12px;
          transition: background .25s ease, outline .25s ease, transform .25s ease;
        }
      `;
      document.head.appendChild(style);
    },

    clearActive() {
      this.items.forEach((item) => {
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

      if (this.options.skipHiddenScroll && this.isHidden(item.scrollTarget)) {
        this.log("Skipping scroll for hidden target: " + item.id);
        return;
      }

      try {
        item.scrollTarget.scrollIntoView({
          behavior: this.options.scrollBehavior,
          block: this.options.scrollBlock
        });
      } catch (err) {
        this.log("Scroll failed for " + item.id);
      }
    },

    getVoice() {
      const voices = speechSynthesis.getVoices();
      if (!voices || !voices.length) return null;

      if (this.options.voiceName) {
        const exact = voices.find((v) => v.name === this.options.voiceName);
        if (exact) return exact;

        const partial = voices.find((v) =>
          v.name.toLowerCase().includes(this.options.voiceName.toLowerCase())
        );
        if (partial) return partial;
      }

      return voices[0] || null;
    },

    start(startAt) {
      if (!this.items.length) this.collectItems();
      if (!this.items.length) return;

      this.stop();
      this.running = true;
      this.paused = false;

      if (typeof startAt === "number" && startAt >= 0) {
        this.currentIndex = startAt;
      } else {
        this.currentIndex = 0;
      }

      this.speakCurrent();
    },

    startFromId(id) {
      const index = this.items.findIndex((item) => item.id === id);
      if (index >= 0) {
        this.start(index);
      }
    },

    stop() {
      this.running = false;
      this.paused = false;
      this.activeUtterance = null;
      this.clearActive();
      if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
      }
    },

    pause() {
      if (!this.running) return;
      this.paused = true;
      if ("speechSynthesis" in window) {
        speechSynthesis.pause();
      }
    },

    resume() {
      if (!this.running) return;
      this.paused = false;
      if ("speechSynthesis" in window) {
        speechSynthesis.resume();
      }
    },

    next() {
      if (!this.running) return;
      speechSynthesis.cancel();
      this.currentIndex += 1;
      this.speakCurrent();
    },

    previous() {
      if (!this.running) return;
      speechSynthesis.cancel();
      this.currentIndex = Math.max(0, this.currentIndex - 1);
      this.speakCurrent();
    },

    speakCurrent() {
      if (!this.running) return;

      if (this.currentIndex >= this.items.length) {
        this.log("Finished all items.");
        this.stop();
        return;
      }

      const item = this.items[this.currentIndex];
      if (!item) {
        this.stop();
        return;
      }

      item.text = this.getSpeakText(item.el);

      if (!item.text) {
        this.log("Empty text in " + item.id + ", skipping.");
        this.currentIndex += 1;
        this.speakCurrent();
        return;
      }

      this.highlight(item);
      this.scrollToItem(item);

      const utterance = new SpeechSynthesisUtterance(item.text);
      utterance.rate = this.options.rate;
      utterance.pitch = this.options.pitch;
      utterance.volume = this.options.volume;

      const voice = this.getVoice();
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        if (!this.running) return;
        setTimeout(() => {
          this.currentIndex += 1;
          this.speakCurrent();
        }, this.options.pauseBetween);
      };

      utterance.onerror = (event) => {
        this.log("Speech error on " + item.id + ": " + (event.error || "unknown"));
        if (!this.running) return;
        setTimeout(() => {
          this.currentIndex += 1;
          this.speakCurrent();
        }, this.options.pauseBetween);
      };

      this.activeUtterance = utterance;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    },

    bindGlobalAPI() {
      window.PPAutoSpeak = {
        init: (options) => this.init(options),
        start: (index) => this.start(index),
        startFromId: (id) => this.startFromId(id),
        stop: () => this.stop(),
        pause: () => this.pause(),
        resume: () => this.resume(),
        next: () => this.next(),
        previous: () => this.previous(),
        refresh: () => this.collectItems(),
        getItems: () => this.items.slice()
      };
    }
  };

  function boot() {
    PP_AUTO_SPEAK.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();