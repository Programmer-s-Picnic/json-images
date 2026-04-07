(function () {
  "use strict";

  const cfg = Object.assign(
    {
      password: "12345",
      title: document.title || "Protected Page",
      subtitle: "Enter password to continue",
      placeholder: "Enter password",
      buttonText: "Unlock",
      cancelText: "Clear",
      errorText: "Wrong password. Please try again.",
      successText: "Access granted.",
      storageKey: "ppp_pwd_access",
      useSession: false,
      blurPage: true,
      autoFocus: true
    },
    window.pppPwdConfig || {}
  );

  const storage = cfg.useSession ? window.sessionStorage : window.localStorage;

  function hasAccess() {
    try {
      return storage.getItem(cfg.storageKey) === "ok";
    } catch (e) {
      return false;
    }
  }

  function setAccess(value) {
    try {
      if (value) {
        storage.setItem(cfg.storageKey, "ok");
      } else {
        storage.removeItem(cfg.storageKey);
      }
    } catch (e) {}
  }

  function addStyles() {
    if (document.getElementById("ppp-pwd-style")) return;

    const style = document.createElement("style");
    style.id = "ppp-pwd-style";
    style.textContent = `
      html.ppp-pwd-lock,
      body.ppp-pwd-lock{
        overflow:hidden !important;
      }

      .ppp-pwd-blur > *:not(.ppp-pwd-overlay){
        filter: blur(8px);
        pointer-events:none !important;
        user-select:none !important;
      }

      .ppp-pwd-overlay{
        position:fixed;
        inset:0;
        z-index:2147483647;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
        background:linear-gradient(135deg, rgba(217,119,6,.92), rgba(245,158,11,.92));
        backdrop-filter: blur(10px);
      }

      .ppp-pwd-card{
        width:min(100%, 440px);
        background:#fffdf8;
        border:1px solid rgba(255,255,255,.55);
        border-radius:22px;
        box-shadow:0 24px 70px rgba(0,0,0,.24);
        padding:24px;
        color:#1f2937;
        font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      }

      .ppp-pwd-badge{
        display:inline-flex;
        align-items:center;
        gap:8px;
        background:#fff1cc;
        color:#9a5a05;
        border:1px solid #efd393;
        padding:7px 12px;
        border-radius:999px;
        font-size:13px;
        font-weight:700;
        margin-bottom:14px;
      }

      .ppp-pwd-title{
        margin:0 0 8px;
        font-size:28px;
        line-height:1.15;
        color:#b45309;
      }

      .ppp-pwd-subtitle{
        margin:0 0 18px;
        color:#6b7280;
        font-size:15px;
        line-height:1.5;
      }

      .ppp-pwd-input{
        width:100%;
        padding:14px 15px;
        border-radius:14px;
        border:1px solid #ead7b0;
        background:#fff;
        color:#111827;
        font-size:16px;
        outline:none;
        box-shadow: inset 0 1px 2px rgba(0,0,0,.03);
      }

      .ppp-pwd-input:focus{
        border-color:#d97706;
        box-shadow:0 0 0 4px rgba(217,119,6,.12);
      }

      .ppp-pwd-actions{
        display:flex;
        gap:10px;
        margin-top:14px;
        flex-wrap:wrap;
      }

      .ppp-pwd-btn{
        appearance:none;
        border:none;
        border-radius:14px;
        padding:12px 16px;
        font-size:15px;
        font-weight:700;
        cursor:pointer;
        transition:transform .15s ease, opacity .15s ease, background .15s ease;
      }

      .ppp-pwd-btn:hover{
        transform:translateY(-1px);
      }

      .ppp-pwd-btn-primary{
        background:#d97706;
        color:#fff;
      }

      .ppp-pwd-btn-primary:hover{
        background:#f59e0b;
      }

      .ppp-pwd-btn-secondary{
        background:#fff7e8;
        color:#a16207;
        border:1px solid #efd393;
      }

      .ppp-pwd-msg{
        min-height:22px;
        margin-top:12px;
        font-size:14px;
        font-weight:700;
      }

      .ppp-pwd-msg-error{
        color:#b91c1c;
      }

      .ppp-pwd-msg-success{
        color:#166534;
      }

      .ppp-pwd-foot{
        margin-top:14px;
        color:#6b7280;
        font-size:12px;
      }
    `;
    document.head.appendChild(style);
  }

  function buildOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "ppp-pwd-overlay";
    overlay.innerHTML = `
      <div class="ppp-pwd-card" role="dialog" aria-modal="true" aria-labelledby="pppPwdTitle">
        <div class="ppp-pwd-badge">🔒 Password Protected</div>
        <h2 class="ppp-pwd-title" id="pppPwdTitle"></h2>
        <p class="ppp-pwd-subtitle"></p>
        <input class="ppp-pwd-input" type="password" autocomplete="current-password" />
        <div class="ppp-pwd-actions">
          <button class="ppp-pwd-btn ppp-pwd-btn-primary" type="button"></button>
          <button class="ppp-pwd-btn ppp-pwd-btn-secondary" type="button"></button>
        </div>
        <div class="ppp-pwd-msg" aria-live="polite"></div>
        <div class="ppp-pwd-foot">Powered by Programmer's Picnic password gate</div>
      </div>
    `;

    const title = overlay.querySelector(".ppp-pwd-title");
    const subtitle = overlay.querySelector(".ppp-pwd-subtitle");
    const input = overlay.querySelector(".ppp-pwd-input");
    const btnUnlock = overlay.querySelector(".ppp-pwd-btn-primary");
    const btnClear = overlay.querySelector(".ppp-pwd-btn-secondary");
    const msg = overlay.querySelector(".ppp-pwd-msg");

    title.textContent = cfg.title;
    subtitle.textContent = cfg.subtitle;
    input.placeholder = cfg.placeholder;
    btnUnlock.textContent = cfg.buttonText;
    btnClear.textContent = cfg.cancelText;

    function showMessage(text, ok) {
      msg.textContent = text || "";
      msg.className = "ppp-pwd-msg " + (ok ? "ppp-pwd-msg-success" : "ppp-pwd-msg-error");
    }

    function unlock() {
      const value = input.value;
      if (value === cfg.password) {
        setAccess(true);
        showMessage(cfg.successText, true);
        setTimeout(removeOverlay, 250);
      } else {
        showMessage(cfg.errorText, false);
        input.select();
      }
    }

    function clearInput() {
      input.value = "";
      showMessage("", false);
      input.focus();
    }

    btnUnlock.addEventListener("click", unlock);
    btnClear.addEventListener("click", clearInput);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") unlock();
      if (e.key === "Escape") clearInput();
    });

    if (cfg.autoFocus) {
      setTimeout(() => input.focus(), 60);
    }

    return overlay;
  }

  function removeOverlay() {
    const overlay = document.querySelector(".ppp-pwd-overlay");
    if (overlay) overlay.remove();
    document.documentElement.classList.remove("ppp-pwd-lock");
    document.body.classList.remove("ppp-pwd-lock");
    document.body.classList.remove("ppp-pwd-blur");
  }

  function lockPage() {
    addStyles();
    document.documentElement.classList.add("ppp-pwd-lock");
    document.body.classList.add("ppp-pwd-lock");
    if (cfg.blurPage) document.body.classList.add("ppp-pwd-blur");

    if (!document.querySelector(".ppp-pwd-overlay")) {
      document.body.appendChild(buildOverlay());
    }
  }

  function init() {
    if (hasAccess()) return;
    lockPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.pppPwd = {
    lock: function () {
      setAccess(false);
      lockPage();
    },
    unlock: function (password) {
      if (password === cfg.password) {
        setAccess(true);
        removeOverlay();
        return true;
      }
      return false;
    },
    logout: function () {
      setAccess(false);
      lockPage();
    },
    hasAccess: hasAccess
  };
})();