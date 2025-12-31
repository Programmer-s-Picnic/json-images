/* =========================================================
   Programmer’s Picnic — Home Tag Button (Right Bottom)
   Floating tag-style button to go to Home page
   Author: Champak Roy
   ========================================================= */

(function () {
  "use strict";

  /* ---------- CONFIG ---------- */
  const HOME_URL = "https://www.learnwithchampak.live";              // Change if needed
  const TAG_TEXT = "🏠 Home";

  /* ---------- CREATE TAG ---------- */
  const tag = document.createElement("a");
  tag.href = HOME_URL;
  tag.textContent = TAG_TEXT;
  tag.setAttribute("aria-label", "Go to Home Page");
  tag.id = "pp-home-tag";

  /* ---------- STYLES ---------- */
  const style = document.createElement("style");
  style.textContent = `
    #pp-home-tag{
      position: fixed;
      left: 18px;
      bottom: 18px;
      background: linear-gradient(135deg, #ff9933, #ffb347);
      color: #fff;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 999px;
      text-decoration: none;
      box-shadow: 0 8px 22px rgba(0,0,0,0.28);
      z-index: 999999;
      transition: all 0.25s ease;
      letter-spacing: 0.3px;
    }

    #pp-home-tag:hover{
      transform: translateY(-2px);
      background: linear-gradient(135deg, #ff8800, #ffa733);
      box-shadow: 0 12px 28px rgba(0,0,0,0.38);
    }

    @media (max-width: 600px){
      #pp-home-tag{
        font-size: 13px;
        padding: 9px 14px;
        right: 12px;
        bottom: 12px;
      }
    }
  `;

  /* ---------- ATTACH ---------- */
  document.head.appendChild(style);
  document.body.appendChild(tag);

})();
