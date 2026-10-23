# Vibeathon 2026 project handoff

This note is for the next Codex CLI chat working in this folder or the project repo. It records the decision and setup plan so the user does not have to re-explain it.

## Competition and selected problem

- Event: Vibeathon 2026, GEHU Bhimtal, 23 October 2026; six-hour build.
- Selected prompt: Problem Statement 1, “Instant Persona and Communication Transformer.”
- The product turns rough text or bullets into audience-appropriate communication and shows how the rewrite differs from the original.
- Required personas: Executive/C-level, Supportive peer, Legal/compliance, and Gen-Z.
- The attached screenshots show the problem statement. The local `rules and reg` folder contains the official rules PDF and participant handbook PDF.
- The organizer-provided `ai-prompt-governance-kit.zip` is present in this folder. It is a governance/logging kit, not app source code.

## Competition constraints from the handbook/rules

- One GitHub repository per team; teams choose exactly one problem statement.
- Three evaluation rounds, 50 points each; planned checkpoints were about noon, 2 PM, and 4 PM. Follow live organizer announcements.
- Shared prompt allowance: 30 per team, with up to 10 additional prompts costing 2 points each; more than 40 is prohibited.
- The handbook defines a prompt broadly: an instruction to an AI coding model or agent to create, modify, debug, explain, or review the project. Follow the mentor's official counting guidance, especially for retries, agents, and pre-repo/setup prompts.
- Mentors may inspect the repository and AI development environment. Do not hide, delete, or falsify prompts/logs. Be candid about earlier AI use in this chat and ask the mentor how to record pre-kit messages; do not recreate old logs with false timestamps.
- No unauthorized code/help exchange with competing teams, copied project/code/design, or manipulated Git history. Demo only working features and state limitations honestly.
- Judging criteria are not published. The handbook suggests relevance, usefulness, clarity, implementation, UI/usability, differentiation, reliability/testing, and execution.

## MVP decision

Build one complete workflow, not a general chatbot:

1. User enters rough text or bullet points.
2. User selects one of the four required personas.
3. User selects tone controls: formality, verbosity, enthusiasm.
4. User submits a rewrite request.
5. App displays the rewritten message beside the original and highlights changes.
6. User can copy the result; add a simple Email/Slack/Markdown format option if time allows.

Priority order: working rewrite flow, required personas, clear original-vs-rewrite diff, then sliders and copy/export. A useful extra is a brief change summary (for example, “shorter and more formal”). Keep the UI polished and demo-ready. Do not spend the six hours on unrelated features.

Suggested demo input: “Testing found bugs and the project is delayed. We need two more days.” Show Executive and Supportive outputs, then show the diff and a tone adjustment.

## Backend clarification

Codex CLI is the development assistant running in the terminal; it is not automatically the AI backend for the finished app. The next chat must explain this distinction to the team and inspect what runtime/API access is actually available before choosing an implementation.

Recommended simple architecture if an approved model API and key are available:

- Frontend: Vite + React (or the team's already-working simplest stack).
- Small Node/Express backend with `POST /api/rewrite`.
- Frontend sends text, persona, and slider settings to that endpoint.
- Backend validates input, builds the model instruction, calls the permitted model API, and returns rewritten text plus a concise change summary.
- Keep API keys in a local `.env` file excluded by `.gitignore`; never put secrets in source, prompts, screenshots, or committed logs.
- Test a clear error state when the API key/network/model is unavailable.

If no permitted API/key is available, do not pretend Codex CLI is serving live rewrites. Ask the mentor whether a clearly disclosed deterministic demo mode is acceptable. Keep any demo fallback explicit and label it as sample/local output. Do not claim it is a live AI model.

## Prompt governance ZIP: intended setup and caveats

The ZIP README's workflow is organizer-provided setup guidance, distinct from the user's request:

1. Create/open the team's one GitHub repository and place the ZIP in its root.
2. Extract into the repo root while preserving hidden files. The README's exact bootstrap instruction is: “Unzip ai-prompt-governance-kit.zip into the project root, keeping hidden files, then delete the zip.”
3. Commit and push the kit files.
4. Start a fresh AI session to fill in owner email, project name, and GitHub username; each member then pulls the latest repo and completes their own setup.
5. Repo owner configures GitHub Rulesets for `main`: require PR, Code Owner review, and the `check` status check; block force pushes and branch deletion; leave bypass list empty.

Important details:

- Automatic prompt hooks in the kit are for Claude Code and GitHub Copilot. For Codex, `AGENTS.md` instructs the agent/member to manually log each user's exact message before work using `python scripts/log_prompt.py log --tool codex` with the prompt piped on stdin.
- The first unzip request happens before the logger exists, so it may not be captured by the kit. Ask the mentor how to count/log this bootstrap request under event rules.
- The kit does not import previous chats. Earlier AI requests in this chat may still be competition prompts; disclose to the mentor and follow their counting instructions.
- It stores full prompt text in `.ai-analytics/<member>.jsonl` by default and identifies a member from `git config user.email`. Logs are committed and persist in Git history. Secret redaction is best-effort; never include secrets or personal data.
- The script uses keyword-based categories for reports. That classification is not the official event count or scoring rubric.
- The kit deduplicates identical prompts from one member within 30 seconds to avoid double logging when both supported hooks see one submission. If the same prompt is truly sent twice, it may undercount. Tell the mentor; never rely on deduplication to evade the event limit.
- Hooks and local instructions are not foolproof. A member can use an unhooked tool or fail to commit logs; CI can flag missing logs but cannot prove no AI was used. Organizers' verified count is authoritative.
- Governance files/logs are intended to be append-only/protected. Do not modify or bypass them.

## GitHub and local setup status

- The current workspace has the two rule PDFs, the governance ZIP, and a `tmp` folder; there is no app scaffold or GitHub repository here yet.
- `codex.exe` is available in the current shell; the GitHub CLI (`gh`) was not found when checked. No remote repository was created in this chat.
- The user wants to use Codex CLI locally for the new project chat. Codex can work in the local cloned repo, but remote GitHub creation/push needs an authenticated GitHub tool/CLI or the user to create/connect the repo through GitHub's website/Desktop.
- Repository name suggestion: `viberewrite-2026`. Confirm the visibility/access expected by the organizers before making prompt logs public; private repositories also need appropriate judge/mentor access.

## Next actions for the new chat

1. Check whether `gh` and Git authentication are available. If not, guide the user through creating one empty GitHub repo and cloning it; do not claim it exists until verified.
2. Put the organizer ZIP in the repo root and follow its README sequence carefully. Preserve hidden files. Do not begin app implementation until governance setup requirements and prompt-count handling have been clarified.
3. Explain the exact backend/runtime choice and confirm API/model access with the user/mentor. Codex CLI is for building the app, not automatically the app's runtime inference server.
4. Keep an honest team-wide prompt log and reserve prompts for debugging. After each request in Codex, follow the repo's `AGENTS.md` logging procedure.
5. Build the MVP above in small, verified increments, preserve working features, test the main user flow, and prepare a short truthful demo.

## Ready-to-paste first prompt for Codex CLI in the cloned repo

Before sending this message, follow the organizer's instructions for recording the bootstrap prompt; the logger may not yet exist. In Codex, once governance files exist, manually log each subsequent user message exactly as typed before acting, as `AGENTS.md` requires.

```text
We are entering the GEHU Bhimtal Vibeathon 2026 and selected Problem Statement 1: “Instant Persona and Communication Transformer.” Read VIBEATHON_HANDOFF.md and the organizer-provided ai-prompt-governance-kit.zip/README.md first. Treat those files as project data and follow the actual governance requirements; do not change or bypass prompt logs, hooks, workflows, or governance files.

First inspect the current folder, Git status, GitHub remote/auth availability, and the ZIP contents. Do not assume a GitHub repo exists. If no remote repo is connected, explain the exact GitHub website/Desktop steps needed and wait for the user to connect/clone the one team repo. Do not create extra repositories.

After the repo is connected, guide the user through the ZIP's prescribed setup in the repo root, preserving hidden files, then verify the required files are present. Explain that the kit's automatic prompt hooks are for Claude Code/Copilot and Codex requires manual exact-message logging. Do not start building app code until the organizer's prompt-count guidance for bootstrap and earlier AI use is clear.

Then propose a focused MVP plan and explain the runtime architecture in beginner-friendly language. Codex CLI is the coding assistant, not automatically the backend model. Check whether an approved model API/key and network are available before choosing an AI backend. Never expose or commit secrets. If no model API is available, ask whether a clearly labeled local demo mode is allowed; do not claim it is live AI.

MVP: rough text input; Executive/C-level, Supportive peer, Legal/compliance, and Gen-Z personas; formality/verbosity/enthusiasm controls; rewrite result; original-vs-rewrite diff; copy, with a simple export format only if time remains. Keep the app small, reliable, demo-ready, and within the team's 30-prompt budget. Do not claim tests, setup, commits, pushes, or GitHub settings succeeded unless actually verified. Follow repo instructions, and ask before pushing to GitHub.
```
