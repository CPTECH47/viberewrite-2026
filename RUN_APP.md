# Run VibeRewrite with local AI

The app now uses a Node.js backend and Ollama Qwen3 4B. It no longer uses fixed phrase-replacement demo rules. The browser manages editing, comparison, highlighting, formatting, copy and download. Node validates requests, sends persona/tone instructions to the model and checks the response. Ollama performs inference on this computer. Codex is the development assistant, not the runtime AI.

## Start on Windows

1. Install/start Ollama and finish the model download: `ollama pull qwen3:4b`. This is a multi-gigabyte download and needs sufficient disk space and memory. Keep Ollama running; if its service is not running, use `ollama serve` in a separate terminal.
2. Stop the old Python static server with Ctrl+C if it occupies port 5173. Open PowerShell in this repository (not the app subfolder).
3. With Node.js 22 or newer, run:

```powershell
node --env-file-if-exists=.env server.mjs
```

No npm install is needed; the backend uses built-in Node modules. `node server.mjs` also works with the default Ollama configuration. npm is unavailable in the current shell, so the direct Node command is preferred.

Open http://127.0.0.1:5173/. Select Check connection. The default model is `qwen3:4b` at `http://127.0.0.1:11434`. The first rewrite can be slow while weights load. Ctrl+C stops Node.

## Share a temporary laptop-powered demo

The public demo uses a Cloudflare Quick Tunnel to this Node app. Ollama stays on `127.0.0.1:11434`; the tunnel forwards only the app on port 5173. Anyone with the demo URL can submit rewrites, subject to the existing single-request concurrency and 12-per-minute limit. Messages travel through Cloudflare to the app host. Keep this laptop awake, connected to the internet, with Ollama, Node and the tunnel running. This is a temporary demo, not permanent hosting; restarting the tunnel changes the URL.

To recreate it, use the official `cloudflared` executable in a separate terminal:

```powershell
cloudflared tunnel --url http://127.0.0.1:5173 --http-host-header 127.0.0.1:5173 --no-autoupdate
```

Copy its HTTPS URL, stop the existing Node instance, then start Node in another terminal:

```powershell
$env:PUBLIC_ORIGIN = 'https://YOUR-GENERATED-NAME.trycloudflare.com'
node --env-file-if-exists=.env server.mjs
```

Only that exact HTTPS origin is added to the existing local-origin policy. Do not expose Ollama's port directly. Ctrl+C in the tunnel terminal disables the public link. The temporary helper executable and runtime logs are outside the repository. No tunnel credentials or model weights are committed.

## Configuration and optional OpenAI

Local defaults require no key. Optional local `.env` file:

```dotenv
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen3:4b
OLLAMA_URL=http://127.0.0.1:11434
PORT=5173
```

For a later organizer-approved OpenAI provider, set `AI_PROVIDER=openai`, `OPENAI_MODEL` to an available supported model and `OPENAI_API_KEY` to your private key in the server's `.env`. Restart Node. Never paste a real key into chat, frontend code, screenshots or Git. Existing ignore rules ignore `.env`; confirm with `git check-ignore .env`. OpenAI sends text to the cloud and can incur charges. Ollama remains local and requires no paid API key.

## Behavior and limits

- Four personas and all three 1-5 sliders are included in the model instructions.
- Input: nonempty words/numbers, maximum 1,200 characters. Output and HTTP requests are size limited; rewrites time out at 120 seconds. Concurrency and rate limits protect the local service.
- Changing input, persona, tone or output format cancels a pending rewrite. A request sequence guard prevents stale results even if cancellation arrives late.
- Email, Slack and Markdown use the generated relevant subject. These formats do not send messages. Copy/download include the selected format.
- Model instructions preserve language, speaker, requests, dates, amounts, uncertainty and facts. Validation rejects changed numeric tokens and certain added severity/request reversals. These checks are partial safeguards, not a guarantee of factual equivalence.
- Always review the comparison before use. A 4B model can mistranslate mixed-language text, miss context, over-edit or under-edit. It may return invalid JSON or be slow on CPU hardware. Errors are shown rather than replaced with a rule-based demo.

## Verification status at handoff

`node --test app-tests/server.test.mjs`: 7 tests passed. Frontend VM checks passed for request payload, cancellation, stale response protection, generated email subject, server errors and empty input. JavaScript syntax passed. These checks do not establish model rewriting quality.

Ollama Qwen3 4B is downloaded and verified. Twelve real-model requests were run in two sets of six. The first set copied five bodies verbatim and produced some misleading rehearsal-cancellation subjects; its evidence is preserved in `docs/local-model-results-first-pass.json`. After prompt/safeguard changes, the second set returned five accepted drafts and rejected one mixed-language draft for changing a currency/date reference. Two accepted bodies were still verbatim. Exact latest evidence is in `docs/local-model-results.json`. The ordinary-bugs draft changed "tomorrow" to "by tomorrow", and the supportive rehearsal draft weakened "active" to "registration status". These outputs were recorded before final safeguards were tightened. The final backend now rejects verbatim copies, newly added "by tomorrow", removed explicit "active", and unsupported cancellation in subjects. The seven backend tests were rerun and passed after those changes. The rejected cases have not been rerun through the model after final tightening, so a successful replacement draft is not yet established. HTTP 200 is not a full semantic acceptance pass. Warm requests in this second set took about 0.9-4.5 seconds on this machine. All four personas were exercised, but slider influence is not proven independently for each slider. Try: "Please send the invoice by Friday for INR 4,500"; "Kal 3 pm tak report bhej dena, budget Rs 2,500 hai"; and an unfamiliar message of your own. Confirm the recipient still sends the invoice and all figures and deadlines survive. Compare personas and slider extremes.

## Files and prompt accounting

Final browser check after guard tightening succeeded with this unfamiliar input: "please send invoice for INR 4,500 by Friday. don't add delivery fee. i need it for records." Qwen returned: "Could you please send the invoice for INR 4,500 by Friday without including the delivery fee? I need it for records." The generated subject was "Invoice for INR 4,500 by Friday (no delivery fee)". The browser displayed highlighted changes, reported successful copying, and downloaded `viberewrite-email.txt`; its file contents were read and matched the displayed email. This is the thirteenth runtime test, bringing the provisional conservative count to 29. No further model calls were made. The PDF records the preceding documentation checkpoint; this paragraph supplies the final browser outcome.

New local AI guide: `docs/VibeRewrite_Local_AI_Guide.pdf`. The older team guide describes the earlier rule-based version and is retained as history.

At this checkpoint: 8 kit log entries; 9 known user messages; provisional conservative ceiling of 29 requests: 9 known user messages plus 7 agent instructions and 13 runtime model calls including the final browser check. At the documentation checkpoint, 12 runtime tests are recorded; the browser result will be reported separately. This count is not organizer-verified. The organizer must settle official counting and treatment of runtime model calls. Historical logs and governance files are intact. This change is local and uncommitted; no push or deployment was performed.

Later publication request: the user explicitly authorized pushing and selected a temporary laptop-powered demo. There are now 11 kit log entries and 12 known user messages. Including 7 agent instructions and 13 runtime calls gives a conservative provisional total of 32; this is not the organizer-verified coding-prompt count. No additional model calls were made for publication. The earlier local-only statement and PDF reflect their earlier checkpoints. Main-branch review protections still apply; publication does not bypass them.
