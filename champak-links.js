(function () {
  const isApp =
    new URLSearchParams(location.search).has("app") ||
    window.self !== window.top;

  const target = isApp ? "_parent" : "champak";

  document.querySelectorAll("a[href]").forEach(a => {
    const href = a.getAttribute("href");

    // skip empty / anchors / javascript links
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

    a.target = target;
    a.rel = "noopener noreferrer";
  });

  console.log(
    "Champak link mode:",
    isApp ? "APP" : "WEBSITE",
    "→ target =",
    target
  );
})();
