(function () {
  "use strict";

  /*
    Programmer's Picnic password guard
    ----------------------------------
    How to use:
    1. Include this file in any page:
       <script src="https://programmer-s-picnic.github.io/json-images/pwd.js"></script>

    2. Optional page-level configuration before loading pwd.js:
       <script>
         window.PP_PAGE_PASSWORD = "java123";
       </script>
       <script src="https://programmer-s-picnic.github.io/json-images/pwd.js"></script>

    3. Optional whitelist:
       - add ?pp_unlock=java123 to URL
       - or use localStorage saved session after successful login

    Notes:
    - This is client-side protection only.
    - Good for lightweight lesson gating on static pages.
  */

  var DEFAULT_PASSWORD = "java123";
  var STORAGE_PREFIX = "pp_page_pwd_ok::";
  var ATTEMPT_KEY_PREFIX = "pp_page_pwd_attempts::";
  var TITLE_PREFIX = "Protected Page";
  var QUERY_KEY = "pp_unlock";

  var currentPageKey = location.origin + location.pathname;
  var storageKey = STORAGE_PREFIX + currentPageKey;
  var attemptKey = ATTEMPT_KEY_PREFIX + currentPageKey;

  var config = window.PP_PAGE_PASSWORD_CONFIG || {};
  var expectedPassword =
    String(window.PP_PAGE_PASSWORD || config.password || DEFAULT_PASSWORD);

  var pageTitle =
    String(config.title || document.title || TITLE_PREFIX);

  var maxAttempts = Number(config.maxAttempts || 9999);
  var rememberSuccess = config.rememberSuccess !== false;
  var allowQueryUnlock = config.allowQueryUnlock !== false;
  var blurBackground = config.blurBackground !== false;
  var lockScroll = config.lockScroll !== false;

  var styleId = "pp-pwd-style";
  var rootAttr = "data-pp-pwd-ready";
  var unlockedAttr = "data-pp-pwd-unlocked";
  var overlayId = "pp-pwd-overlay";

  function injectStyle() {
    if (document.getElementById(styleId)) return;

    var css = `
html[${rootAttr}="1"]:not([${unlockedAttr}="1"]) body {
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
#${overlayId} * { box-sizing: border-box; }
#${overlayId}.pp-hidden { display: none !important; }
#${overlayId} .pp-card {
  width: min(100%, 460px);
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
#${overlayId} .pp-msg.pp-error { color: #991b1b; }
#${overlayId} .pp-msg.pp-ok { color: #166534; }
#${overlayId} .pp-foot {
  margin-top: 12px;
  font-size: 12px;
  color: #6b7280;
}
html[${rootAttr}="1"]:not([${unlockedAttr}="1"]) {
  overflow: hidden !important;
}
body.pp-pwd-blur > *:not(#${overlayId}) {
  filter: blur(8px);
  pointer-events: none !important;
  user-select: none !important;
}
`;
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function getAttempts() {
    var v = localStorage.getItem(attemptKey);
    return v ? Number(v) || 0 : 0;
  }

  function setAttempts(v) {
    localStorage.setItem(attemptKey, String(v));
  }

  function markUnlocked() {
    if (rememberSuccess) {
      localStorage.setItem(storageKey, "1");
    }
    document.documentElement.setAttribute(unlockedAttr, "1");
    if (blurBackground) {
      document.body.classList.remove("pp-pwd-blur");
    }
    if (!lockScroll) {
      document.documentElement.style.overflow = "";
    }
    var el = document.getElementById(overlayId);
    if (el) el.classList.add("pp-hidden");
    try {
      document.body.style.visibility = "";
    } catch (e) {}
  }

  function alreadyUnlocked() {
    return localStorage.getItem(storageKey) === "1";
  }

  function unlockFromQuery() {
    if (!allowQueryUnlock) return false;
    try {
      var qs = new URLSearchParams(location.search);
      var val = qs.get(QUERY_KEY);
      if (val && val === expectedPassword) {
        if (rememberSuccess) localStorage.setItem(storageKey, "1");
        return true;
      }
    } catch (e) {}
    return false;
  }

  function clearSavedAccess() {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(attemptKey);
  }

  function buildOverlay() {
    if (document.getElementById(overlayId)) return;

    var overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.innerHTML = `
      <div class="pp-card" role="dialog" aria-modal="true" aria-labelledby="pp-pwd-title">
        <div class="pp-badge">Protected lesson</div>
        <h1 id="pp-pwd-title">${escapeHtml(pageTitle)}</h1>
        <p>This page is password protected. Enter the password to continue.</p>
        <div class="pp-row">
          <input id="pp-pwd-input" type="password" placeholder="Enter password" autocomplete="current-password" />
          <div class="pp-actions">
            <button type="button" class="pp-open" id="pp-pwd-submit">Open page</button>
            <button type="button" class="pp-clear" id="pp-pwd-clear">Reset saved access</button>
          </div>
          <div class="pp-msg" id="pp-pwd-msg" aria-live="polite"></div>
        </div>
        <div class="pp-foot">Protection is handled entirely by <code>pwd.js</code>.</div>
      </div>
    `;
    document.body.appendChild(overlay);

    var input = document.getElementById("pp-pwd-input");
    var submit = document.getElementById("pp-pwd-submit");
    var clear = document.getElementById("pp-pwd-clear");
    var msg = document.getElementById("pp-pwd-msg");

    function setMsg(text, ok) {
      msg.textContent = text || "";
      msg.className = "pp-msg " + (ok ? "pp-ok" : "pp-error");
    }

    function tryUnlock() {
      var attempts = getAttempts();
      if (attempts >= maxAttempts) {
        setMsg("Too many incorrect attempts for this page.", false);
        return;
      }

      var val = String(input.value || "");
      if (val === expectedPassword) {
        setMsg("Password accepted. Opening page...", true);
        setAttempts(0);
        markUnlocked();
        return;
      }

      attempts += 1;
      setAttempts(attempts);
      setMsg("Incorrect password. Please try again.", false);
      input.select();
      input.focus();
    }

    submit.addEventListener("click", tryUnlock);
    clear.addEventListener("click", function () {
      clearSavedAccess();
      setMsg("Saved access cleared for this page.", true);
      input.focus();
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        tryUnlock();
      }
    });

    setTimeout(function () {
      input.focus();
    }, 40);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function init() {
    document.documentElement.setAttribute(rootAttr, "1");
    injectStyle();

    if (unlockFromQuery() || alreadyUnlocked()) {
      markUnlocked();
      return;
    }

    if (blurBackground) {
      document.body.classList.add("pp-pwd-blur");
    }

    if (!lockScroll) {
      document.documentElement.style.overflow = "";
    }

    buildOverlay();
    try {
      document.body.style.visibility = "visible";
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();