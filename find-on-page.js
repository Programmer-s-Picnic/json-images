 
(function () {
  "use strict";

  const PPSpeakV5 = {
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
      controlsContainerId: "pp-auto-speak-controls-v5",
      skipHiddenScroll: true,
      readSpeak0First: true,
      addTitleButton: true,
      titleSelector: "[data-pp-speak-title]",
      miniModeDefault: false,
      draggable: true,
      log: false,

      whatsappEnabled: true,
      whatsappNumber: "919335874326",
      whatsappLabel: "💬 Contact Champak Roy on WhatsApp",
      whatsappMessage: "Hi Champak Roy, I am interested in your course.",

      avatarName: "Champak AI",
      avatarSubtitle: "Live speaking guide",

      storageKeyPosition: "ppSpeakPanelPositionV5",
      storageKeyMiniMode: "ppSpeakMiniModeV5",
      storageKeyRate: "ppSpeakRateV5",
      storageKeyPitch: "ppSpeakPitchV5",
      storageKeyVoice: "ppSpeakVoiceV5"
    },

    init(userOptions) {
      this.options = Object.assign({}, this.options, userOptions || {});
      this.collectItems();

      if (this.options.autoInjectStyle) this.injectStyle();
      if (this.options.autoCreateControls) this.createControls();
      if (this.options.addTitleButton) this.attachTitleButton();

      this.bindGlobalAPI();
      this.restorePreferences();
      this.loadVoices();

      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }

      this.restoreMiniMode();
      this.restorePanelPosition();
      this.updateUI();

      window.addEventListener("resize", () => {
        this.restorePanelPosition();
      });

      return this;
    },

    log(message) {
      if (this.options.log) {
        console.log("[PPSpeakV5]", message);
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

    getWhatsAppUrl() {
      const number = String(this.options.whatsappNumber || "").replace(/[^\d]/g, "");
      const message = encodeURIComponent(this.options.whatsappMessage || "");
      if (!number) return "";
      return message
        ? "https://wa.me/" + number + "?text=" + message
        : "https://wa.me/" + number;
    },

    openWhatsApp() {
      const url = this.getWhatsAppUrl();
      if (!url) return;
      window.open(url, "_blank", "noopener");
    },

    injectStyle() {
      if (document.getElementById("pp-auto-speak-v5-style")) return;

      const style = document.createElement("style");
      style.id = "pp-auto-speak-v5-style";
      style.textContent = `
        .${this.options.activeClass} {
          outline: 3px solid rgba(217,119,6,.28);
          background: rgba(245,158,11,.12) !important;
          border-radius: 14px;
          box-shadow: 0 10px 24px rgba(217,119,6,.12);
          transition: background .25s ease, outline .25s ease, transform .25s ease;
        }

        .pp-speak-title-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-left: 12px;
          padding: 10px 15px;
          border: none;
          border-radius: 999px;
          background: linear-gradient(135deg, #d97706, #f59e0b);
          color: #fff;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(217,119,6,.24);
        }

        .pp-speak-panel {
          position: fixed;
          right: 14px;
          bottom: 14px;
          width: min(370px, calc(100vw - 20px));
          z-index: 99999;
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          color: #172033;
          background:
            radial-gradient(circle at top right, rgba(245,158,11,.14), transparent 28%),
            linear-gradient(180deg, rgba(255,255,255,.98), rgba(255,248,235,.98));
          border: 1px solid rgba(217,119,6,.16);
          border-radius: 24px;
          box-shadow: 0 22px 60px rgba(15,23,42,.18);
          overflow: hidden;
          backdrop-filter: blur(12px);
          user-select: none;
        }

        .pp-speak-panel.mini {
          width: auto;
          min-width: 0;
          max-width: calc(100vw - 20px);
          border-radius: 999px;
          overflow: visible;
          background: transparent;
          border: none;
          box-shadow: none;
        }

        .pp-speak-panel.mini .pp-speak-head,
        .pp-speak-panel.mini .pp-speak-body {
          display: none;
        }

        .pp-speak-panel.mini .pp-speak-mini-row {
          display: grid;
        }

        .pp-speak-mini-row {
          display: none;
          grid-template-columns: auto auto 1fr auto auto;
          gap: 8px;
          align-items: center;
          padding: 8px;
          background: rgba(255,255,255,.98);
          border: 1px solid rgba(217,119,6,.16);
          border-radius: 999px;
          box-shadow: 0 18px 40px rgba(15,23,42,.16);
        }

        .pp-speak-mini-main {
          min-width: 0;
          font-size: 12px;
          color: #4b5563;
          line-height: 1.35;
        }

        .pp-speak-mini-main strong {
          display: block;
          color: #172033;
          font-size: 12px;
          margin-bottom: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 130px;
        }

        .pp-speak-head {
          padding: 14px 14px 10px;
          background:
            radial-gradient(circle at top right, rgba(245,158,11,.22), transparent 35%),
            linear-gradient(135deg, rgba(217,119,6,.12), rgba(245,158,11,.08));
          border-bottom: 1px solid rgba(217,119,6,.10);
          cursor: grab;
          touch-action: none;
        }

        .pp-speak-head:active {
          cursor: grabbing;
        }

        .pp-speak-topline {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: start;
        }

        .pp-speak-kicker {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #b45309;
          background: rgba(255,255,255,.78);
          border: 1px solid rgba(217,119,6,.10);
          border-radius: 999px;
          padding: 5px 9px;
          margin-bottom: 8px;
        }

        .pp-speak-title {
          margin: 0;
          font-size: 18px;
          line-height: 1.15;
          font-weight: 850;
          letter-spacing: -.01em;
        }

        .pp-speak-sub {
          margin: 5px 0 0;
          font-size: 12px;
          color: #6b7280;
          line-height: 1.45;
          max-width: 28ch;
        }

        .pp-speak-head-actions {
          display: flex;
          gap: 7px;
          align-items: center;
        }

        .pp-speak-icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 13px;
          border: 1px solid rgba(217,119,6,.14);
          background: rgba(255,255,255,.92);
          color: #b45309;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(15,23,42,.06);
        }

        .pp-speak-body {
          padding: 14px;
          display: grid;
          gap: 12px;
        }

        .pp-speak-avatar-shell {
          display: grid;
          grid-template-columns: 84px 1fr;
          gap: 12px;
          align-items: center;
          background: rgba(255,255,255,.82);
          border: 1px solid rgba(217,119,6,.10);
          border-radius: 18px;
          padding: 12px;
        }

        .pp-speak-avatar-wrap {
          position: relative;
          width: 84px;
          height: 84px;
          display: grid;
          place-items: center;
        }

        .pp-speak-avatar-glow {
          position: absolute;
          width: 84px;
          height: 84px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,.24), rgba(245,158,11,.06) 58%, transparent 74%);
          opacity: .6;
          transition: all .25s ease;
        }

        .pp-speak-panel.is-speaking .pp-speak-avatar-glow {
          opacity: 1;
          animation: ppAvatarGlow 1.1s ease-in-out infinite;
        }

        @keyframes ppAvatarGlow {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }

        .pp-speak-avatar {
          position: relative;
          width: 70px;
          height: 70px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid rgba(255,255,255,.95);
          box-shadow: 0 10px 24px rgba(15,23,42,.14);
          background: linear-gradient(180deg, #ffd29f, #f3b97c);
          animation: ppAvatarFloat 4s ease-in-out infinite;
        }

        @keyframes ppAvatarFloat {
          0% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
          100% { transform: translateY(0); }
        }

        .pp-speak-hair {
          position: absolute;
          left: 7px;
          right: 7px;
          top: 6px;
          height: 26px;
          background: linear-gradient(180deg, #27272a, #3f3f46);
          border-radius: 26px 26px 12px 12px;
        }

        .pp-speak-face {
          position: absolute;
          inset: 16px 10px 8px 10px;
          border-radius: 24px 24px 30px 30px;
          background: linear-gradient(180deg, #ffd7ae, #f3ba84);
        }

        .pp-speak-eye {
          position: absolute;
          top: 23px;
          width: 9px;
          height: 6px;
          background: #1f2937;
          border-radius: 0 0 10px 10px;
          animation: ppAvatarBlink 5s infinite;
          transform-origin: center center;
        }

        .pp-speak-eye.left { left: 14px; }
        .pp-speak-eye.right { right: 14px; }

        @keyframes ppAvatarBlink {
          0%, 45%, 47%, 100% { transform: scaleY(1); }
          46% { transform: scaleY(0.08); }
        }

        .pp-speak-mouth {
          position: absolute;
          left: 50%;
          top: 38px;
          width: 18px;
          height: 5px;
          transform: translateX(-50%);
          background: #7c2d12;
          border-radius: 0 0 10px 10px;
          transition: all .15s ease;
          overflow: hidden;
        }

        .pp-speak-mouth::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -1px;
          width: 10px;
          height: 5px;
          transform: translateX(-50%);
          background: #ef9aa8;
          border-radius: 10px 10px 0 0;
          opacity: .9;
        }

        .pp-speak-panel.is-speaking .pp-speak-mouth {
          animation: ppTalkMouth .16s ease-in-out infinite alternate;
        }

        .pp-speak-panel.is-paused .pp-speak-mouth {
          animation: none;
          height: 4px;
          top: 39px;
        }

        @keyframes ppTalkMouth {
          0% {
            height: 5px;
            top: 38px;
          }
          100% {
            height: 14px;
            top: 32px;
          }
        }

        .pp-speak-avatar-meta {
          min-width: 0;
        }

        .pp-speak-avatar-name {
          font-size: 15px;
          font-weight: 850;
          color: #172033;
          margin: 0 0 3px;
        }

        .pp-speak-avatar-role {
          margin: 0;
          color: #6b7280;
          font-size: 12px;
        }

        .pp-speak-avatar-caption {
          margin-top: 8px;
          color: #4b5563;
          font-size: 12px;
          line-height: 1.45;
          min-height: 34px;
        }

        .pp-speak-wave {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 24px;
          margin-top: 8px;
        }

        .pp-speak-wave span {
          display: block;
          width: 5px;
          height: 8px;
          background: linear-gradient(180deg, #f59e0b, #d97706);
          border-radius: 999px;
          opacity: .45;
          transform-origin: bottom center;
        }

        .pp-speak-panel.is-speaking .pp-speak-wave span {
          opacity: 1;
          animation: ppWaveBounce 1s ease-in-out infinite;
        }

        .pp-speak-panel.is-speaking .pp-speak-wave span:nth-child(2) { animation-delay: .1s; }
        .pp-speak-panel.is-speaking .pp-speak-wave span:nth-child(3) { animation-delay: .2s; }
        .pp-speak-panel.is-speaking .pp-speak-wave span:nth-child(4) { animation-delay: .3s; }
        .pp-speak-panel.is-speaking .pp-speak-wave span:nth-child(5) { animation-delay: .4s; }

        @keyframes ppWaveBounce {
          0%,100% { transform: scaleY(.5); }
          50% { transform: scaleY(2.2); }
        }

        .pp-speak-row {
          display: grid;
          gap: 6px;
        }

        .pp-speak-label {
          font-size: 11px;
          color: #6b7280;
          font-weight: 800;
          letter-spacing: .01em;
        }

        .pp-speak-grid3,
        .pp-speak-actions,
        .pp-speak-actions2 {
          display: grid;
          gap: 8px;
        }

        .pp-speak-grid3 {
          grid-template-columns: 1fr 1fr 1fr;
        }

        .pp-speak-actions {
          grid-template-columns: repeat(3, 1fr);
        }

        .pp-speak-actions2 {
          grid-template-columns: repeat(2, 1fr);
        }

        .pp-speak-select,
        .pp-speak-btn {
          border-radius: 12px;
          border: 1px solid rgba(217,119,6,.14);
          background: rgba(255,255,255,.96);
          color: #172033;
          font-size: 13px;
          padding: 10px 11px;
          width: 100%;
          box-sizing: border-box;
          outline: none;
        }

        .pp-speak-select:focus,
        .pp-speak-btn:focus,
        .pp-speak-icon-btn:focus {
          box-shadow: 0 0 0 3px rgba(245,158,11,.18);
        }

        .pp-speak-btn {
          cursor: pointer;
          font-weight: 800;
          background: linear-gradient(135deg, #d97706, #f59e0b);
          color: #fff;
          border: none;
          box-shadow: 0 10px 24px rgba(217,119,6,.20);
        }

        .pp-speak-btn.secondary {
          background: rgba(255,255,255,.96);
          color: #b45309;
          border: 1px solid rgba(217,119,6,.14);
          box-shadow: none;
        }

        .pp-speak-btn.pp-whatsapp-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #25D366, #128C7E);
          color: #ffffff;
          box-shadow:
            0 14px 30px rgba(18, 140, 126, .28),
            0 8px 18px rgba(37, 211, 102, .18);
          animation: ppWhatsappFloat 2.7s ease-in-out infinite;
        }

        .pp-speak-btn.pp-whatsapp-btn:hover {
          transform: translateY(-2px) scale(1.01);
        }

        .pp-speak-btn.pp-whatsapp-btn::before {
          content: "";
          position: absolute;
          top: -120%;
          left: -40%;
          width: 42%;
          height: 320%;
          transform: rotate(24deg);
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,.18) 45%,
            rgba(255,255,255,.42) 50%,
            rgba(255,255,255,.18) 55%,
            rgba(255,255,255,0) 100%
          );
          animation: ppWhatsappShine 3.2s linear infinite;
          pointer-events: none;
        }

        .pp-whatsapp-mini {
          background: linear-gradient(135deg, #25D366, #128C7E);
          color: #fff;
          border: none;
          box-shadow: 0 10px 20px rgba(18,140,126,.22);
          animation: ppWhatsappFloat 2.7s ease-in-out infinite;
        }

        @keyframes ppWhatsappFloat {
          0% {
            transform: translateY(0px);
            box-shadow:
              0 14px 30px rgba(18, 140, 126, .24),
              0 8px 18px rgba(37, 211, 102, .14);
          }
          50% {
            transform: translateY(-6px);
            box-shadow:
              0 20px 34px rgba(18, 140, 126, .30),
              0 12px 24px rgba(37, 211, 102, .18);
          }
          100% {
            transform: translateY(0px);
            box-shadow:
              0 14px 30px rgba(18, 140, 126, .24),
              0 8px 18px rgba(37, 211, 102, .14);
          }
        }

        @keyframes ppWhatsappShine {
          0% { left: -55%; }
          100% { left: 125%; }
        }

        .pp-speak-meta {
          display: grid;
          gap: 7px;
          background: rgba(255,255,255,.82);
          border: 1px solid rgba(217,119,6,.10);
          border-radius: 14px;
          padding: 10px 11px;
        }

        .pp-speak-progress {
          height: 8px;
          background: rgba(217,119,6,.10);
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
          font-size: 12px;
          color: #4b5563;
          line-height: 1.45;
        }

        .pp-speak-status {
          font-weight: 700;
        }

        .pp-hamburger svg {
          width: 17px;
          height: 17px;
          display: block;
        }

        @media (prefers-reduced-motion: reduce) {
          .pp-speak-btn.pp-whatsapp-btn,
          .pp-whatsapp-mini,
          .pp-speak-btn.pp-whatsapp-btn::before,
          .pp-speak-avatar,
          .pp-speak-panel.is-speaking .pp-speak-mouth,
          .pp-speak-panel.is-speaking .pp-speak-avatar-glow,
          .pp-speak-panel.is-speaking .pp-speak-wave span {
            animation: none !important;
          }

          .${this.options.activeClass} {
            transition: none;
          }
        }

        @media (max-width: 640px) {
          .pp-speak-panel {
            right: 10px;
            left: 10px;
            bottom: 10px;
            width: auto;
          }

          .pp-speak-grid3,
          .pp-speak-actions,
          .pp-speak-actions2 {
            grid-template-columns: 1fr;
          }

          .pp-speak-title-btn {
            margin-left: 0;
            margin-top: 10px;
          }

          .pp-speak-avatar-shell {
            grid-template-columns: 72px 1fr;
          }

          .pp-speak-avatar-wrap {
            width: 72px;
            height: 72px;
          }

          .pp-speak-avatar-glow {
            width: 72px;
            height: 72px;
          }

          .pp-speak-avatar {
            width: 62px;
            height: 62px;
          }

          .pp-speak-panel.mini {
            left: auto;
            width: auto;
          }
        }
      `;
      document.head.appendChild(style);
    },

    createControls() {
      if (document.getElementById(this.options.controlsContainerId)) return;

      const whatsappBodyRow = this.options.whatsappEnabled
        ? `
          <div class="pp-speak-row">
            <button
              type="button"
              class="pp-speak-btn pp-whatsapp-btn"
              id="pp-whatsapp-contact"
              aria-label="Contact Champak Roy on WhatsApp"
              title="Contact Champak Roy on WhatsApp"
            >
              ${this.escapeHtml(this.options.whatsappLabel)}
            </button>
          </div>
        `
        : "";

      const whatsappMiniButton = this.options.whatsappEnabled
        ? `
          <button
            type="button"
            class="pp-speak-icon-btn pp-whatsapp-mini"
            id="pp-speak-mini-whatsapp"
            title="WhatsApp"
            aria-label="WhatsApp"
          >💬</button>
        `
        : "";

      const panel = document.createElement("div");
      panel.id = this.options.controlsContainerId;
      panel.className = "pp-speak-panel";
      panel.innerHTML = `
        <div class="pp-speak-head" id="pp-speak-drag-handle">
          <div class="pp-speak-topline">
            <div>
              <div class="pp-speak-kicker">Auto Narration V5 Premium</div>
              <h3 class="pp-speak-title">Speak Player</h3>
              <p class="pp-speak-sub">Reads speak paragraphs, scrolls, highlights, and shows a live talking avatar.</p>
            </div>

            <div class="pp-speak-head-actions">
              <button type="button" class="pp-speak-icon-btn" id="pp-speak-mini-toggle" title="Collapse / expand panel" aria-label="Collapse or expand panel">
                <span class="pp-hamburger" id="pp-speak-mini-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                    <line x1="4" y1="7" x2="20" y2="7"></line>
                    <line x1="4" y1="12" x2="20" y2="12"></line>
                    <line x1="4" y1="17" x2="20" y2="17"></line>
                  </svg>
                </span>
              </button>

              <button type="button" class="pp-speak-icon-btn" id="pp-speak-reset-pos" title="Reset position" aria-label="Reset position">⌂</button>
            </div>
          </div>
        </div>

        <div class="pp-speak-body">
          <div class="pp-speak-avatar-shell">
            <div class="pp-speak-avatar-wrap">
              <div class="pp-speak-avatar-glow"></div>
              <div class="pp-speak-avatar">
                <div class="pp-speak-hair"></div>
                <div class="pp-speak-face">
                  <div class="pp-speak-eye left"></div>
                  <div class="pp-speak-eye right"></div>
                  <div class="pp-speak-mouth"></div>
                </div>
              </div>
            </div>

            <div class="pp-speak-avatar-meta">
              <div class="pp-speak-avatar-name">${this.escapeHtml(this.options.avatarName)}</div>
              <p class="pp-speak-avatar-role">${this.escapeHtml(this.options.avatarSubtitle)}</p>
              <div class="pp-speak-avatar-caption" id="pp-speak-avatar-caption">Waiting to start narration.</div>
              <div class="pp-speak-wave" aria-hidden="true">
                <span></span><span></span><span></span><span></span><span></span>
              </div>
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
                <option value="0.75">0.75x</option>
                <option value="0.9">0.9x</option>
                <option value="1">1x</option>
                <option value="1.1">1.1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
              </select>
            </div>

            <div class="pp-speak-row">
              <label class="pp-speak-label" for="pp-speak-pitch">Pitch</label>
              <select id="pp-speak-pitch" class="pp-speak-select">
                <option value="0.7">0.7</option>
                <option value="0.85">0.85</option>
                <option value="1">1.0</option>
                <option value="1.15">1.15</option>
                <option value="1.3">1.3</option>
              </select>
            </div>

            <div class="pp-speak-row">
              <label class="pp-speak-label" for="pp-speak-voice">Voice</label>
              <select id="pp-speak-voice" class="pp-speak-select">
                <option value="">Default</option>
              </select>
            </div>
          </div>

          <div class="pp-speak-actions">
            <button type="button" class="pp-speak-btn secondary" id="pp-speak-prev">Prev</button>
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

          ${whatsappBodyRow}
        </div>

        <div class="pp-speak-mini-row">
          <button type="button" class="pp-speak-icon-btn" id="pp-speak-mini-toggle-2" title="Expand">☰</button>
          <button type="button" class="pp-speak-icon-btn" id="pp-speak-mini-play" title="Start or resume">▶</button>
          <div class="pp-speak-mini-main">
            <strong id="pp-speak-mini-title">Ready</strong>
            <span id="pp-speak-mini-text">Tap play.</span>
          </div>
          <button type="button" class="pp-speak-icon-btn" id="pp-speak-mini-next" title="Next">⏭</button>
          ${whatsappMiniButton}
        </div>
      `;

      document.body.appendChild(panel);

      panel.querySelector("#pp-speak-start").addEventListener("click", () => {
        const select = document.getElementById("pp-speak-start-at");
        const idx = parseInt(select.value, 10) || 0;
        this.options.rate = parseFloat(document.getElementById("pp-speak-rate").value) || 1;
        this.options.pitch = parseFloat(document.getElementById("pp-speak-pitch").value) || 1;
        this.options.voiceName = document.getElementById("pp-speak-voice").value || "";
        this.savePreferences();
        this.start(idx);
      });

      panel.querySelector("#pp-speak-pause").addEventListener("click", () => {
        if (this.paused) this.resume();
        else this.pause();
      });

      panel.querySelector("#pp-speak-stop").addEventListener("click", () => this.stop());
      panel.querySelector("#pp-speak-prev").addEventListener("click", () => this.previous());
      panel.querySelector("#pp-speak-next").addEventListener("click", () => this.next());

      panel.querySelector("#pp-speak-rate").addEventListener("change", (e) => {
        this.options.rate = parseFloat(e.target.value) || 1;
        this.savePreferences();
      });

      panel.querySelector("#pp-speak-pitch").addEventListener("change", (e) => {
        this.options.pitch = parseFloat(e.target.value) || 1;
        this.savePreferences();
      });

      panel.querySelector("#pp-speak-voice").addEventListener("change", (e) => {
        this.options.voiceName = e.target.value || "";
        this.savePreferences();
      });

      panel.querySelector("#pp-speak-mini-toggle").addEventListener("click", () => {
        this.toggleMiniMode();
      });

      panel.querySelector("#pp-speak-mini-toggle-2").addEventListener("click", () => {
        this.toggleMiniMode(false);
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

      const whatsappBtn = panel.querySelector("#pp-whatsapp-contact");
      if (whatsappBtn) {
        whatsappBtn.addEventListener("click", () => this.openWhatsApp());
      }

      const whatsappMiniBtn = panel.querySelector("#pp-speak-mini-whatsapp");
      if (whatsappMiniBtn) {
        whatsappMiniBtn.addEventListener("click", () => this.openWhatsApp());
      }

      this.refreshStartDropdown();
      this.updateMiniToggleIcon();

      if (this.options.draggable) {
        this.enableDragging(panel, panel.querySelector("#pp-speak-drag-handle"));
      }
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

        this.dragged = false;
        isDragging = true;

        const rect = panel.getBoundingClientRect();
        panel.style.right = "auto";
        panel.style.bottom = "auto";
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

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          this.dragged = true;
        }

        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight);

        newLeft = Math.max(0, Math.min(maxLeft, newLeft));
        newTop = Math.max(0, Math.min(maxTop, newTop));

        panel.style.left = newLeft + "px";
        panel.style.top = newTop + "px";
      };

      const onPointerUp = () => {
        if (isDragging) {
          this.savePanelPosition();
        }

        isDragging = false;
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      };

      handle.addEventListener("pointerdown", onPointerDown);
    },

    savePanelPosition() {
      const panel = document.getElementById(this.options.controlsContainerId);
      if (!panel) return;

      const rect = panel.getBoundingClientRect();
      const data = {
        left: rect.left,
        top: rect.top
      };

      try {
        localStorage.setItem(this.options.storageKeyPosition, JSON.stringify(data));
      } catch (err) {
        this.log("Could not save panel position.");
      }
    },

    restorePanelPosition() {
      const panel = document.getElementById(this.options.controlsContainerId);
      if (!panel) return;

      try {
        const raw = localStorage.getItem(this.options.storageKeyPosition);
        if (!raw) return;

        const data = JSON.parse(raw);
        if (!data || typeof data.left !== "number" || typeof data.top !== "number") return;

        const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight);

        panel.style.right = "auto";
        panel.style.bottom = "auto";
        panel.style.left = Math.max(0, Math.min(maxLeft, data.left)) + "px";
        panel.style.top = Math.max(0, Math.min(maxTop, data.top)) + "px";
      } catch (err) {
        this.log("Could not restore panel position.");
      }
    },

    resetPanelPosition() {
      const panel = document.getElementById(this.options.controlsContainerId);
      if (!panel) return;

      panel.style.left = "";
      panel.style.top = "";
      panel.style.right = "14px";
      panel.style.bottom = "14px";

      try {
        localStorage.removeItem(this.options.storageKeyPosition);
      } catch (err) {
        this.log("Could not clear saved panel position.");
      }
    },

    saveMiniMode(isMini) {
      try {
        localStorage.setItem(this.options.storageKeyMiniMode, isMini ? "1" : "0");
      } catch (err) {
        this.log("Could not save mini mode.");
      }
    },

    restoreMiniMode() {
      const panel = document.getElementById(this.options.controlsContainerId);
      if (!panel) return;

      try {
        const raw = localStorage.getItem(this.options.storageKeyMiniMode);
        if (raw === "1") {
          panel.classList.add("mini");
        } else if (raw === "0") {
          panel.classList.remove("mini");
        } else if (this.options.miniModeDefault) {
          panel.classList.add("mini");
        }
      } catch (err) {
        if (this.options.miniModeDefault) {
          panel.classList.add("mini");
        }
      }

      this.updateMiniToggleIcon();
    },

    toggleMiniMode(forceValue) {
      const panel = document.getElementById(this.options.controlsContainerId);
      if (!panel) return;

      const makeMini =
        typeof forceValue === "boolean"
          ? forceValue
          : !panel.classList.contains("mini");

      panel.classList.toggle("mini", makeMini);
      this.saveMiniMode(makeMini);
      this.updateMiniToggleIcon();
    },

    restorePreferences() {
      try {
        const savedRate = localStorage.getItem(this.options.storageKeyRate);
        const savedPitch = localStorage.getItem(this.options.storageKeyPitch);
        const savedVoice = localStorage.getItem(this.options.storageKeyVoice);

        if (savedRate) this.options.rate = parseFloat(savedRate) || this.options.rate;
        if (savedPitch) this.options.pitch = parseFloat(savedPitch) || this.options.pitch;
        if (savedVoice !== null) this.options.voiceName = savedVoice;
      } catch (err) {
        this.log("Could not restore preferences.");
      }
    },

    savePreferences() {
      try {
        localStorage.setItem(this.options.storageKeyRate, String(this.options.rate));
        localStorage.setItem(this.options.storageKeyPitch, String(this.options.pitch));
        localStorage.setItem(this.options.storageKeyVoice, String(this.options.voiceName || ""));
      } catch (err) {
        this.log("Could not save preferences.");
      }
    },

    updateMiniToggleIcon() {
      const panel = document.getElementById(this.options.controlsContainerId);
      const iconWrap = document.getElementById("pp-speak-mini-icon");
      const btn = document.getElementById("pp-speak-mini-toggle");
      if (!panel || !iconWrap || !btn) return;

      const isMini = panel.classList.contains("mini");

      if (isMini) {
        iconWrap.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line x1="4" y1="7" x2="20" y2="7"></line>
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <line x1="4" y1="17" x2="20" y2="17"></line>
          </svg>
        `;
        btn.title = "Expand panel";
        btn.setAttribute("aria-label", "Expand panel");
      } else {
        iconWrap.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        `;
        btn.title = "Collapse panel";
        btn.setAttribute("aria-label", "Collapse panel");
      }
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
        if (this.options.readSpeak0First) {
          this.startFromId("speak0");
        } else {
          this.start(0);
        }
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

      const current = this.options.voiceName || "";
      select.innerHTML =
        `<option value="">Default</option>` +
        voices.map((v) => {
          const value = this.escapeHtml(v.name);
          const label = this.escapeHtml(v.name + (v.lang ? " (" + v.lang + ")" : ""));
          return `<option value="${value}">${label}</option>`;
        }).join("");

      if (current) {
        select.value = current;
      }

      const rateEl = document.getElementById("pp-speak-rate");
      const pitchEl = document.getElementById("pp-speak-pitch");
      if (rateEl) rateEl.value = String(this.options.rate);
      if (pitchEl) pitchEl.value = String(this.options.pitch);
    },

    getVoice() {
      const voices = ("speechSynthesis" in window) ? speechSynthesis.getVoices() : [];
      if (!voices.length) return null;

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

      if (item.scrollTarget && item.scrollTarget !== item.el && !this.isHidden(item.scrollTarget)) {
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

    activateAvatarSpeaking() {
      const panel = document.getElementById(this.options.controlsContainerId);
      if (!panel) return;
      panel.classList.add("is-speaking");
      panel.classList.remove("is-paused");
    },

    activateAvatarPaused() {
      const panel = document.getElementById(this.options.controlsContainerId);
      if (!panel) return;
      panel.classList.remove("is-speaking");
      panel.classList.add("is-paused");
    },

    activateAvatarIdle() {
      const panel = document.getElementById(this.options.controlsContainerId);
      if (!panel) return;
      panel.classList.remove("is-speaking", "is-paused");
    },

    setAvatarCaption(text) {
      const el = document.getElementById("pp-speak-avatar-caption");
      if (el) el.textContent = text;
    },

    start(startAt) {
      if (!("speechSynthesis" in window)) {
        this.setStatus("Speech synthesis is not supported in this browser.");
        this.setAvatarCaption("Speech synthesis is not supported in this browser.");
        return;
      }

      if (!this.items.length) this.collectItems();
      if (!this.items.length) {
        this.setStatus("No speak paragraphs found.");
        this.setAvatarCaption("No speak paragraphs were found.");
        return;
      }

      speechSynthesis.cancel();
      this.running = true;
      this.paused = false;
      this.speaking = false;

      if (typeof startAt === "number") {
        this.currentIndex = Math.max(0, Math.min(startAt, this.items.length - 1));
      } else if (this.options.readSpeak0First) {
        const speak0Index = this.items.findIndex(item => item.id === "speak0");
        this.currentIndex = speak0Index >= 0 ? speak0Index : 0;
      } else {
        this.currentIndex = 0;
      }

      this.speakCurrent();
    },

    startFromId(id) {
      const index = this.items.findIndex((item) => item.id === id);
      if (index >= 0) this.start(index);
    },

    stop() {
      this.running = false;
      this.paused = false;
      this.speaking = false;
      this.activeUtterance = null;
      this.currentIndex = 0;
      this.clearActive();

      if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
      }

      this.activateAvatarIdle();
      this.setAvatarCaption("Waiting to start narration.");
      this.setStatus("Stopped.");
      this.setCurrent("No paragraph selected.");
      this.updateProgress();
      this.updatePauseButton();
      this.updateMiniPlayButton();
      this.updateMiniText("Ready", "Tap play.");
      this.updateStartAtDropdownValue();
    },

    pause() {
      if (!this.running || this.paused) return;
      this.paused = true;

      if ("speechSynthesis" in window) {
        try {
          speechSynthesis.pause();
        } catch (err) {
          this.log("Pause not supported cleanly.");
        }
      }

      this.activateAvatarPaused();
      this.setAvatarCaption("Narration is paused.");
      this.setStatus("Paused.");
      this.updatePauseButton();
      this.updateMiniPlayButton();
    },

    resume() {
      if (!this.running || !this.paused) return;
      this.paused = false;

      if ("speechSynthesis" in window) {
        try {
          speechSynthesis.resume();
        } catch (err) {
          this.log("Resume failed, restarting current paragraph.");
          this.speakCurrent();
          return;
        }
      }

      this.activateAvatarSpeaking();
      this.setAvatarCaption("Narration has resumed.");
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
        this.running = false;
        this.paused = false;
        this.speaking = false;
        this.activeUtterance = null;
        this.clearActive();
        this.activateAvatarIdle();
        this.setAvatarCaption("Narration finished.");
        this.setStatus("Completed.");
        this.setCurrent("Narration finished.");
        this.updateProgress();
        this.updatePauseButton();
        this.updateMiniPlayButton();
        this.updateMiniText("Completed", "Narration finished.");
        this.currentIndex = 0;
        this.updateStartAtDropdownValue();
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
      this.activateAvatarSpeaking();
      this.setAvatarCaption(this.truncate(item.text, 110));
      this.setStatus("Speaking " + item.id + "...");
      this.setCurrent(item.id + ": " + this.truncate(item.text, 120));
      this.updateProgress();
      this.updateStartAtDropdownValue();
      this.updatePauseButton();
      this.updateMiniPlayButton();
      this.updateMiniText(item.id, this.truncate(item.text, 40));

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
      this.updateMiniToggleIcon();
      this.updateStartAtDropdownValue();
      this.setAvatarCaption("Waiting to start narration.");
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
      window.PPSpeakV5 = {
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
          this.updateStartAtDropdownValue();
        },
        toggleMiniMode: (value) => this.toggleMiniMode(value),
        resetPanelPosition: () => this.resetPanelPosition(),
        openWhatsApp: () => this.openWhatsApp(),
        getItems: () => this.items.slice()
      };

      window.PPSpeakV3 = window.PPSpeakV5;
    }
  };

  function boot() {
    PPSpeakV5.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
 
