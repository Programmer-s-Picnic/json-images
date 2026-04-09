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
    - On success, access is remembered only for today's date
    - If the date changes, password is asked again

    Important:
    - No page-level config required
    - No daily HTML edits required
    - Still client-side only
  */

  var PASSWORD_HASH = "925fb0b7c5a3cca7192c6672f498b2c62811e80712c3c96430206b3eb2126589";

  var CONFIG = {
    titlePrefix: "Protected Page",
    badgeText: "Protected lesson",
    introText: "This page is password protected. Enter the password to continue.",
    maxAttempts: 10,
    blurBackground: true,
    lockScroll: true,
    showResetButton: true,
    timezone: "Asia/Kolkata",
    storageNamespace: "pp_page_pwd_v3"
  };

  var styleId = "pp-pwd-style";
  var overlayId = "pp-pwd-overlay";
  var rootAttr = "data-pp-pwd-ready";
  var unlockedAttr = "data-pp-pwd-unlocked";
  var scrollLockAttr = "data-pp-pwd-lock-scroll";
  var bodyBlurClass = "pp-pwd-blur";

  var currentPageKey = location.origin + location.pathname;
  var unlockKey = CONFIG.storageNamespace + "::unlock::" + currentPageKey;
  var attemptKey = CONFIG.storageNamespace + "::attempts::" + currentPageKey;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function injectStyle() {
    if (document.getElementById(styleId)) return;

    var css = `
html[${rootAttr}="1"][${scrollLockAttr}="1"]:not([${unlockedAttr}="1"]) {
  overflow: hidden !important;
}

/* Biggest bug fixed here:
   Hide page content, but DO NOT hide the overlay itself. */
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

#${overlayId} .pp-clear {
  background: #fff;
  color: #d97706;
  border: 1px solid #ead7b0;
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

  function getTodayISODateInTimezone() {
    try {
      var fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: CONFIG.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });

      var parts = fmt.formatToParts(new Date());
      var y = "";
      var m = "";
      var d = "";

      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === "year") y = parts[i].value;
        if (parts[i].type === "month") m = parts[i].value;
        if (parts[i].type === "day") d = parts[i].value;
      }

      return y + "-" + m + "-" + d;
    } catch (e) {
      var now = new Date();
      var yyyy = now.getUTCFullYear();
      var mm = String(now.getUTCMonth() + 1).padStart(2, "0");
      var dd = String(now.getUTCDate()).padStart(2, "0");
      return yyyy + "-" + mm + "-" + dd;
    }
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

  function clearSavedAccess() {
    try {
      localStorage.removeItem(unlockKey);
      localStorage.removeItem(attemptKey);
    } catch (e) {}
  }

  function saveTodayConfirmation() {
    try {
      localStorage.setItem(
        unlockKey,
        JSON.stringify({
          ok: 1,
          date: getTodayISODateInTimezone(),
          ts: Date.now()
        })
      );
    } catch (e) {}
  }

  function isTodayConfirmed() {
    try {
      var raw = localStorage.getItem(unlockKey);
      if (!raw) return false;

      var data = JSON.parse(raw);
      if (!data || data.ok !== 1) return false;

      return String(data.date || "") === getTodayISODateInTimezone();
    } catch (e) {
      return false;
    }
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
            (CONFIG.showResetButton
              ? '<button type="button" class="pp-clear" id="pp-pwd-clear">Reset saved access</button>'
              : '') +
          '</div>' +
          '<div class="pp-msg" id="pp-pwd-msg" aria-live="polite"></div>' +
        '</div>' +
        '<div class="pp-meta" id="pp-pwd-meta"></div>' +
        '<div class="pp-foot">Password access is remembered only for the current date.</div>' +
      '</div>';

    document.body.appendChild(overlay);

    var card = overlay.querySelector(".pp-card");
    var input = document.getElementById("pp-pwd-input");
    var submit = document.getElementById("pp-pwd-submit");
    var clear = document.getElementById("pp-pwd-clear");
    var msg = document.getElementById("pp-pwd-msg");
    var meta = document.getElementById("pp-pwd-meta");

    function setMsg(text, ok) {
      msg.textContent = text || "";
      msg.className = "pp-msg " + (ok ? "pp-ok" : "pp-error");
    }

    function renderMeta() {
      meta.textContent =
        "Today: " + getTodayISODateInTimezone() +
        " • Timezone: " + CONFIG.timezone +
        " • Attempts used: " + getAttempts() + "/" + Number(CONFIG.maxAttempts || 0);
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
      if (clear) clear.disabled = true;
      setMsg("Checking password...", true);

      try {
        var candidateHash = await sha256Hex(val);

        if (PASSWORD_HASH && candidateHash === PASSWORD_HASH) {
          setAttempts(0);
          saveTodayConfirmation();
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
        if (clear) clear.disabled = false;
      }
    }

    submit.addEventListener("click", function () {
      tryUnlock();
    });

    if (clear) {
      clear.addEventListener("click", function () {
        clearSavedAccess();
        setMsg("Saved access cleared for this page.", true);
        input.focus();
        renderMeta();
      });
    }

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

    if (isTodayConfirmed()) {
      markUnlocked();
      return;
    }

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
    clearSavedAccess: clearSavedAccess,
    getTodayISODateInTimezone: getTodayISODateInTimezone,
    sha256Hex: sha256Hex,
    version: "3.0.1"
  };
})();