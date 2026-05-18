(function () {
  "use strict";
  // alert("Started");

  /*
    Programmer's Picnic Password Guard
    ----------------------------------
    Usage:
      <script src="https://programmer-s-picnic.github.io/json-images/pwd.js"></script>

    How it works:
    - This file stores the SHA-256 password hash internally
    - User enters the plain password
    - This script hashes it and compares
    - If correct, access is remembered for the current date
    - Access is stored per URL (origin + pathname)
    - When the date changes, password is asked again

    Important:
    - No page-level config required
    - Still client-side only
  */

  var PASSWORD_HASH = "3711f3330dc2f1bdb4339b71518a4b8d0a9b8f6d9cc711ee4f0965ca5b8de536";

  var CONFIG = {
    titlePrefix: "Protected Page",
    badgeText: "Protected lesson",
    introText: "This page is password protected. Enter the password to continue.",
    maxAttempts: 10,
    blurBackground: true,
    lockScroll: true
  };

  var styleId = "pp-pwd-style";
  var overlayId = "pp-pwd-overlay";
  var rootAttr = "data-pp-pwd-ready";
  var unlockedAttr = "data-pp-pwd-unlocked";
  var scrollLockAttr = "data-pp-pwd-lock-scroll";
  var bodyBlurClass = "pp-pwd-blur";

  var currentPageKey = location.origin + location.pathname;
  var attemptKey = "pp_page_pwd_v5::attempts::" + currentPageKey;
  var unlockKey = "pp_page_pwd_v5::unlock::" + currentPageKey;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getTodayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function getStoredUnlock() {
    try {
      var raw = localStorage.getItem(unlockKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function setStoredUnlock() {
    try {
      localStorage.setItem(
        unlockKey,
        JSON.stringify({
          date: getTodayKey(),
          page: currentPageKey,
          ok: true
        })
      );
    } catch (e) {}
  }

  function clearStoredUnlock() {
    try {
      localStorage.removeItem(unlockKey);
    } catch (e) {}
  }

  function hasValidUnlockForToday() {
    var saved = getStoredUnlock();
    if (!saved) return false;
    return saved.ok === true &&
           saved.page === currentPageKey &&
           saved.date === getTodayKey();
  }

  function injectStyle() {
    if (document.getElementById(styleId)) return;

    var css = `
html[${rootAttr}="1"][${scrollLockAttr}="1"]:not([${unlockedAttr}="1"]) {
  overflow: hidden !important;
}

/* Hide page content, but NOT the overlay */
html[${rootAttr}="1"]:not([${unlockedAttr}="1"]) body > *:not(#${overlayId}) {
  visibility: hidden !important;
}

#${overlayId} {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background:
    radial-gradient(circle at top right, rgba(245,158,11,0.18), transparent 24%),
    radial-gradient(circle at bottom left, rgba(217,119,6,0.10), transparent 28%),
    #fff8eb;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
}

#${overlayId} * {
  box-sizing: border-box;
}

#${overlayId}.pp-hidden {
  display: none !important;
}

#${overlayId} .pp-card {
  width: min(100%, 470px);
  background: #ffffff;
  border: 1px solid #ead7b0;
  border-radius: 20px;
  box-shadow: 0 18px 48px rgba(217,119,6,0.14);
  padding: 24px;
}

#${overlayId} .pp-badge {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  background: #fff1cc;
  border: 1px solid #efd393;
  color: #8a5206;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 12px;
}

#${overlayId} h1 {
  margin: 0 0 10px;
  font-size: 1.5rem;
  line-height: 1.2;
  color: #d97706;
}

#${overlayId} p {
  margin: 0 0 14px;
  color: #4b5563;
  line-height: 1.6;
}

#${overlayId} .pp-row {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

#${overlayId} input[type="password"] {
  width: 100%;
  padding: 13px 14px;
  border-radius: 12px;
  border: 1px solid #ead7b0;
  outline: none;
  font-size: 16px;
  background: #fffdfa;
  color: #1f2937;
}

#${overlayId} input[type="password"]:focus {
  border-color: #d97706;
  box-shadow: 0 0 0 4px rgba(217,119,6,0.10);
}

#${overlayId} .pp-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

#${overlayId} button {
  appearance: none;
  border: none;
  cursor: pointer;
  border-radius: 12px;
  padding: 12px 16px;
  font-weight: 700;
  font-size: 15px;
}

#${overlayId} .pp-open {
  background: linear-gradient(135deg, #d97706, #f59e0b);
  color: #fff;
  box-shadow: 0 10px 22px rgba(217,119,6,0.18);
}

#${overlayId} .pp-msg {
  min-height: 22px;
  font-size: 14px;
  font-weight: 600;
}

#${overlayId} .pp-msg.pp-error {
  color: #991b1b;
}

#${overlayId} .pp-msg.pp-ok {
  color: #166534;
}

#${overlayId} .pp-foot {
  margin-top: 12px;
  font-size: 12px;
  color: #6b7280;
}

#${overlayId} .pp-meta {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

body.${bodyBlurClass} > *:not(#${overlayId}) {
  filter: blur(8px);
  pointer-events: none !important;
  user-select: none !important;
}

#${overlayId} .pp-sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0,0,0,0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
`;
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function getAttempts() {
    try {
      var v = localStorage.getItem(attemptKey);
      return v ? Number(v) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  function setAttempts(v) {
    try {
      localStorage.setItem(attemptKey, String(v));
    } catch (e) {}
  }

  function clearAttempts() {
    try {
      localStorage.removeItem(attemptKey);
    } catch (e) {}
  }

  function applyRootState() {
    document.documentElement.setAttribute(rootAttr, "1");
    document.documentElement.setAttribute(scrollLockAttr, CONFIG.lockScroll ? "1" : "0");
  }

  function markUnlocked() {
    document.documentElement.setAttribute(unlockedAttr, "1");
    document.body.classList.remove(bodyBlurClass);

    var el = document.getElementById(overlayId);
    if (el) el.classList.add("pp-hidden");
  }

  async function sha256Hex(text) {
    var data = new TextEncoder().encode(String(text));
    var hashBuffer = await crypto.subtle.digest("SHA-256", data);
    var bytes = Array.from(new Uint8Array(hashBuffer));
    return bytes.map(function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
  }

  function getFocusable(container) {
    return Array.prototype.slice.call(
      container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
  }

  function trapFocus(modal) {
    modal.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;

      var focusables = getFocusable(modal);
      if (!focusables.length) return;

      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === modal) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  function buildOverlay() {
    if (document.getElementById(overlayId)) return;

    var pageTitle = document.title || CONFIG.titlePrefix;

    var overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.innerHTML =
      '<div class="pp-card" role="dialog" aria-modal="true" aria-labelledby="pp-pwd-title" aria-describedby="pp-pwd-desc">' +
        '<div class="pp-badge">' + escapeHtml(CONFIG.badgeText) + '</div>' +
        '<h1 id="pp-pwd-title">' + escapeHtml(pageTitle) + '</h1>' +
        '<p id="pp-pwd-desc">' + escapeHtml(CONFIG.introText) + '</p>' +
        '<div class="pp-row">' +
          '<label class="pp-sr-only" for="pp-pwd-input">Password</label>' +
          '<input id="pp-pwd-input" type="password" placeholder="Enter password" autocomplete="current-password" />' +
          '<div class="pp-actions">' +
            '<button type="button" class="pp-open" id="pp-pwd-submit">Open page</button>' +
          '</div>' +
          '<div class="pp-msg" id="pp-pwd-msg" aria-live="polite"></div>' +
        '</div>' +
        '<div class="pp-meta" id="pp-pwd-meta"></div>' +
        '<div class="pp-foot">This page opens after correct password verification and remains open for this URL for today.</div>' +
      '</div>';

    document.body.appendChild(overlay);

    var card = overlay.querySelector(".pp-card");
    var input = document.getElementById("pp-pwd-input");
    var submit = document.getElementById("pp-pwd-submit");
    var msg = document.getElementById("pp-pwd-msg");
    var meta = document.getElementById("pp-pwd-meta");

    function setMsg(text, ok) {
      msg.textContent = text || "";
      msg.className = "pp-msg " + (ok ? "pp-ok" : "pp-error");
    }

    function renderMeta() {
      meta.textContent =
        "Attempts used: " + getAttempts() + "/" + Number(CONFIG.maxAttempts || 0) +
        " • Access date: " + getTodayKey();
    }

    async function tryUnlock() {
      var attempts = getAttempts();
      var maxAttempts = Number(CONFIG.maxAttempts || 0);

      if (maxAttempts > 0 && attempts >= maxAttempts) {
        setMsg("Too many incorrect attempts for this page.", false);
        renderMeta();
        return;
      }

      var val = String(input.value || "");
      if (!val) {
        setMsg("Please enter the password.", false);
        input.focus();
        renderMeta();
        return;
      }

      submit.disabled = true;
      setMsg("Checking password...", true);

      try {
        var candidateHash = await sha256Hex(val);

        if (PASSWORD_HASH && candidateHash === PASSWORD_HASH) {
          clearAttempts();
          setStoredUnlock();
          setMsg("Password accepted. Opening page...", true);
          markUnlocked();
          return;
        }

        attempts += 1;
        setAttempts(attempts);
        setMsg("Incorrect password. Please try again.", false);
        input.select();
        input.focus();
        renderMeta();
      } catch (e) {
        setMsg("Unable to verify password in this browser.", false);
        renderMeta();
      } finally {
        submit.disabled = false;
      }
    }

    submit.addEventListener("click", function () {
      tryUnlock();
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        tryUnlock();
      }
    });

    trapFocus(card);
    renderMeta();

    setTimeout(function () {
      input.focus();
    }, 40);
  }

  function init() {
    applyRootState();
    injectStyle();

    if (hasValidUnlockForToday()) {
      markUnlocked();
      return;
    }

    clearStoredUnlock();

    if (CONFIG.blurBackground) {
      document.body.classList.add(bodyBlurClass);
    }

    buildOverlay();
  }

  if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
    document.documentElement.setAttribute(rootAttr, "1");
    injectStyle();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        alert("This browser does not support secure password checking required by pwd.js.");
      }, { once: true });
    } else {
      alert("This browser does not support secure password checking required by pwd.js.");
    }
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.PP_PWD = {
    clearAttempts: clearAttempts,
    clearStoredUnlock: clearStoredUnlock,
    hasValidUnlockForToday: hasValidUnlockForToday,
    sha256Hex: sha256Hex,
    version: "5.0.0"
  };
})();
