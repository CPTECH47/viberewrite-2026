"use strict";

// This is a deterministic local demonstration, not a connection to an AI model.
const TONE_LABELS = {
  formality: ["Very casual", "Casual", "Balanced", "Professional", "Formal"],
  verbosity: ["Very brief", "Brief", "Balanced", "Detailed", "Expanded"],
  enthusiasm: ["Reserved", "Calm", "Balanced", "Warm", "Energetic"],
};

const PERSONA_LABELS = {
  executive: "Executive / C-level",
  supportive: "Supportive peer",
  legal: "Legal / compliance",
  genz: "Gen-Z",
};

const form = document.querySelector("#rewrite-form");
const roughInput = document.querySelector("#rough-input");
const charCount = document.querySelector("#char-count");
const originalOutput = document.querySelector("#original-output");
const rewrittenOutput = document.querySelector("#rewritten-output");
const changePanel = document.querySelector("#change-panel");
const changeSummary = document.querySelector("#change-summary");
const formStatus = document.querySelector("#form-status");
const copyButton = document.querySelector("#copy-button");
const copyLabel = document.querySelector("#copy-label");
const exampleButton = document.querySelector("#example-button");
const downloadButton = document.querySelector("#download-button");
const formatDescription = document.querySelector("#format-description");
const formatButtons = [...document.querySelectorAll(".format-option")];
const toneInputs = ["formality", "verbosity", "enthusiasm"].map((name) => document.querySelector(`#${name}`));

const EXAMPLE_MESSAGE = "Testing found bugs and the project is delayed. We need two more days.";
const FORMAT_DESCRIPTIONS = {
  plain: "Copy a clean, unformatted draft.",
  email: "A subject line and message, ready to paste into email.",
  slack: "A short heading and message for a Slack post.",
  markdown: "A Markdown heading and message for notes or docs.",
};
let baseRewrite = "";
let currentRewrite = "";
let currentRaw = "";
let currentSummary = "";
let selectedFormat = "plain";

function updateToneLabels() {
  for (const input of toneInputs) {
    const output = document.querySelector(`#${input.id}-value`);
    output.value = TONE_LABELS[input.id][Number(input.value) - 1];
  }
}

function cleanMessage(raw) {
  const lines = raw
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((line) => (/[.!?]$/.test(line) ? line : `${line}.`));

  const text = lines.join(" ").replace(/\s+([,.!?;:])/g, "$1").replace(/([.!?])(?=\S)/g, "$1 ");
  return text.replace(/(^|[.!?]\s+)([a-z])/g, (_match, before, letter) => before + letter.toUpperCase());
}

function replacePhrases(text, persona, formality) {
  const rules = {
    executive: [
      [/\btesting found bugs\b/gi, "Testing identified issues"],
      [/\bbugs\b/gi, "issues"],
      [/\bbug\b/gi, "issue"],
      [/\bwe need\b/gi, "we require"],
      [/\bmore days\b/gi, "additional days"],
      [/\bfix\b/gi, "resolve"],
    ],
    supportive: [
      [/\btesting found bugs\b/gi, "We found bugs during testing"],
      [/\bwe need\b/gi, "we could use"],
      [/\bfix\b/gi, "work through"],
    ],
    legal: [
      [/\btesting found bugs\b/gi, "Testing identified defects"],
      [/\bbugs\b/gi, "defects"],
      [/\bbug\b/gi, "defect"],
      [/\bwe need\b/gi, "we require"],
      [/\bmore days\b/gi, "additional days"],
      [/\bfix\b/gi, "address"],
    ],
    genz: [
      [/\btesting found bugs\b/gi, "Testing turned up some bugs"],
      [/\bthe project is delayed\b/gi, "the timeline has slipped"],
      [/\bwe need\b/gi, "we'll need"],
      [/\bmore days\b/gi, "extra days"],
    ],
  };

  let result = text;
  for (const [pattern, replacement] of rules[persona]) {
    result = result.replace(pattern, replacement);
  }

  if (formality >= 4) {
    result = result
      .replace(/\bcan't\b/gi, "cannot")
      .replace(/\bdon't\b/gi, "do not")
      .replace(/\bwon't\b/gi, "will not")
      .replace(/\bASAP\b/g, "as soon as possible");
  } else if (formality <= 2 && persona !== "legal") {
    result = result
      .replace(/\bcannot\b/gi, "can't")
      .replace(/\bdo not\b/gi, "don't")
      .replace(/\bapproximately\b/gi, "about");
  }

  return result.replace(/(^|[.!?]\s+)([a-z])/g, (_match, before, letter) => before + letter.toUpperCase());
}

function openingFor(persona, formality, enthusiasm) {
  if (persona === "executive") {
    return formality >= 4 ? "Executive update:" : enthusiasm >= 4 ? "A quick update:" : "Quick update:";
  }
  if (persona === "supportive") {
    return formality >= 4 ? "Hello team," : enthusiasm >= 4 ? "Hi team —" : "Hi team,";
  }
  if (persona === "legal") {
    return formality >= 4 ? "For factual review:" : "For review:";
  }
  return formality >= 4 ? "Quick update:" : enthusiasm >= 4 ? "Quick heads-up!" : "Quick heads-up:";
}

function closingFor(persona, enthusiasm) {
  if (persona === "executive") return "Please review and share any questions.";
  if (persona === "supportive") return enthusiasm >= 4 ? "Thanks for working through this together." : "Please let me know what you think.";
  if (persona === "legal") return "Please confirm the details before external use.";
  return enthusiasm >= 4 ? "Thanks for taking a look!" : "Let me know what you think.";
}

function buildRewrite(raw, persona, formality, verbosity, enthusiasm) {
  const body = replacePhrases(cleanMessage(raw), persona, formality);
  const opening = openingFor(persona, formality, enthusiasm);
  const closing = closingFor(persona, enthusiasm);
  let text = body;

  if (verbosity === 2) text = `${opening} ${body}`;
  if (verbosity >= 3) text = `${opening}\n\n${body}`;
  if (verbosity >= 4) text += `\n\n${closing}`;
  if (verbosity === 5) text += " If any detail needs correction, please tell me.";

  const summary = `${PERSONA_LABELS[persona]} framing · ${TONE_LABELS.formality[formality - 1].toLowerCase()} formality · ${TONE_LABELS.verbosity[verbosity - 1].toLowerCase()} length · ${TONE_LABELS.enthusiasm[enthusiasm - 1].toLowerCase()} energy. Fixed local rules preserve your main text; review the result for accuracy.`;
  return { text, summary };
}

function tokensFor(text) {
  return text.match(/\s+|[\p{L}\p{N}]+|[^\s\p{L}\p{N}]+/gu) || [];
}

function diffMatches(leftTokens, rightTokens) {
  const left = leftTokens.filter((token) => !/^\s+$/.test(token)).map((token) => token.toLocaleLowerCase());
  const right = rightTokens.filter((token) => !/^\s+$/.test(token)).map((token) => token.toLocaleLowerCase());
  const rows = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1));

  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      rows[i][j] = left[i] === right[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1]);
    }
  }

  const leftMatches = new Set();
  const rightMatches = new Set();
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      leftMatches.add(i++);
      rightMatches.add(j++);
    } else if (rows[i + 1][j] >= rows[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return { leftMatches, rightMatches };
}

function renderHighlighted(container, tokens, matchedPositions, className) {
  const fragment = document.createDocumentFragment();
  let position = 0;
  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      fragment.append(document.createTextNode(token));
      continue;
    }
    if (matchedPositions.has(position++)) {
      fragment.append(document.createTextNode(token));
    } else {
      const mark = document.createElement("mark");
      mark.className = className;
      mark.textContent = token;
      fragment.append(mark);
    }
  }
  container.replaceChildren(fragment);
  container.classList.remove("empty-draft");
}

function updateCharacterCount() {
  charCount.textContent = `${roughInput.value.length.toLocaleString()} / 1,200`;
}

function setStatus(message, error = false) {
  formStatus.textContent = message;
  formStatus.classList.toggle("error", error);
}

function formattedDraft(text, format) {
  if (format === "email") return `Subject: Project update\n\n${text}`;
  if (format === "slack") return `*Team update*\n\n${text}`;
  if (format === "markdown") return `## Message\n\n${text}`;
  return text;
}

function renderDraft() {
  currentRewrite = formattedDraft(baseRewrite, selectedFormat);
  const leftTokens = tokensFor(currentRaw);
  const rightTokens = tokensFor(currentRewrite);
  const { leftMatches, rightMatches } = diffMatches(leftTokens, rightTokens);
  renderHighlighted(originalOutput, leftTokens, leftMatches, "diff-removed");
  renderHighlighted(rewrittenOutput, rightTokens, rightMatches, "diff-added");
  changeSummary.textContent = `${currentSummary} ${selectedFormat === "plain" ? "" : `Formatted for ${selectedFormat}.`}`;
  changePanel.hidden = false;
  copyButton.disabled = false;
  downloadButton.disabled = false;
  copyLabel.textContent = "Copy draft";
}

function markDraftStale() {
  if (!currentRewrite) return;
  baseRewrite = "";
  currentRewrite = "";
  copyButton.disabled = true;
  downloadButton.disabled = true;
  copyLabel.textContent = "Copy draft";
  changePanel.hidden = true;
  originalOutput.replaceChildren();
  rewrittenOutput.replaceChildren();
  originalOutput.classList.add("empty-draft");
  rewrittenOutput.classList.add("empty-draft");
  const originalPlaceholder = document.createElement("p");
  originalPlaceholder.textContent = "Rewrite to see your original message.";
  const rewritePlaceholder = document.createElement("p");
  rewritePlaceholder.textContent = "Your refreshed draft will appear here.";
  originalOutput.append(originalPlaceholder);
  rewrittenOutput.append(rewritePlaceholder);
  setStatus("Settings changed. Rewrite to refresh the draft.");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const raw = roughInput.value.trim();
  if (!raw) {
    setStatus("Add a rough message first, or choose Use example.", true);
    roughInput.setAttribute("aria-invalid", "true");
    roughInput.focus();
    return;
  }
  roughInput.removeAttribute("aria-invalid");

  const persona = form.elements.persona.value;
  const formality = Number(form.elements.formality.value);
  const verbosity = Number(form.elements.verbosity.value);
  const enthusiasm = Number(form.elements.enthusiasm.value);
  const result = buildRewrite(raw, persona, formality, verbosity, enthusiasm);
  baseRewrite = result.text;
  currentRaw = raw;
  currentSummary = result.summary;
  renderDraft();
  setStatus("Draft ready. Compare the highlighted changes before using it.");
});

for (const button of formatButtons) {
  button.addEventListener("click", () => {
    selectedFormat = button.dataset.format;
    for (const option of formatButtons) option.setAttribute("aria-pressed", String(option === button));
    formatDescription.textContent = FORMAT_DESCRIPTIONS[selectedFormat];
    if (baseRewrite) {
      renderDraft();
      setStatus(`${selectedFormat === "plain" ? "Plain" : button.textContent} format ready to copy or download.`);
    }
  });
}

exampleButton.addEventListener("click", () => {
  roughInput.value = EXAMPLE_MESSAGE;
  roughInput.removeAttribute("aria-invalid");
  updateCharacterCount();
  markDraftStale();
  setStatus("Example loaded. Choose a persona and select Rewrite message.");
  roughInput.focus();
});

downloadButton.addEventListener("click", () => {
  if (!currentRewrite) return;
  try {
    const extension = selectedFormat === "markdown" ? "md" : "txt";
    const blob = new Blob([currentRewrite], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `viberewrite-${selectedFormat}.${extension}`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`${link.download} downloaded. Review the draft before sending.`);
  } catch {
    setStatus("Download was blocked by the browser. Use Copy draft instead.", true);
  }
});

copyButton.addEventListener("click", async () => {
  if (!currentRewrite) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(currentRewrite);
    } else {
      const temporaryInput = document.createElement("textarea");
      temporaryInput.value = currentRewrite;
      temporaryInput.style.position = "fixed";
      temporaryInput.style.opacity = "0";
      document.body.append(temporaryInput);
      try {
        temporaryInput.select();
        if (!document.execCommand("copy")) throw new Error("Copy was not available");
      } finally {
        temporaryInput.remove();
      }
    }
    copyLabel.textContent = "Copied!";
    setStatus("Rewritten text copied to clipboard.");
  } catch {
    setStatus("Copy was blocked by the browser. Select and copy the text manually.", true);
  }
});

roughInput.addEventListener("input", () => {
  updateCharacterCount();
  roughInput.removeAttribute("aria-invalid");
  markDraftStale();
});
for (const input of toneInputs) {
  input.addEventListener("input", () => {
    updateToneLabels();
    markDraftStale();
  });
}
for (const input of form.querySelectorAll('input[name="persona"]')) {
  input.addEventListener("change", markDraftStale);
}
updateCharacterCount();
updateToneLabels();
