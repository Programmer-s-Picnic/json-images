/* 
  page-offline-downloader.js
  One-click offline page downloader
  Embeds all images as base64 data
  Programmer’s Picnic — Champak Roy
*/

(function () {
  "use strict";

  const BTN_ID = "ppOfflineDownloadBtn";
  const STATUS_ID = "ppOfflineStatus";

  /* ---------- STYLES ---------- */
  const style = document.createElement("style");
  style.innerHTML = `
    #${BTN_ID} {
      position: fixed;
      bottom: 18px;
      right: 18px;
      z-index: 999999;
      background: linear-gradient(135deg,#f59e0b,#d97706);
      color: #fff;
      border: none;
      padding: 12px 16px;
      font-size: 14px;
      border-radius: 14px;
      cursor: pointer;
      box-shadow: 0 12px 28px rgba(0,0,0,.18);
      font-family: system-ui, Segoe UI, Arial, sans-serif;
    }

    #${BTN_ID}:hover {
      opacity: 0.95;
    }

    #${STATUS_ID} {
      position: fixed;
      bottom: 64px;
      right: 18px;
      background: #fffaf2;
      color: #065f46;
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 12px;
      font-family: system-ui, Segoe UI, Arial, sans-serif;
      box-shadow: 0 6px 18px rgba(0,0,0,.12);
      display: none;
      z-index: 999999;
    }
  `;
  document.head.appendChild(style);

  /* ---------- UI ---------- */
  const btn = document.createElement("button");
  btn.id = BTN_ID;
  btn.textContent = "Download Offline Page";

  const statusBox = document.createElement("div");
  statusBox.id = STATUS_ID;

  document.body.appendChild(btn);
  document.body.appendChild(statusBox);

  function showStatus(text) {
    statusBox.textContent = text;
    statusBox.style.display = "block";
  }

  function hideStatus() {
    statusBox.style.display = "none";
  }

  /* ---------- IMAGE HANDLING ---------- */
  async function imageToDataURL(src) {
    try {
      const res = await fetch(src, { mode: "cors" });
      const blob = await res.blob();

      return await new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("Image skipped (CORS):", src);
      return src;
    }
  }

  /* ---------- MAIN LOGIC ---------- */
  btn.addEventListener("click", async () => {
    showStatus("Preparing page...");

    const clone = document.documentElement.cloneNode(true);
    const imgs = clone.querySelectorAll("img");

    for (let i = 0; i < imgs.length; i++) {
      showStatus(`Embedding image ${i + 1} / ${imgs.length}`);
      const dataURL = await imageToDataURL(imgs[i].src);
      imgs[i].setAttribute("src", dataURL);
    }

    const html =
      "<!DOCTYPE html>\n" +
      clone.outerHTML;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "offline-page.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    showStatus("Download complete ✔");
    setTimeout(hideStatus, 2500);
  });

})();