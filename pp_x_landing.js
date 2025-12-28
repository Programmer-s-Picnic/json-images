/* =========================================================
   Programmer’s Picnic – Python Starter Landing
   JS Controller (pp_x_)
   ========================================================= */

(function () {

  /* ---------- ACTIVATE LANDING MODE ---------- */
  function activateLanding() {
    if (document.getElementById("pp_x_landing_marker")) {
      document.body.classList.add("pp_x_landing");
    }
  }

  /* ---------- MOBILE SAFE VIEWPORT FIT ---------- */
  function setupViewportFit() {
    const iframe = document.getElementById("pp_x_iframe");
    if (!iframe) return;

    function fit() {
      iframe.style.height = window.innerHeight + "px";
    }

    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
  }

  /* ---------- SKELETON CONTROL ---------- */
  function setupSkeleton() {
    const iframe = document.getElementById("pp_x_iframe");
    const skeleton = document.getElementById("pp_x_skeleton");
    if (!iframe || !skeleton) return;

    function hideSkeleton() {
      skeleton.style.opacity = "0";
      setTimeout(() => skeleton.remove(), 350);
    }

    iframe.addEventListener("load", hideSkeleton);

    /* failsafe */
    setTimeout(hideSkeleton, 10000);
  }

  /* ---------- INIT ---------- */
  activateLanding();
  setupViewportFit();
  setupSkeleton();

})();
