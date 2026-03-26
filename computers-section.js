/* computers-section.js
   Programmer's Picnic - Computers Section
   Non-gaming computer products only
   Randomly picks one product from each category on every load
   Add with:
   <script src="computers-section.js"></script>
*/

(function () {
  "use strict";

  const AFFILIATE_TAG = "vsj04-21";
  const SECTION_ID = "pp-computers-section";

  if (document.getElementById(SECTION_ID)) return;

  const PRODUCT_GROUPS = [
    {
      title: "Laptops",
      icon: "💻",
      items: [
        {
          name: "Student Laptop",
          subtitle: "Good for study, browsing, office work, and coding",
          search: "student laptop 8GB RAM SSD",
          badge: "Popular Pick"
        },
        {
          name: "Office Laptop",
          subtitle: "Suitable for documents, meetings, and daily work",
          search: "office laptop Windows SSD",
          badge: "Work Ready"
        },
        {
          name: "Programming Laptop",
          subtitle: "Best for coding, browser tabs, and light development",
          search: "programming laptop 16GB RAM SSD",
          badge: "Coding Choice"
        }
      ]
    },
    {
      title: "Desktop Computers",
      icon: "🖥️",
      items: [
        {
          name: "Home Desktop PC",
          subtitle: "Good for home use, browsing, learning, and office tasks",
          search: "home desktop computer SSD",
          badge: "Home Setup"
        },
        {
          name: "Office Desktop PC",
          subtitle: "Useful for business tasks and reliable daily work",
          search: "office desktop PC Windows",
          badge: "Office Choice"
        },
        {
          name: "All-in-One Desktop",
          subtitle: "Space-saving desktop for home and office",
          search: "all in one desktop computer",
          badge: "Clean Desk"
        }
      ]
    },
    {
      title: "Monitors",
      icon: "🖼️",
      items: [
        {
          name: "24-inch Monitor",
          subtitle: "Comfortable size for office work and programming",
          search: "24 inch monitor IPS",
          badge: "Balanced Pick"
        },
        {
          name: "27-inch Monitor",
          subtitle: "More screen space for multitasking",
          search: "27 inch monitor full hd",
          badge: "Big Screen"
        },
        {
          name: "Dual-Use Monitor",
          subtitle: "Suitable for both productivity and study",
          search: "best monitor for office and study",
          badge: "Daily Use"
        }
      ]
    },
    {
      title: "Storage",
      icon: "💾",
      items: [
        {
          name: "Portable SSD",
          subtitle: "Fast storage for backups and file transfer",
          search: "portable SSD",
          badge: "Fast Storage"
        },
        {
          name: "External Hard Drive",
          subtitle: "Large storage for photos, videos, and backups",
          search: "external hard drive 1TB",
          badge: "Backup Pick"
        },
        {
          name: "Internal SSD",
          subtitle: "Useful for upgrading laptop or desktop speed",
          search: "internal SSD 1TB",
          badge: "Upgrade Pick"
        }
      ]
    },
    {
      title: "Keyboards & Mouse",
      icon: "⌨️",
      items: [
        {
          name: "Wireless Keyboard and Mouse Combo",
          subtitle: "Neat desk setup for work and study",
          search: "wireless keyboard mouse combo",
          badge: "Desk Essential"
        },
        {
          name: "Ergonomic Mouse",
          subtitle: "Better comfort for long computer sessions",
          search: "ergonomic mouse",
          badge: "Comfort Pick"
        },
        {
          name: "Full-Size Keyboard",
          subtitle: "Great for office, writing, and productivity",
          search: "full size keyboard",
          badge: "Work Essential"
        }
      ]
    },
    {
      title: "Computer Accessories",
      icon: "🧰",
      items: [
        {
          name: "Laptop Stand",
          subtitle: "Improves posture and desk comfort",
          search: "laptop stand adjustable",
          badge: "Posture Helper"
        },
        {
          name: "USB Hub",
          subtitle: "Add more ports to your laptop or desktop",
          search: "USB hub multiport",
          badge: "Useful Add-on"
        },
        {
          name: "Webcam",
          subtitle: "Helpful for meetings, classes, and calls",
          search: "full hd webcam",
          badge: "Meeting Ready"
        }
      ]
    },
    {
      title: "Printers & Scanners",
      icon: "🖨️",
      items: [
        {
          name: "Home Printer",
          subtitle: "Useful for school, forms, and documents",
          search: "home printer",
          badge: "Home Office"
        },
        {
          name: "All-in-One Printer",
          subtitle: "Print, scan, and copy in one machine",
          search: "all in one printer scanner",
          badge: "Multi Function"
        },
        {
          name: "Document Scanner",
          subtitle: "Good for office records and digital copies",
          search: "document scanner",
          badge: "Paper to Digital"
        }
      ]
    }
  ];

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function makeAmazonSearchUrl(query) {
    return (
      "https://www.amazon.in/s?" +
      "k=" + encodeURIComponent(query) +
      "&tag=" + encodeURIComponent(AFFILIATE_TAG)
    );
  }

  function injectStyles() {
    if (document.getElementById("pp-computers-section-style")) return;

    const style = document.createElement("style");
    style.id = "pp-computers-section-style";
    style.textContent = `
      #${SECTION_ID} {
        --pp-bg1: #fff8eb;
        --pp-bg2: #ffedd5;
        --pp-panel: rgba(255,255,255,0.88);
        --pp-ink: #1f2937;
        --pp-muted: #6b7280;
        --pp-brand: #d97706;
        --pp-brand-2: #f59e0b;
        --pp-line: rgba(217,119,6,0.16);
        margin: 24px auto;
        max-width: 1200px;
        color: var(--pp-ink);
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      #${SECTION_ID} * {
        box-sizing: border-box;
      }

      #${SECTION_ID} .pp-wrap {
        background:
          radial-gradient(circle at top right, rgba(245,158,11,0.14), transparent 28%),
          linear-gradient(135deg, var(--pp-bg1), var(--pp-bg2));
        border: 1px solid var(--pp-line);
        border-radius: 24px;
        padding: 22px;
        box-shadow: 0 18px 48px rgba(15,23,42,0.08);
      }

      #${SECTION_ID} .pp-head {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }

      #${SECTION_ID} .pp-title {
        margin: 0;
        font-size: clamp(1.5rem, 2vw, 2.2rem);
        line-height: 1.15;
      }

      #${SECTION_ID} .pp-subtitle {
        margin: 8px 0 0;
        color: var(--pp-muted);
        font-size: 0.98rem;
        max-width: 760px;
      }

      #${SECTION_ID} .pp-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      #${SECTION_ID} .pp-btn {
        border: 0;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 11px 14px;
        border-radius: 999px;
        background: linear-gradient(135deg, var(--pp-brand), var(--pp-brand-2));
        color: #fff;
        font-weight: 700;
        font-size: 0.95rem;
        box-shadow: 0 10px 24px rgba(217,119,6,0.22);
      }

      #${SECTION_ID} .pp-btn.pp-secondary {
        background: #fff;
        color: var(--pp-brand);
        border: 1px solid var(--pp-line);
        box-shadow: none;
      }

      #${SECTION_ID} .pp-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
      }

      #${SECTION_ID} .pp-card {
        background: var(--pp-panel);
        backdrop-filter: blur(10px);
        border: 1px solid var(--pp-line);
        border-radius: 20px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        min-height: 220px;
      }

      #${SECTION_ID} .pp-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 12px;
      }

      #${SECTION_ID} .pp-icon {
        width: 46px;
        height: 46px;
        border-radius: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(217,119,6,0.1);
        font-size: 1.4rem;
      }

      #${SECTION_ID} .pp-badge {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--pp-brand);
        background: rgba(217,119,6,0.1);
        padding: 7px 10px;
        border-radius: 999px;
        white-space: nowrap;
      }

      #${SECTION_ID} .pp-card-title {
        margin: 0 0 6px;
        font-size: 1.05rem;
        line-height: 1.3;
      }

      #${SECTION_ID} .pp-card-category {
        margin: 0 0 10px;
        color: var(--pp-brand);
        font-weight: 700;
        font-size: 0.92rem;
      }

      #${SECTION_ID} .pp-card-text {
        margin: 0 0 16px;
        color: var(--pp-muted);
        line-height: 1.5;
        font-size: 0.95rem;
      }

      #${SECTION_ID} .pp-card-bottom {
        margin-top: auto;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      #${SECTION_ID} .pp-link {
        flex: 1 1 auto;
        min-width: 120px;
        text-align: center;
        text-decoration: none;
        font-weight: 700;
        border-radius: 12px;
        padding: 10px 12px;
        background: linear-gradient(135deg, var(--pp-brand), var(--pp-brand-2));
        color: #fff;
      }

      #${SECTION_ID} .pp-link.pp-link-lite {
        background: #fff;
        color: var(--pp-brand);
        border: 1px solid var(--pp-line);
      }

      #${SECTION_ID} .pp-note {
        margin-top: 16px;
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(255,255,255,0.74);
        border: 1px solid var(--pp-line);
        color: var(--pp-muted);
        font-size: 0.92rem;
        line-height: 1.5;
      }

      @media (max-width: 640px) {
        #${SECTION_ID} .pp-wrap {
          padding: 16px;
          border-radius: 18px;
        }

        #${SECTION_ID} .pp-card {
          min-height: auto;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function buildSection() {
    const host = document.createElement("section");
    host.id = SECTION_ID;

    const randomProducts = PRODUCT_GROUPS.map((group) => {
      const picked = pickRandom(group.items);
      return {
        category: group.title,
        icon: group.icon,
        ...picked
      };
    });

    const cardsHtml = randomProducts
      .map((item) => {
        const amazonUrl = makeAmazonSearchUrl(item.search);
        return `
          <article class="pp-card">
            <div class="pp-card-top">
              <div class="pp-icon" aria-hidden="true">${item.icon}</div>
              <div class="pp-badge">${item.badge}</div>
            </div>

            <p class="pp-card-category">${item.category}</p>
            <h3 class="pp-card-title">${item.name}</h3>
            <p class="pp-card-text">${item.subtitle}</p>

            <div class="pp-card-bottom">
              <a class="pp-link" href="${amazonUrl}" target="_blank" rel="nofollow sponsored noopener">View on Amazon</a>
              <a class="pp-link pp-link-lite" href="${amazonUrl}" target="_blank" rel="nofollow sponsored noopener">Buy Now</a>
            </div>
          </article>
        `;
      })
      .join("");

    host.innerHTML = `
      <div class="pp-wrap">
        <div class="pp-head">
          <div>
            <h2 class="pp-title">Computers Section</h2>
            <p class="pp-subtitle">
              A non-gaming computers section with randomly selected product ideas for laptops, desktops,
              monitors, storage, accessories, printers, and more.
            </p>
          </div>

          <div class="pp-actions">
            <button class="pp-btn" type="button" id="pp-computers-refresh">🔀 Refresh Picks</button>
            <a class="pp-btn pp-secondary" href="https://www.amazon.in/s?i=computers&tag=${encodeURIComponent(AFFILIATE_TAG)}" target="_blank" rel="nofollow sponsored noopener">Open Computers Store</a>
          </div>
        </div>

        <div class="pp-grid">
          ${cardsHtml}
        </div>

        <div class="pp-note">
          As an Amazon Associate, you may earn from qualifying purchases. This section excludes gaming products and uses your affiliate tag automatically.
        </div>
      </div>
    `;

    return host;
  }

  function mountSection() {
    injectStyles();

    const section = buildSection();

    const mountPoint =
      document.querySelector("[data-pp-computers-section]") ||
      document.querySelector("main") ||
      document.querySelector(".container") ||
      document.body;

    mountPoint.appendChild(section);

    const refreshBtn = document.getElementById("pp-computers-refresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", function () {
        const old = document.getElementById(SECTION_ID);
        if (!old) return;
        const next = buildSection();
        old.replaceWith(next);
        mountRefreshHandler();
      });
    }
  }

  function mountRefreshHandler() {
    const refreshBtn = document.getElementById("pp-computers-refresh");
    if (!refreshBtn) return;

    refreshBtn.addEventListener("click", function () {
      const old = document.getElementById(SECTION_ID);
      if (!old) return;
      const next = buildSection();
      old.replaceWith(next);
      mountRefreshHandler();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountSection, { once: true });
  } else {
    mountSection();
  }
})();