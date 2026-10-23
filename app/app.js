"use strict";

// The browser calls the local Node backend. Provider credentials never belong here.
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
let currentSubject = "";
let requestSequence = 0;
let pendingController = null;
let connectionSequence = 0;
const rewriteButton = document.querySelector("#rewrite-button");
const rewriteLabel = document.querySelector("#rewrite-label");
const cancelButton = document.querySelector("#cancel-button");
const connectionBadge = document.querySelector("#connection-badge");
const connectionLabel = document.querySelector("#connection-label");
const connectionTitle = document.querySelector("#connection-title");
const connectionMessage = document.querySelector("#connection-message");
const connectionRetry = document.querySelector("#connection-retry");
const setupHelp = document.querySelector("#setup-help");
const privacyNotice = document.querySelector("#privacy-notice");

function setBusy(busy) {
  rewriteButton.disabled = busy;
  rewriteLabel.textContent = busy ? "Rewriting with AI…" : "Rewrite message";
  cancelButton.hidden = !busy;
  form.setAttribute("aria-busy", String(busy));
}

// Invalidate first, then abort: even a response already queued cannot replace a newer draft.
function cancelPending(message) {
  requestSequence += 1;
  const wasPending = Boolean(pendingController);
  pendingController?.abort();
  pendingController = null;
  setBusy(false);
  if (wasPending && message) setStatus(message);
  return wasPending;
}

function showConnection(status) {
  const ready = status.ready === true;
  const local = status.provider !== "openai";
  connectionBadge.dataset.state = ready ? "ready" : "offline";
  connectionLabel.textContent = ready ? `${local ? "Local AI" : "OpenAI"} · Connected` : "AI not connected";
  connectionTitle.textContent = ready ? `${status.model || "Model"} is ready` : "Model connection needs attention";
  connectionMessage.textContent = status.message || (ready ? "Ready to rewrite. The first request can take longer while the model loads." : "Start the Node server and Ollama, then check the connection again.");
  setupHelp.hidden = ready || !local;
  privacyNotice.textContent = local
    ? "Ollama runs the AI on the app host. On a shared demo link, your message travels through the tunnel to that computer. AI can still change details; review names, requests, dates, and amounts before sending."
    : "OpenAI is selected on the server. Your message is sent to OpenAI; the API key stays on the server. AI can change details, so review the draft before sending.";
}

async function checkConnection() {
  const sequence = ++connectionSequence;
  connectionRetry.disabled = true;
  connectionMessage.textContent = "Checking the backend and model…";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch("/api/status", { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error("The backend status endpoint is unavailable. Run node server.mjs and open the address it prints.");
    const status = await response.json();
    if (sequence === connectionSequence) showConnection(status);
  } catch (error) {
    if (sequence === connectionSequence) showConnection({ ready: false, message: error.name === "AbortError" ? "Connection check timed out. Start Ollama and retry." : "Cannot reach the Node backend. Run node server.mjs in the project folder, then open its address. A Python static server cannot run AI rewrites." });
  } finally {
    clearTimeout(timeout);
    if (sequence === connectionSequence) connectionRetry.disabled = false;
  }
}

function updateToneLabels() {
  for (const input of toneInputs) {
    const output = document.querySelector(`#${input.id}-value`);
    output.value = TONE_LABELS[input.id][Number(input.value) - 1];
  }
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
  if (format === "email") return `Subject: ${currentSubject}\n\n${text}`;
  if (format === "slack") return `*${currentSubject}*\n\n${text}`;
  if (format === "markdown") return `## ${currentSubject}\n\n${text}`;
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

function clearDraft() {
  baseRewrite = "";
  currentRewrite = "";
  currentSubject = "";
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
  rewritePlaceholder.textContent = "Your new AI draft will appear here.";
  originalOutput.append(originalPlaceholder);
  rewrittenOutput.append(rewritePlaceholder);
}

function markDraftStale() {
  const hadResult = Boolean(currentRewrite);
  const cancelled = cancelPending();
  clearDraft();
  if (cancelled || hadResult) setStatus(cancelled ? "Rewrite cancelled because your input or settings changed. Rewrite when ready." : "Input or settings changed. Rewrite to refresh the draft.");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  cancelPending();
  clearDraft();
  const raw = roughInput.value.trim();
  if (!raw || raw.length > 1200) {
    setStatus(!raw ? "Add a rough message first, or choose Use example." : "Please shorten the message to 1,200 characters or fewer.", true);
    roughInput.setAttribute("aria-invalid", "true");
    roughInput.focus();
    return;
  }
  roughInput.removeAttribute("aria-invalid");
  const settings = {
    text: raw,
    persona: form.elements.persona.value,
    formality: Number(form.elements.formality.value),
    verbosity: Number(form.elements.verbosity.value),
    enthusiasm: Number(form.elements.enthusiasm.value),
  };
  const sequence = ++requestSequence;
  const controller = new AbortController();
  pendingController = controller;
  setBusy(true);
  setStatus("Rewriting with AI. The first request may take longer while the local model loads. You can cancel anytime.");
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 125000);
  try {
    const response = await fetch("/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
      signal: controller.signal,
    });
    let result;
    try { result = await response.json(); }
    catch { throw new Error("The server returned an unreadable response. Start the app with node server.mjs and try again."); }
    if (sequence !== requestSequence || controller.signal.aborted) return;
    if (!response.ok) throw new Error(result.error || "The model could not rewrite this message. Try again.");
    if (typeof result.text !== "string" || !result.text.trim() || result.text.length > 6000 || typeof result.subject !== "string" || !result.subject.trim() || result.subject.length > 200) {
      throw new Error("The model returned an incomplete or oversized draft. Please try again.");
    }
    baseRewrite = result.text;
    currentSubject = result.subject.replace(/[\r\n]+/g, " ").trim();
    currentRaw = raw;
    currentSummary = `${PERSONA_LABELS[settings.persona]} · ${TONE_LABELS.formality[settings.formality - 1]} formality · ${TONE_LABELS.verbosity[settings.verbosity - 1]} length · ${TONE_LABELS.enthusiasm[settings.enthusiasm - 1]} energy. Generated by ${result.model || "AI"}. Review the highlighted changes for accuracy.`;
    renderDraft();
    showConnection({ ready: true, provider: result.provider, model: result.model });
    setStatus("Draft ready. Check the original meaning, requests, dates, and amounts before using it.");
  } catch (error) {
    if (sequence !== requestSequence) return;
    if (controller.signal.aborted) setStatus(timedOut ? "The rewrite took too long and was cancelled. Try a shorter message or check Ollama, then retry." : "Rewrite cancelled. Your message has not changed.", timedOut);
    else setStatus(error instanceof TypeError ? "Cannot reach the Node server. Check that node server.mjs is running, then retry." : error.message, true);
  } finally {
    clearTimeout(timeout);
    if (sequence === requestSequence) {
      pendingController = null;
      setBusy(false);
    }
  }
});

cancelButton.addEventListener("click", () => cancelPending("Rewrite cancelled. Your message has not changed."));
connectionRetry.addEventListener("click", checkConnection);

for (const button of formatButtons) {
  button.addEventListener("click", () => {
    cancelPending("Rewrite cancelled because the output format changed. Select Rewrite message when ready.");
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
checkConnection();
