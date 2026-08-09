/*
 * Learn With Champak – Reusable Quiz Engine
 *
 * Example:
 *
 * <div
 *   class="lwc-quiz"
 *   data-questions-url="https://example.com/questions.json">
 *   Loading quiz...
 * </div>
 *
 * <script src="https://example.com/lwc-quiz-engine.js" defer></script>
 */

(function () {
  "use strict";

  const STYLE_ID = "lwc-quiz-engine-styles";

  function addStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

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

        max-width: 1180px;
        margin: 24px auto;
        color: var(--lwc-dark);
        font-family: Arial, Helvetica, sans-serif;
        line-height: 1.55;
      }

      .lwc-quiz *,
      .lwc-quiz *::before,
      .lwc-quiz *::after {
        box-sizing: border-box;
      }

      .lwc-quiz .lwc-hero {
        padding: 32px;
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
        margin: 0 0 6px;
        color: #bae6fd;
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .lwc-quiz h1 {
        margin: 0;
        font-size: clamp(1.8rem, 4vw, 3rem);
        line-height: 1.12;
      }

      .lwc-quiz .lwc-lead {
        max-width: 780px;
        margin: 14px 0 0;
        color: #e0f2fe;
        font-size: 1.04rem;
      }

      .lwc-quiz .lwc-card {
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
        position: relative;
        display: block;
        padding: 18px;
        background: #f8fafc;
        border: 2px solid var(--lwc-border);
        border-radius: 16px;
        cursor: pointer;
      }

      .lwc-quiz .lwc-mode.selected {
        background: var(--lwc-light);
        border-color: var(--lwc-secondary);
      }

      .lwc-quiz .lwc-mode input {
        position: absolute;
        top: 18px;
        right: 18px;
        accent-color: var(--lwc-primary);
      }

      .lwc-quiz .lwc-mode strong {
        display: block;
        padding-right: 30px;
        color: var(--lwc-primary);
        font-size: 1.08rem;
      }

      .lwc-quiz .lwc-mode span {
        display: block;
        margin-top: 4px;
        color: var(--lwc-muted);
      }

      .lwc-quiz button {
        padding: 12px 18px;
        border: 0;
        border-radius: 12px;
        cursor: pointer;
        font: 700 1rem Arial, sans-serif;
      }

      .lwc-quiz button:hover {
        transform: translateY(-1px);
      }

      .lwc-quiz button:focus-visible,
      .lwc-quiz input:focus-visible + span {
        outline: 3px solid #f59e0b;
        outline-offset: 3px;
      }

      .lwc-quiz .lwc-primary {
        color: #ffffff;
        background: var(--lwc-primary);
      }

      .lwc-quiz .lwc-secondary {
        color: var(--lwc-dark);
        background: #e2e8f0;
      }

      .lwc-quiz .lwc-hidden {
        display: none !important;
      }

      .lwc-quiz .lwc-topbar {
        position: sticky;
        top: 8px;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 18px 0;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.97);
        border: 1px solid var(--lwc-border);
        border-radius: 14px;
        box-shadow: 0 7px 20px rgba(15, 23, 42, 0.1);
      }

      .lwc-quiz .lwc-progress {
        color: var(--lwc-primary);
        font-weight: 700;
      }

      .lwc-quiz .lwc-timer {
        min-width: 84px;
        padding: 7px 12px;
        color: #ffffff;
        background: #082f49;
        border-radius: 999px;
        font-variant-numeric: tabular-nums;
        font-weight: 900;
        text-align: center;
      }

      .lwc-quiz .lwc-timer.low {
        background: var(--lwc-danger);
        animation: lwc-pulse 1s infinite;
      }

      @keyframes lwc-pulse {
        50% {
          opacity: 0.7;
        }
      }

      .lwc-quiz .lwc-question {
        margin: 18px 0;
        padding: 22px;
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
        margin: 14px 0;
        padding: 18px;
        overflow: auto;
        color: #f8fafc;
        background: #0b1220;
        border-radius: 12px;
        font: 600 0.96rem/1.65 Consolas, Monaco, monospace;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .lwc-quiz .lwc-options {
        display: grid;
        gap: 10px;
      }

      .lwc-quiz .lwc-option {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 14px;
        background: #ffffff;
        border: 1px solid var(--lwc-border);
        border-radius: 12px;
        cursor: pointer;
      }

      .lwc-quiz .lwc-option:hover,
      .lwc-quiz .lwc-option.selected {
        background: var(--lwc-light);
        border-color: #38bdf8;
      }

      .lwc-quiz .lwc-option input {
        margin-top: 8px;
        accent-color: var(--lwc-primary);
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
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin: 24px 0;
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
        padding: 14px 16px;
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

      @media (max-width: 650px) {
        .lwc-quiz {
          margin: 10px auto;
        }

        .lwc-quiz .lwc-hero,
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
      }
    `;

    document.head.appendChild(style);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[character]
    );
  }

  function shuffle(items) {
    const result = [...items];

    for (let index = result.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));

      [result[index], result[randomIndex]] = [
        result[randomIndex],
        result[index]
      ];
    }

    return result;
  }

  function normaliseData(data) {
    const settings = data.settings || {};

    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error("The JSON file does not contain any questions.");
    }

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

      buildQuiz(root, data, quizNumber);
    } catch (error) {
      console.error("Learn With Champak quiz error:", error);

      root.innerHTML = `
        <div class="lwc-card">
          <h2>Quiz could not be loaded</h2>

          <p class="lwc-error">
            ${escapeHTML(error.message)}
          </p>

          <p class="lwc-note">
            Check the JSON URL, JSON syntax and GitHub Pages publication.
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

        <p>${escapeHTML(data.instructions)}</p>

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

        <button class="lwc-primary lwc-start-button" type="button">
          Start the test
        </button>

        <p class="lwc-note">
          Each question carries one mark. There is no negative marking.
        </p>
      </section>

      <section class="lwc-test lwc-hidden">
        <div class="lwc-topbar">
          <span class="lwc-progress">
            Answered 0 of ${questionsPerAttempt}
          </span>

          <span class="lwc-timer">
            ${data.settings.durationMinutes}:00
          </span>
        </div>

        <form class="lwc-form">
          <div class="lwc-questions"></div>

          <div class="lwc-actions">
            <button class="lwc-primary" type="submit">
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

    const find = selector => root.querySelector(selector);

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
          displayedOptions: data.settings.shuffleOptions
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

              <h3>${escapeHTML(questionText)}</h3>

              ${
                question.code !== undefined
                  ? `
                    <pre><code>${
                      escapeHTML(question.code)
                    }</code></pre>
                  `
                  : ""
              }

              ${
                question.output !== undefined
                  ? `
                    <p><strong>Output:</strong></p>

                    <pre><code>${
                      escapeHTML(question.output)
                    }</code></pre>
                  `
                  : ""
              }

              <div class="lwc-options">
                ${question.displayedOptions
                  .map((option, optionIndex) => `
                    <label class="lwc-option">
                      <input
                        type="radio"
                        name="${id}-question-${questionIndex}"
                        value="${optionIndex}"
                      >

                      <span>
                        <strong>
                          ${String.fromCharCode(65 + optionIndex)}.
                        </strong>

                        ${
                          question.optionType === "code"
                            ? `
                              <pre><code>${
                                escapeHTML(option)
                              }</code></pre>
                            `
                            : `
                              <code>${escapeHTML(option)}</code>
                            `
                        }
                      </span>
                    </label>
                  `)
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
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;

      timer.textContent =
        `${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}`;

      timer.classList.toggle("low", secondsRemaining <= 60);
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

      timer.classList.toggle(
        "lwc-hidden",
        currentMode === "untimed"
      );

      if (currentMode === "timed") {
        updateTimer();

        interval = setInterval(() => {
          secondsRemaining--;
          updateTimer();

          if (secondsRemaining <= 0) {
            clearInterval(interval);
            submitQuiz(true);
          }
        }, 1000);
      }

      testSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    function submitQuiz(timeUp) {
      if (finished) {
        return;
      }

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
            String(selectedAnswer) === String(question.answer);

          if (correct) {
            score++;
          }

          const answerIsCode =
            question.optionType === "code";

          function displayAnswer(value) {
            if (value === null) {
              return "";
            }

            return answerIsCode
              ? `<pre><code>${escapeHTML(value)}</code></pre>`
              : `<p><code>${escapeHTML(value)}</code></p>`;
          }

          return `
            <article class="lwc-review ${
              correct ? "correct" : "incorrect"
            }">
              <strong>
                Question ${questionIndex + 1}:
                ${correct ? "Correct" : "Incorrect"}
              </strong>

              ${
                question.code !== undefined
                  ? `
                    <pre><code>${
                      escapeHTML(question.code)
                    }</code></pre>
                  `
                  : ""
              }

              ${
                question.output !== undefined
                  ? `
                    <p>
                      Required output:
                      <code>${escapeHTML(question.output)}</code>
                    </p>
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

                    ${displayAnswer(selectedAnswer)}
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
                      ${escapeHTML(question.explanation)}
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
        message = "Very good—review the few mistakes.";
      } else if (percentage >= 50) {
        message = "Good start—practise the reviewed concepts.";
      } else {
        message = "Revise the topic and try again.";
      }

      find(".lwc-summary").innerHTML = `
        <div class="lwc-score">
          <div class="lwc-score-circle">
            ${score}/${questionsPerAttempt}
          </div>

          <div>
            <h2>
              ${timeUp ? "Time is up!" : "Test completed"}
            </h2>

            <p>
              <strong>${percentage}%</strong> — ${message}
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
        root.querySelectorAll(".lwc-mode").forEach(label => {
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
      if (event.target.matches('input[type="radio"]')) {
        const question = event.target.closest(".lwc-question");

        question.querySelectorAll(".lwc-option").forEach(option => {
          option.classList.toggle(
            "selected",
            option.querySelector("input").checked
          );
        });

        updateProgress();
      }
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

    document.querySelectorAll(".lwc-quiz").forEach(
      (root, index) => {
        if (root.dataset.lwcInitialised === "true") {
          return;
        }

        root.dataset.lwcInitialised = "true";
        initialiseQuiz(root, index + 1);
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startAllQuizzes
    ); 
  } else {
    startAllQuizzes();
  }
})();