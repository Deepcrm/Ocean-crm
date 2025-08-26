
# Ocean CRM (Next.js + Tailwind)

Teal/blue CRM dashboard with **AI assistant (mock)**, **Voice Notes (record/stop/play/download)**, KPI cards, Kanban, and a property map stub.

## Run locally
```bash
npm install
npm run dev
# open http://localhost:3000
```

## Use on CodeSandbox / StackBlitz
1) Create a new Next.js (App Router) sandbox.
2) Upload this ZIP or drag the whole folder.
3) Wait for packages to install – preview will start automatically.

### Notes
- Voice Notes need microphone permission (works in Chrome/Edge).
- AI responses are mocked on the client; wire to your API later.


## LocalStorage Edition
This build saves leads, tasks and voice notes in browser localStorage (no external DB). Voice audio is stored as base64 data URLs — suitable for demo and small recordings.
