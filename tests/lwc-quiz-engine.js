/*
 * Learn With Champak – Reusable Quiz Engine
 *
 * Blogger embed:
 *
 * <div
 *   class="lwc-quiz"
 *   data-questions-url="YOUR-QUESTIONS.json">
 *   <p>Loading quiz…</p>
 * </div>
 *
 * <script src="YOUR-PATH/lwc-quiz-engine.js" defer></script>
 */

(function () {
  "use strict";

  const STYLE_ID = "lwc-quiz-engine-styles";

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      .lwc-quiz {
        --lwc-primary: #075985;
        --lwc-secondary: #0ea5e9;
        --lwc-dark: #0f172a;
        --lwc-muted: #526477;
        --lwc-border: #cbd5e1;
        --lwc-light: #eff6ff;
        --lwc-success: #166534;
        --lwc-danger: #b91c1c;

        position: relative !important;
        left: 50% !important;
        width: min(1500px, calc(100vw - 32px)) !important;
        min-width: 0 !important;
        max-width: none !important;
        margin: 24px auto !important;
        padding-top: 16px !important;
        overflow: visible !important;
        color: var(--lwc-dark);
        font-family: Arial, Helvetica, sans-serif;
        line-height: 1.55;
        float: none !important;
        clear: both !important;
        transform: translateX(-50%) !important;
      }

      .lwc-quiz *,
      .lwc-quiz *::before,
      .lwc-quiz *::after {
        box-sizing: border-box;
      }

      .lwc-quiz .lwc-hero {
        position: relative !important;
        display: block !important;
        padding: 36px 28px !important;
        overflow: hidden !important;
        color: #ffffff;
        background:
          linear-gradient(
            135deg,
            #082f49,
            #0369a1 62%,
            #0ea5e9
          );
        border-radius: 22px;
        box-shadow: 0 18px 44px rgba(7, 89, 133, 0.2);
      }

      .lwc-quiz .lwc-kicker {
        position: static !important;
        display: block !important;
        margin: 0 0 8px !important;
        padding: 0 !important;
        color: #bae6fd !important;
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        line-height: 1.4;
        text-transform: uppercase;
        transform: none !important;
      }

      .lwc-quiz .lwc-hero h1 {
        position: static !important;
        display: block !important;
        width: auto !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        color: #ffffff !important;
        font-size: clamp(2rem, 5vw, 4rem) !important;
        font-weight: 800 !important;
        line-height: 1.08 !important;
        letter-spacing: normal !important;
        text-align: left !important;
        text-indent: 0 !important;
        text-transform: none !important;
        white-space: normal !important;
        transform: none !important;
      }

      .lwc-quiz .lwc-lead {
        position: static !important;
        display: block !important;
        max-width: 950px;
        margin: 16px 0 0 !important;
        padding: 0 !important;
        color: #e0f2fe !important;
        font-size: 1.04rem;
        transform: none !important;
      }

      .lwc-quiz .lwc-card {
        width: 100%;
        margin-top: 22px;
        padding: 24px;
        background: #ffffff;
        border: 1px solid var(--lwc-border);
        border-radius: 18px;
        box-shadow: 0 8px 25px rgba(15, 23, 42, 0.07);
      }

      .lwc-quiz h2,
      .lwc-quiz h3 {
        color: var(--lwc-primary);
        line-height: 1.25;
      }

      .lwc-quiz h2 {
        margin: 0 0 12px;
      }

      .lwc-quiz .lwc-mode-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin: 18px 0;
      }

      .lwc-quiz .lwc-mode {
        position: relative !important;
        display: block !important;
        min-height: 112px;
        margin: 0 !important;
        padding: 18px !important;
        overflow: visible !important;
        background: #f8fafc;
        border: 2px solid var(--lwc-border);
        border-radius: 16px;
        cursor: pointer;
      }

      .lwc-quiz .lwc-mode:hover {
        border-color: #7dd3fc;
      }

      .lwc-quiz .lwc-mode.selected {
        background: var(--lwc-light);
        border-color: var(--lwc-secondary);
      }

      .lwc-quiz .lwc-mode input[type="radio"] {
        position: absolute !important;
        top: 18px !important;
        right: 18px !important;
        bottom: auto !important;
        left: auto !important;
        display: block !important;
        width: 18px !important;
        height: 18px !important;
        margin: 0 !important;
        padding: 0 !important;
        opacity: 1 !important;
        visibility: visible !important;
        clip: auto !important;
        clip-path: none !important;
        accent-color: var(--lwc-primary);
        appearance: auto !important;
        -webkit-appearance: radio !important;
        transform: none !important;
      }

      .lwc-quiz .lwc-mode strong {
        display: block;
        padding-right: 36px;
        color: var(--lwc-primary);
        font-size: 1.08rem;
      }

      .lwc-quiz .lwc-mode span {
        display: block;
        margin-top: 5px;
        padding-right: 30px;
        color: var(--lwc-muted);
      }

      .lwc-quiz button {
        position: static !important;
        inset: auto !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: auto !important;
        min-width: 0 !important;
        max-width: max-content !important;
        height: auto !important;
        min-height: 46px !important;
        max-height: 56px !important;
        margin: 0 !important;
        padding: 12px 18px !important;
        border: 0 !important;
        border-radius: 12px !important;
        cursor: pointer;
        font: 700 1rem Arial, Helvetica, sans-serif !important;
        line-height: 1.2 !important;
        text-align: center !important;
        text-decoration: none !important;
        text-transform: none !important;
        white-space: nowrap !important;
        float: none !important;
        clear: none !important;
        overflow: visible !important;
        transition:
          transform 0.15s ease,
          box-shadow 0.15s ease,
          opacity 0.15s ease;
      }

      .lwc-quiz button:hover {
        transform: translateY(-1px);
        box-shadow: 0 7px 16px rgba(15, 23, 42, 0.15);
      }

      .lwc-quiz button:focus-visible,
      .lwc-quiz input:focus-visible {
        outline: 3px solid #f59e0b;
        outline-offset: 3px;
      }

      .lwc-quiz .lwc-primary {
        color: #ffffff !important;
        background: var(--lwc-primary) !important;
        background-image: none !important;
      }

      .lwc-quiz .lwc-secondary {
        color: var(--lwc-dark) !important;
        background: #e2e8f0 !important;
        background-image: none !important;
      }

      .lwc-quiz .lwc-hidden {
        display: none !important;
      }

      .lwc-quiz .lwc-topbar {
        position: fixed !important;
        top: 12px !important;
        right: auto !important;
        bottom: auto !important;
        left: 50% !important;
        z-index: 99999;

        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;

        width: min(1500px, calc(100vw - 32px));
        min-height: 66px;
        margin: 0;
        padding: 12px 18px;

        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--lwc-border);
        border-radius: 16px;
        box-shadow: 0 10px 32px rgba(15, 23, 42, 0.18);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        transform: translateX(-50%) !important;
      }

      .lwc-quiz .lwc-test {
        display: block !important;
        position: static !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: none !important;
        padding-top: 82px;
        float: none !important;
        clear: both !important;
      }

      .lwc-quiz .lwc-progress {
        flex: 1;
        color: var(--lwc-primary);
        font-size: 1rem;
        font-weight: 800;
      }

      .lwc-quiz .lwc-topbar-submit {
        flex: 0 0 auto;
        width: auto !important;
        min-width: 158px !important;
        max-width: 190px !important;
        height: 44px !important;
        min-height: 44px;
        max-height: 44px !important;
        padding: 10px 18px;
        white-space: nowrap;
      }

      .lwc-quiz .lwc-timer {
        display: grid;
        place-items: center;
        min-width: 150px;
        min-height: 44px;
        padding: 8px 22px;
        color: #ffffff;
        background: linear-gradient(135deg, #082f49, #0369a1);
        border: 2px solid #bae6fd;
        border-radius: 999px;
        font-size: 1.15rem;
        font-variant-numeric: tabular-nums;
        font-weight: 900;
        letter-spacing: 0.04em;
        text-align: center;
      }

      .lwc-quiz .lwc-timer.low {
        background: var(--lwc-danger);
        border-color: #fecaca;
        animation: lwc-pulse 1s infinite;
      }

      .lwc-quiz .lwc-timer.untimed {
        min-width: 170px;
        background: linear-gradient(135deg, #166534, #16a34a);
        border-color: #bbf7d0;
        font-size: 1rem;
      }

      @keyframes lwc-pulse {
        50% {
          opacity: 0.72;
          transform: scale(0.98);
        }
      }

      .lwc-quiz .lwc-form,
      .lwc-quiz .lwc-questions,
      .lwc-quiz .lwc-question {
        width: 100% !important;
        max-width: none !important;
      }

      .lwc-quiz .lwc-form {
        display: block !important;
        position: static !important;
        float: none !important;
        clear: both !important;
      }

      .lwc-quiz .lwc-questions {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 20px;
        align-items: start;
      }

      .lwc-quiz .lwc-question {
        display: block !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 24px;
        background: #ffffff;
        border: 1px solid var(--lwc-border);
        border-radius: 18px;
        box-shadow: 0 5px 18px rgba(15, 23, 42, 0.06);
      }

      .lwc-quiz .lwc-question-number {
        display: inline-block;
        padding: 4px 10px;
        color: #075985;
        background: #e0f2fe;
        border-radius: 999px;
        font-size: 0.84rem;
        font-weight: 800;
      }

      .lwc-quiz pre {
        max-width: 100%;
        margin: 14px 0;
        padding: 18px;
        overflow: auto;
        color: #f8fafc;
        background: #0b1220;
        border: 1px solid #1e293b;
        border-radius: 12px;
        font: 600 0.96rem/1.65 Consolas, Monaco, monospace;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .lwc-quiz code {
        font-family: Consolas, Monaco, monospace;
      }

      .lwc-quiz .lwc-options {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .lwc-quiz .lwc-option {
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        min-width: 0;
        margin: 0;
        padding: 14px;
        background: #ffffff;
        border: 1px solid var(--lwc-border);
        border-radius: 12px;
        cursor: pointer;
        transition:
          background 0.15s ease,
          border-color 0.15s ease,
          transform 0.15s ease;
      }

      .lwc-quiz .lwc-option:hover {
        transform: translateY(-1px);
      }

      .lwc-quiz .lwc-option:hover,
      .lwc-quiz .lwc-option.selected {
        background: var(--lwc-light);
        border-color: #38bdf8;
      }

      .lwc-quiz .lwc-option input[type="radio"] {
        position: static !important;
        display: block !important;
        flex: 0 0 auto;
        width: 17px !important;
        height: 17px !important;
        margin: 6px 0 0 !important;
        padding: 0 !important;
        opacity: 1 !important;
        visibility: visible !important;
        clip: auto !important;
        clip-path: none !important;
        accent-color: var(--lwc-primary);
        appearance: auto !important;
        -webkit-appearance: radio !important;
        transform: none !important;
      }

      .lwc-quiz .lwc-option span {
        display: block;
        min-width: 0;
        width: 100%;
      }

      .lwc-quiz .lwc-option pre {
        margin: 7px 0 0;
        padding: 12px;
        font-size: 0.9rem;
      }

      .lwc-quiz .lwc-actions {
        position: static !important;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        margin: 24px 0;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        float: none !important;
        clear: both !important;
        overflow: visible !important;
      }

      .lwc-quiz .lwc-actions button {
        position: static !important;
        flex: 0 0 auto !important;
        width: auto !important;
        min-width: 170px !important;
        max-width: 260px !important;
        height: 48px !important;
        min-height: 48px !important;
        max-height: 48px !important;
        margin: 0 !important;
      }

      .lwc-quiz .lwc-score {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 18px;
        align-items: center;
      }

      .lwc-quiz .lwc-score-circle {
        display: grid;
        place-items: center;
        width: 116px;
        height: 116px;
        color: #ffffff;
        background: var(--lwc-primary);
        border-radius: 50%;
        font-size: 1.65rem;
        font-weight: 900;
      }

      .lwc-quiz .lwc-review {
        margin: 14px 0;
        padding: 16px;
        background: #f8fafc;
        border-left: 5px solid var(--lwc-border);
        border-radius: 10px;
      }

      .lwc-quiz .lwc-review.correct {
        background: #f0fdf4;
        border-color: #22c55e;
      }

      .lwc-quiz .lwc-review.incorrect {
        background: #fef2f2;
        border-color: #ef4444;
      }

      .lwc-quiz .lwc-review pre {
        margin: 9px 0;
        padding: 12px;
      }

      .lwc-quiz .lwc-correct-answer {
        color: var(--lwc-success);
        font-weight: 800;
      }

      .lwc-quiz .lwc-wrong-answer,
      .lwc-quiz .lwc-error {
        color: var(--lwc-danger);
        font-weight: 800;
      }

      .lwc-quiz .lwc-note {
        color: var(--lwc-muted);
        font-size: 0.93rem;
      }

      .lwc-quiz .lwc-footer {
        padding: 18px;
        color: var(--lwc-muted);
        text-align: center;
      }

      @media (max-width: 800px) {
        .lwc-quiz .lwc-questions,
        .lwc-quiz .lwc-options {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 650px) {
        .lwc-quiz {
          left: 50% !important;
          width: calc(100vw - 16px) !important;
          margin: 8px auto !important;
          padding-top: 8px !important;
          transform: translateX(-50%) !important;
        }

        .lwc-quiz .lwc-hero {
          padding: 26px 18px !important;
          border-radius: 15px;
        }

        .lwc-quiz .lwc-hero h1 {
          font-size: clamp(2rem, 11vw, 3rem) !important;
        }

        .lwc-quiz .lwc-topbar {
          top: 6px !important;
          width: calc(100vw - 16px);
          min-height: 58px;
          padding: 9px 12px;
          border-radius: 13px;
          gap: 8px;
        }

        .lwc-quiz .lwc-test {
          padding-top: 72px;
        }

        .lwc-quiz .lwc-progress {
          font-size: 0.88rem;
        }

        .lwc-quiz .lwc-topbar-submit {
          min-height: 38px;
          padding: 7px 10px;
          font-size: 0.82rem;
        }

        .lwc-quiz .lwc-timer {
          min-width: 96px;
          min-height: 38px;
          padding: 6px 12px;
          font-size: 1rem;
        }

        .lwc-quiz .lwc-timer.untimed {
          min-width: 112px;
          font-size: 0.82rem;
        }

        .lwc-quiz .lwc-card,
        .lwc-quiz .lwc-question {
          padding: 18px;
          border-radius: 15px;
        }

        .lwc-quiz .lwc-mode-grid,
        .lwc-quiz .lwc-score {
          grid-template-columns: 1fr;
        }

        .lwc-quiz .lwc-score {
          text-align: center;
        }

        .lwc-quiz .lwc-score-circle {
          margin: auto;
        }

        .lwc-quiz .lwc-actions button {
          flex: 1 1 100% !important;
          width: 100% !important;
          max-width: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      character =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        })[character]
    );
  }

  function setMeta(selector, attributes) {
    let element = document.head.querySelector(selector);

    if (!element) {
      element = document.createElement("meta");
      document.head.appendChild(element);
    }

    Object.entries(attributes).forEach(([name, value]) => {
      element.setAttribute(name, value);
    });
  }

  function applySEO(seo) {
    if (!seo || seo.enabled === false) return;

    const canonicalURL =
      seo.canonicalUrl ||
      `${window.location.origin}${window.location.pathname}`;

    document.title = seo.title;

    setMeta('meta[name="description"]', {
      name: "description",
      content: seo.description
    });

    if (seo.keywords) {
      setMeta('meta[name="keywords"]', {
        name: "keywords",
        content: seo.keywords
      });
    }

    let canonical = document.head.querySelector(
      'link[rel="canonical"]'
    );

    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }

    canonical.href = canonicalURL;

    const openGraph = {
      "og:type": seo.type,
      "og:site_name": seo.siteName,
      "og:title": seo.title,
      "og:description": seo.description,
      "og:url": canonicalURL,
      "og:image": seo.ogImage,
      "og:image:alt": seo.imageAlt
    };

    Object.entries(openGraph).forEach(
      ([property, content]) => {
        if (!content) return;

        setMeta(`meta[property="${property}"]`, {
          property,
          content
        });
      }
    );

    const twitter = {
      "twitter:card": seo.ogImage
        ? "summary_large_image"
        : "summary",
      "twitter:title": seo.title,
      "twitter:description": seo.description,
      "twitter:image": seo.ogImage,
      "twitter:image:alt": seo.imageAlt
    };

    Object.entries(twitter).forEach(([name, content]) => {
      if (!content) return;

      setMeta(`meta[name="${name}"]`, {
        name,
        content
      });
    });

    const oldSchema = document.getElementById(
      "lwc-quiz-structured-data"
    );

    if (oldSchema) oldSchema.remove();

    const schema = document.createElement("script");
    schema.id = "lwc-quiz-structured-data";
    schema.type = "application/ld+json";

    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Quiz",
      name: seo.title,
      description: seo.description,
      url: canonicalURL,
      image: seo.ogImage || undefined,
      educationalLevel: seo.educationalLevel,
      learningResourceType: "Interactive quiz",
      inLanguage: seo.language
    });

    document.head.appendChild(schema);
  }

  function shuffle(items) {
    const result = [...items];

    for (
      let index = result.length - 1;
      index > 0;
      index--
    ) {
      const randomIndex = Math.floor(
        Math.random() * (index + 1)
      );

      [result[index], result[randomIndex]] = [
        result[randomIndex],
        result[index]
      ];
    }

    return result;
  }

  function normaliseData(data) {
    const settings = data.settings || {};
    const suppliedSEO = data.seo || {};

    const seoTitle =
      suppliedSEO.title ||
      data.title ||
      "Interactive Quiz | Learn With Champak";

    const seoDescription =
      suppliedSEO.description ||
      data.subtitle ||
      "Practise programming with this interactive quiz from Learn With Champak.";

    if (
      !Array.isArray(data.questions) ||
      data.questions.length === 0
    ) {
      throw new Error(
        "The JSON file does not contain any questions."
      );
    }

    data.questions.forEach((question, index) => {
      if (
        !Array.isArray(question.options) ||
        question.options.length < 2
      ) {
        throw new Error(
          `Question ${index + 1} must contain at least two options.`
        );
      }

      if (question.answer === undefined) {
        throw new Error(
          `Question ${index + 1} does not contain an answer.`
        );
      }
    });

    return {
      title: data.title || "Interactive Quiz",

      subtitle:
        data.subtitle ||
        "Select the correct answer for each question.",

      kicker:
        data.kicker ||
        "Learn With Champak • Interactive Test",

      instructions:
        data.instructions ||
        "Answer the questions and submit the test.",

      footer:
        data.footer ||
        "Learn With Champak • Learn by doing",

      seo: {
        enabled: suppliedSEO.enabled !== false,
        title: seoTitle,
        description: seoDescription,
        keywords: suppliedSEO.keywords || "",
        canonicalUrl: suppliedSEO.canonicalUrl || "",
        ogImage: suppliedSEO.ogImage || "",

        imageAlt:
          suppliedSEO.imageAlt ||
          `${data.title || "Interactive quiz"} – Learn With Champak`,

        type: suppliedSEO.type || "website",

        siteName:
          suppliedSEO.siteName ||
          "Learn With Champak",

        language: suppliedSEO.language || "en-IN",

        educationalLevel:
          suppliedSEO.educationalLevel ||
          "Beginner"
      },

      settings: {
        questionsPerAttempt:
          Number(settings.questionsPerAttempt) || 10,

        durationMinutes:
          Number(settings.durationMinutes) || 10,

        shuffleQuestions:
          settings.shuffleQuestions !== false,

        shuffleOptions:
          settings.shuffleOptions !== false,

        allowUntimed:
          settings.allowUntimed !== false,

        showReview:
          settings.showReview !== false
      },

      questions: data.questions
    };
  }

  async function initialiseQuiz(root, quizNumber) {
    const questionsURL = root.dataset.questionsUrl;

    if (!questionsURL) {
      root.innerHTML = `
        <div class="lwc-card lwc-error">
          No questions JSON URL was supplied.
        </div>
      `;

      return;
    }

    root.innerHTML = `
      <div class="lwc-card">
        Loading quiz…
      </div>
    `;

    try {
      const response = await fetch(questionsURL, {
        cache: "no-cache"
      });

      if (!response.ok) {
        throw new Error(
          `Could not load questions. HTTP ${response.status}.`
        );
      }

      const rawData = await response.json();
      const data = normaliseData(rawData);

      if (quizNumber === 1) {
        applySEO(data.seo);
      }

      buildQuiz(root, data, quizNumber);
    } catch (error) {
      console.error(
        "Learn With Champak quiz error:",
        error
      );

      root.innerHTML = `
        <div class="lwc-card">
          <h2>Quiz could not be loaded</h2>

          <p class="lwc-error">
            ${escapeHTML(error.message)}
          </p>

          <p class="lwc-note">
            Check the JSON URL, JSON syntax and GitHub Pages
            publication.
          </p>
        </div>
      `;
    }
  }

  function buildQuiz(root, data, quizNumber) {
    const id = `lwc-quiz-${quizNumber}`;
    const totalAvailable = data.questions.length;

    const questionsPerAttempt = Math.min(
      data.settings.questionsPerAttempt,
      totalAvailable
    );

    root.innerHTML = `
      <section class="lwc-hero">
        <p class="lwc-kicker">
          ${escapeHTML(data.kicker)}
        </p>

        <h1>${escapeHTML(data.title)}</h1>

        <p class="lwc-lead">
          ${escapeHTML(data.subtitle)}
        </p>
      </section>

      <section class="lwc-card lwc-start">
        <h2>Choose your test mode</h2>

        <p>${data.instructions}</p>

        <div class="lwc-mode-grid">
          <label class="lwc-mode selected">
            <input
              type="radio"
              name="${id}-mode"
              value="timed"
              checked
            >

            <strong>Timed test</strong>

            <span>
              ${questionsPerAttempt} questions in
              ${data.settings.durationMinutes} minutes.
            </span>
          </label>

          ${
            data.settings.allowUntimed
              ? `
                <label class="lwc-mode">
                  <input
                    type="radio"
                    name="${id}-mode"
                    value="untimed"
                  >

                  <strong>Untimed practice</strong>

                  <span>
                    Complete the questions without a countdown.
                  </span>
                </label>
              `
              : ""
          }
        </div>

        <button
          class="lwc-primary lwc-start-button"
          type="button"
        >
          Start the test
        </button>

        <p class="lwc-note">
          Each question carries one mark.
          There is no negative marking.
        </p>
      </section>

      <section class="lwc-test lwc-hidden">
        <div class="lwc-topbar">
          <span class="lwc-progress">
            Answered 0 of ${questionsPerAttempt}
          </span>

          <span class="lwc-timer">
            ${String(
              data.settings.durationMinutes
            ).padStart(2, "0")}:00
          </span>

          <button
            class="lwc-primary lwc-topbar-submit"
            type="submit"
            form="${id}-form"
          >
            Submit answers
          </button>
        </div>

        <form class="lwc-form" id="${id}-form">
          <div class="lwc-questions"></div>

          <div class="lwc-actions">
            <button
              class="lwc-primary"
              type="submit"
            >
              Submit answers
            </button>

            <button
              class="lwc-secondary lwc-abandon"
              type="button"
            >
              Return to start
            </button>
          </div>
        </form>
      </section>

      <section class="lwc-card lwc-result lwc-hidden">
        <div class="lwc-summary"></div>

        <div class="lwc-actions">
          <button
            class="lwc-primary lwc-again"
            type="button"
          >
            Try new questions
          </button>

          <button
            class="lwc-secondary lwc-home"
            type="button"
          >
            Change mode
          </button>
        </div>

        <div class="lwc-review-area">
          <h2>Answer review</h2>
          <div class="lwc-reviews"></div>
        </div>
      </section>

      <p class="lwc-footer">
        ${escapeHTML(data.footer)}
      </p>
    `;

    const find = selector =>
      root.querySelector(selector);

    const startSection = find(".lwc-start");
    const testSection = find(".lwc-test");
    const resultSection = find(".lwc-result");
    const form = find(".lwc-form");
    const questionsBox = find(".lwc-questions");
    const progress = find(".lwc-progress");
    const timer = find(".lwc-timer");

    let selectedQuestions = [];
    let interval = null;

    let secondsRemaining =
      data.settings.durationMinutes * 60;

    let currentMode = "timed";
    let finished = false;

    function prepareQuestions() {
      const source = data.settings.shuffleQuestions
        ? shuffle(data.questions)
        : [...data.questions];

      selectedQuestions = source
        .slice(0, questionsPerAttempt)
        .map(question => ({
          ...question,

          displayedOptions:
            data.settings.shuffleOptions
              ? shuffle(question.options)
              : [...question.options]
        }));
    }

    function renderQuestions() {
      prepareQuestions();

      questionsBox.innerHTML = selectedQuestions
        .map((question, questionIndex) => {
          const questionText =
            question.question ||
            "What is the correct answer?";

          return `
            <article class="lwc-question">
              <span class="lwc-question-number">
                Question ${questionIndex + 1}
              </span>

              <h3>
                ${escapeHTML(questionText)}
              </h3>

              ${
                question.code !== undefined
                  ? `
                    <pre><code>${escapeHTML(
                      question.code
                    )}</code></pre>
                  `
                  : ""
              }

              ${
                question.output !== undefined
                  ? `
                    <p>
                      <strong>Output:</strong>
                    </p>

                    <pre><code>${escapeHTML(
                      question.output
                    )}</code></pre>
                  `
                  : ""
              }

              <div class="lwc-options">
                ${question.displayedOptions
                  .map(
                    (option, optionIndex) => `
                      <label class="lwc-option">
                        <input
                          type="radio"
                          name="${id}-question-${questionIndex}"
                          value="${optionIndex}"
                        >

                        <span>
                          <strong>
                            ${String.fromCharCode(
                              65 + optionIndex
                            )}.
                          </strong>

                          ${
                            question.optionType ===
                            "code"
                              ? `
                                <pre><code>${escapeHTML(
                                  option
                                )}</code></pre>
                              `
                              : `
                                <code>${escapeHTML(
                                  option
                                )}</code>
                              `
                          }
                        </span>
                      </label>
                    `
                  )
                  .join("")}
              </div>
            </article>
          `;
        })
        .join("");

      updateProgress();
    }

    function updateProgress() {
      const answered = form.querySelectorAll(
        'input[type="radio"]:checked'
      ).length;

      progress.textContent =
        `Answered ${answered} of ${questionsPerAttempt}`;
    }

    function updateTimer() {
      if (currentMode === "untimed") {
        timer.textContent = "No time limit";
        timer.classList.remove("low");
        timer.classList.add("untimed");
        return;
      }

      const minutes = Math.floor(
        secondsRemaining / 60
      );

      const seconds = secondsRemaining % 60;

      timer.textContent =
        `${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}`;

      timer.classList.remove("untimed");

      timer.classList.toggle(
        "low",
        secondsRemaining <= 60
      );
    }

    function startQuiz() {
      clearInterval(interval);

      const checkedMode = root.querySelector(
        `input[name="${id}-mode"]:checked`
      );

      currentMode = checkedMode
        ? checkedMode.value
        : "timed";

      secondsRemaining =
        data.settings.durationMinutes * 60;

      finished = false;

      renderQuestions();

      startSection.classList.add("lwc-hidden");
      resultSection.classList.add("lwc-hidden");
      testSection.classList.remove("lwc-hidden");

      timer.classList.remove(
        "lwc-hidden",
        "low",
        "untimed"
      );

      updateTimer();

      if (currentMode === "timed") {
        interval = setInterval(() => {
          secondsRemaining -= 1;

          if (secondsRemaining <= 0) {
            secondsRemaining = 0;
            updateTimer();
            clearInterval(interval);
            submitQuiz(true);
            return;
          }

          updateTimer();
        }, 1000);
      }

      testSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    function submitQuiz(timeUp) {
      if (finished) return;

      finished = true;
      clearInterval(interval);

      let score = 0;

      const reviews = selectedQuestions
        .map((question, questionIndex) => {
          const selectedInput = form.querySelector(
            `input[name="${id}-question-${questionIndex}"]:checked`
          );

          const selectedAnswer = selectedInput
            ? question.displayedOptions[
                Number(selectedInput.value)
              ]
            : null;

          const correct =
            selectedAnswer !== null &&
            String(selectedAnswer) ===
              String(question.answer);

          if (correct) score += 1;

          const answerIsCode =
            question.optionType === "code";

          function displayAnswer(value) {
            if (value === null) return "";

            return answerIsCode
              ? `<pre><code>${escapeHTML(
                  value
                )}</code></pre>`
              : `<p><code>${escapeHTML(
                  value
                )}</code></p>`;
          }

          return `
            <article class="lwc-review ${
              correct ? "correct" : "incorrect"
            }">
              <strong>
                Question ${questionIndex + 1}:
                ${correct ? "Correct" : "Incorrect"}
              </strong>

              <h3>
                ${escapeHTML(
                  question.question ||
                    "What is the correct answer?"
                )}
              </h3>

              ${
                question.code !== undefined
                  ? `
                    <pre><code>${escapeHTML(
                      question.code
                    )}</code></pre>
                  `
                  : ""
              }

              ${
                question.output !== undefined
                  ? `
                    <p>
                      <strong>
                        Required output:
                      </strong>
                    </p>

                    <pre><code>${escapeHTML(
                      question.output
                    )}</code></pre>
                  `
                  : ""
              }

              ${
                selectedAnswer === null
                  ? `
                    <p class="lwc-wrong-answer">
                      Not answered
                    </p>
                  `
                  : `
                    <div class="${
                      correct
                        ? "lwc-correct-answer"
                        : "lwc-wrong-answer"
                    }">
                      Your answer:
                    </div>

                    ${displayAnswer(
                      selectedAnswer
                    )}
                  `
              }

              <div class="lwc-correct-answer">
                Correct answer:
              </div>

              ${displayAnswer(question.answer)}

              ${
                question.explanation
                  ? `
                    <p>
                      <strong>Explanation:</strong>
                      ${escapeHTML(
                        question.explanation
                      )}
                    </p>
                  `
                  : ""
              }
            </article>
          `;
        })
        .join("");

      const percentage = Math.round(
        (score / questionsPerAttempt) * 100
      );

      let message;

      if (percentage >= 90) {
        message = "Excellent work!";
      } else if (percentage >= 70) {
        message =
          "Very good—review the few mistakes.";
      } else if (percentage >= 50) {
        message =
          "Good start—practise the reviewed concepts.";
      } else {
        message =
          "Revise the topic and try again.";
      }

      find(".lwc-summary").innerHTML = `
        <div class="lwc-score">
          <div class="lwc-score-circle">
            ${score}/${questionsPerAttempt}
          </div>

          <div>
            <h2>
              ${
                timeUp
                  ? "Time is up!"
                  : "Test completed"
              }
            </h2>

            <p>
              <strong>${percentage}%</strong>
              — ${message}
            </p>

            <p class="lwc-note">
              Mode:
              ${
                currentMode === "timed"
                  ? `Timed (${data.settings.durationMinutes} minutes)`
                  : "Untimed practice"
              }
            </p>
          </div>
        </div>
      `;

      find(".lwc-reviews").innerHTML = reviews;

      find(".lwc-review-area").classList.toggle(
        "lwc-hidden",
        !data.settings.showReview
      );

      testSection.classList.add("lwc-hidden");
      resultSection.classList.remove("lwc-hidden");

      resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    function returnHome() {
      clearInterval(interval);
      finished = true;

      testSection.classList.add("lwc-hidden");
      resultSection.classList.add("lwc-hidden");
      startSection.classList.remove("lwc-hidden");

      startSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    root.querySelectorAll(
      `input[name="${id}-mode"]`
    ).forEach(input => {
      input.addEventListener("change", () => {
        root
          .querySelectorAll(".lwc-mode")
          .forEach(label => {
            label.classList.toggle(
              "selected",
              label.querySelector("input").checked
            );
          });
      });
    });

    find(".lwc-start-button").addEventListener(
      "click",
      startQuiz
    );

    form.addEventListener("change", event => {
      if (
        !event.target.matches(
          'input[type="radio"]'
        )
      ) {
        return;
      }

      const question =
        event.target.closest(".lwc-question");

      if (question) {
        question
          .querySelectorAll(".lwc-option")
          .forEach(option => {
            option.classList.toggle(
              "selected",
              option.querySelector("input").checked
            );
          });
      }

      updateProgress();
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      submitQuiz(false);
    });

    find(".lwc-abandon").addEventListener(
      "click",
      returnHome
    );

    find(".lwc-again").addEventListener(
      "click",
      startQuiz
    );

    find(".lwc-home").addEventListener(
      "click",
      returnHome
    );
  }

  function startAllQuizzes() {
    addStyles();

    document
      .querySelectorAll(".lwc-quiz")
      .forEach((root, index) => {
        if (
          root.dataset.lwcInitialised === "true"
        ) {
          return;
        }

        root.dataset.lwcInitialised = "true";

        initialiseQuiz(root, index + 1);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startAllQuizzes
    );
  } else {
    startAllQuizzes();
  }



  /*
   * =====================================================
   * TICK-TOCK CLOCK SOUND
   * =====================================================
   *
   * Paste this complete section immediately before the
   * final `})();` of lwc-quiz-engine.js.
   *
   * Features:
   * - Starts automatically with a timed quiz.
   * - Alternates between tick and tock.
   * - Stops when the quiz is submitted or abandoned.
   * - Does not run in untimed mode.
   * - Adds an accessible sound on/off button.
   * - Uses Web Audio API; no sound file is required.
   */

  function installClockSounds() {
    document
      .querySelectorAll(".lwc-quiz")
      .forEach(quizRoot => {
        if (
          quizRoot.dataset.lwcClockInstalled ===
          "true"
        ) {
          return;
        }

        const startButton = quizRoot.querySelector(
          ".lwc-start-button"
        );

        const timer = quizRoot.querySelector(
          ".lwc-timer"
        );

        const testSection = quizRoot.querySelector(
          ".lwc-test"
        );

        if (!startButton || !timer || !testSection) {
          return;
        }

        quizRoot.dataset.lwcClockInstalled = "true";

        let audioContext = null;
        let clockInterval = null;
        let soundEnabled = true;
        let tickNumber = 0;

        /*
         * Add the sound-button styles once.
         */
        if (
          !document.getElementById(
            "lwc-clock-sound-styles"
          )
        ) {
          const soundStyles =
            document.createElement("style");

          soundStyles.id =
            "lwc-clock-sound-styles";

          soundStyles.textContent = `
            .lwc-quiz .lwc-sound-toggle {
              position: static !important;
              display: grid !important;
              place-items: center;
              flex: 0 0 auto;
              width: 44px !important;
              min-width: 44px !important;
              height: 44px !important;
              min-height: 44px !important;
              margin: 0 !important;
              padding: 0 !important;
              color: #075985;
              background: #e0f2fe;
              border: 1px solid #7dd3fc;
              border-radius: 50%;
              font-size: 1.1rem;
              line-height: 1;
              cursor: pointer;
            }

            .lwc-quiz .lwc-sound-toggle:hover {
              color: #ffffff;
              background: #075985;
            }

            .lwc-quiz .lwc-sound-toggle.muted {
              color: #526477;
              background: #e2e8f0;
              border-color: #cbd5e1;
            }

            .lwc-quiz .lwc-sound-toggle:focus-visible {
              outline: 3px solid #f59e0b;
              outline-offset: 3px;
            }

            @media (max-width: 650px) {
              .lwc-quiz .lwc-sound-toggle {
                width: 38px !important;
                min-width: 38px !important;
                height: 38px !important;
                min-height: 38px !important;
                font-size: 1rem;
              }
            }

            @media (max-width: 460px) {
              .lwc-quiz .lwc-topbar {
                gap: 5px;
              }

              .lwc-quiz .lwc-sound-toggle {
                width: 34px !important;
                min-width: 34px !important;
                height: 34px !important;
                min-height: 34px !important;
                font-size: 0.9rem;
              }
            }
          `;

          document.head.appendChild(soundStyles);
        }

        /*
         * Add the sound control beside the timer.
         */
        const soundButton =
          document.createElement("button");

        soundButton.type = "button";
        soundButton.className =
          "lwc-sound-toggle";

        soundButton.title =
          "Mute clock sound";

        soundButton.setAttribute(
          "aria-label",
          "Mute clock sound"
        );

        soundButton.setAttribute(
          "aria-pressed",
          "false"
        );

        soundButton.innerHTML =
          '<span aria-hidden="true">🔊</span>';

        timer.insertAdjacentElement(
          "afterend",
          soundButton
        );

        function getAudioContext() {
          const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

          if (!AudioContextClass) {
            return null;
          }

          if (!audioContext) {
            audioContext =
              new AudioContextClass();
          }

          if (
            audioContext.state === "suspended"
          ) {
            audioContext.resume().catch(
              () => {}
            );
          }

          return audioContext;
        }

        /*
         * Produce a brief mechanical clock sound.
         *
         * Tick uses a slightly higher frequency.
         * Tock uses a slightly lower frequency.
         */
        function playClockSound() {
          if (!soundEnabled) return;

          if (
            testSection.classList.contains(
              "lwc-hidden"
            )
          ) {
            return;
          }

          const selectedMode =
            quizRoot.querySelector(
              'input[value="timed"]:checked'
            );

          if (!selectedMode) return;

          const context = getAudioContext();

          if (!context) return;

          const isTick =
            tickNumber % 2 === 0;

          tickNumber += 1;

          const now = context.currentTime;

          const oscillator =
            context.createOscillator();

          const gain =
            context.createGain();

          const filter =
            context.createBiquadFilter();

          oscillator.type = "triangle";

          oscillator.frequency.setValueAtTime(
            isTick ? 1150 : 760,
            now
          );

          oscillator.frequency.exponentialRampToValueAtTime(
            isTick ? 850 : 560,
            now + 0.065
          );

          filter.type = "highpass";

          filter.frequency.setValueAtTime(
            420,
            now
          );

          filter.Q.setValueAtTime(
            0.8,
            now
          );

          gain.gain.setValueAtTime(
            0.0001,
            now
          );

          gain.gain.exponentialRampToValueAtTime(
            isTick ? 0.055 : 0.07,
            now + 0.006
          );

          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + 0.085
          );

          oscillator.connect(filter);
          filter.connect(gain);
          gain.connect(context.destination);

          oscillator.start(now);

          oscillator.stop(
            now + 0.09
          );
        }

        function stopClock() {
          if (clockInterval !== null) {
            clearInterval(clockInterval);
            clockInterval = null;
          }

          tickNumber = 0;
        }

        function startClock() {
          stopClock();

          const selectedMode =
            quizRoot.querySelector(
              'input[value="timed"]:checked'
            );

          if (!selectedMode) return;

          /*
           * The audio context is created after the
           * student clicks Start, satisfying browser
           * autoplay restrictions.
           */
          getAudioContext();

          playClockSound();

          clockInterval = setInterval(
            playClockSound,
            1000
          );
        }

        function updateSoundButton() {
          soundButton.classList.toggle(
            "muted",
            !soundEnabled
          );

          soundButton.innerHTML =
            soundEnabled
              ? '<span aria-hidden="true">🔊</span>'
              : '<span aria-hidden="true">🔇</span>';

          const label = soundEnabled
            ? "Mute clock sound"
            : "Turn on clock sound";

          soundButton.title = label;

          soundButton.setAttribute(
            "aria-label",
            label
          );

          soundButton.setAttribute(
            "aria-pressed",
            String(!soundEnabled)
          );
        }

        soundButton.addEventListener(
          "click",
          () => {
            soundEnabled = !soundEnabled;

            updateSoundButton();

            if (soundEnabled) {
              getAudioContext();

              const selectedMode =
                quizRoot.querySelector(
                  'input[value="timed"]:checked'
                );

              if (
                selectedMode &&
                !testSection.classList.contains(
                  "lwc-hidden"
                )
              ) {
                playClockSound();
              }
            }
          }
        );

        /*
         * Start the sound after the quiz engine handles
         * the Start button click.
         */
        startButton.addEventListener(
          "click",
          () => {
            window.setTimeout(
              startClock,
              50
            );
          }
        );

        /*
         * "Try new questions" starts another attempt.
         */
        const againButton =
          quizRoot.querySelector(
            ".lwc-again"
          );

        if (againButton) {
          againButton.addEventListener(
            "click",
            () => {
              window.setTimeout(
                startClock,
                50
              );
            }
          );
        }

        /*
         * Stop sound when answers are submitted.
         */
        quizRoot
          .querySelectorAll(
            '.lwc-form button[type="submit"], ' +
            ".lwc-topbar-submit"
          )
          .forEach(button => {
            button.addEventListener(
              "click",
              stopClock
            );
          });

        const form =
          quizRoot.querySelector(
            ".lwc-form"
          );

        if (form) {
          form.addEventListener(
            "submit",
            stopClock
          );
        }

        /*
         * Stop sound when the student abandons the test
         * or returns to the mode-selection screen.
         */
        quizRoot
          .querySelectorAll(
            ".lwc-abandon, .lwc-home"
          )
          .forEach(button => {
            button.addEventListener(
              "click",
              stopClock
            );
          });

        /*
         * Watch for automatic submission when time ends.
         * When the test section becomes hidden, the clock
         * sound is stopped.
         */
        const testObserver =
          new MutationObserver(() => {
            if (
              testSection.classList.contains(
                "lwc-hidden"
              )
            ) {
              stopClock();
            }
          });

        testObserver.observe(
          testSection,
          {
            attributes: true,
            attributeFilter: ["class"]
          }
        );

        /*
         * Stop the sound if the page becomes hidden.
         * Restart it when the student returns, provided
         * that the timed test is still active.
         */
        document.addEventListener(
          "visibilitychange",
          () => {
            if (document.hidden) {
              stopClock();
              return;
            }

            const selectedMode =
              quizRoot.querySelector(
                'input[value="timed"]:checked'
              );

            if (
              selectedMode &&
              !testSection.classList.contains(
                "lwc-hidden"
              )
            ) {
              startClock();
            }
          }
        );

        /*
         * Stop the sound before leaving the page.
         */
        window.addEventListener(
          "pagehide",
          stopClock
        );

        updateSoundButton();
      });
  }

  /*
   * Quiz content is loaded asynchronously from JSON,
   * so wait until the generated quiz interface exists.
   */
  const clockInstallationObserver =
    new MutationObserver(() => {
      installClockSounds();
    });

  clockInstallationObserver.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      installClockSounds
    );
  } else {
    installClockSounds();
  }


})();

/*
 * Permanent top-toolbar fix
 * Keeps timer and Submit answers visible while scrolling.
 */
(function () {
  "use strict";

  const style = document.createElement("style");
  style.id = "lwc-permanent-toolbar-fix";

  style.textContent = `
    .lwc-quiz {
      left: auto !important;
      margin-left: calc(
        50% - min(750px, calc(50vw - 16px))
      ) !important;
      transform: none !important;
      perspective: none !important;
      filter: none !important;
      contain: none !important;
      will-change: auto !important;
    }

    .lwc-quiz .lwc-topbar {
      position: fixed !important;
      top: 12px !important;
      right: max(
        16px,
        calc((100vw - 1500px) / 2)
      ) !important;
      bottom: auto !important;
      left: max(
        16px,
        calc((100vw - 1500px) / 2)
      ) !important;

      z-index: 2147483647 !important;

      width: auto !important;
      max-width: none !important;
      margin: 0 !important;

      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;

      transform: none !important;
      clip: auto !important;
      clip-path: none !important;
    }

    .lwc-quiz .lwc-test {
      padding-top: 92px !important;
    }

    @media (max-width: 650px) {
      .lwc-quiz {
        margin-left: calc(
          50% - 50vw + 8px
        ) !important;
        transform: none !important;
      }

      .lwc-quiz .lwc-topbar {
        top: 6px !important;
        right: 8px !important;
        left: 8px !important;
        width: auto !important;
      }

      .lwc-quiz .lwc-test {
        padding-top: 80px !important;
      }
    }
  `;

  document.head.appendChild(style);
})();