# Run VibeRewrite

This is a local, rule based demo. It does not connect to a live AI model or use an API key. Confirm with the mentor that a labeled demo is acceptable for judging.

From this repository in PowerShell:

```powershell
Set-Location .\app
python -m http.server 5173 --bind 127.0.0.1
```

Open <http://127.0.0.1:5173/> in a browser. Press `Ctrl+C` in PowerShell to stop the server.

The browser handles text input, four personas, tone controls, local rewrite rules, difference highlighting, Plain/Email/Slack/Markdown formatting, copying, and downloading. The format options prepare text; they do not send an email or Slack message. There is no backend in this demo. A future live AI version would need a small backend to call an organizer-approved model API and keep its key in a local `.env` file, which this repository already ignores.
