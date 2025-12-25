/* =========================================================
   Programmer’s Picnic – Page Lock
   Version: 1.0
   Author: Champak Roy
   Purpose: Simple client-side page protection
   ========================================================= */

(function () {
  const PASSWORD_URL =
    "https://programmer-s-picnic.github.io/json-images/password.json";

  const LOCK_HTML = `
    <div id="pp-lock-screen" style="
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      background:#fffaf2;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
    ">
      <div style="
        background:#ffffff;
        border:1px solid #e5e7eb;
        border-radius:16px;
        padding:36px;
        width:90%;
        max-width:420px;
        box-shadow:0 12px 30px rgba(0,0,0,.08);
        text-align:center;
      ">
        <h2 style="color:#d97706;margin-top:0;">
          Programmer’s Picnic
        </h2>
        <p style="color:#6b7280;">
          Enter access password to continue
        </p>
        <input id="pp-password" type="password" placeholder="Password"
          style="
            width:100%;
            padding:12px;
            font-size:1rem;
            margin-top:14px;
            border-radius:8px;
            border:1px solid #e5e7eb;
          ">
        <button id="pp-unlock"
          style="
            margin-top:18px;
            padding:12px;
            width:100%;
            background:#d97706;
            color:#fff;
            border:none;
            border-radius:8px;
            font-size:1rem;
            cursor:pointer;
          ">
          Unlock
        </button>
        <div id="pp-error" style="
          margin-top:14px;
          color:#b91c1c;
          font-size:.95rem;
        "></div>
      </div>
    </div>
  `;

  document.addEventListener("DOMContentLoaded", () => {
    const originalBody = document.body.innerHTML;
    document.body.innerHTML = LOCK_HTML;

    document.getElementById("pp-unlock").onclick = async () => {
      const entered = document.getElementById("pp-password").value;
      const error = document.getElementById("pp-error");

      if (!entered) {
        error.textContent = "Please enter password.";
        return;
      }

      try {
        const res = await fetch(PASSWORD_URL, { cache: "no-store" });
        const data = await res.json();
        const enteredHash = await sha256(entered);

        if (enteredHash === data.password_hash) {
          document.body.innerHTML = originalBody;
        } else {
          error.textContent = "Incorrect password.";
        }
      } catch (e) {
        error.textContent = "Unable to verify password.";
      }
    };
  });

  async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }
})();