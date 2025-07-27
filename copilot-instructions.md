# 🧠 CapEdify Copilot Instructions (Phase 3)

You are assisting with **CapEdify**, a video captioning tool that:

- Transcribes videos and generates After Effects JSX captions
- Supports CLI tools, multiple export formats, and styled themes
- Now entering Phase 3: authentication, CLI upgrades, deployment prep

## ✅ What's Done
- All API endpoints return JSON (no more HTML parse errors)
- JSX export and CLI tools fully work
- Frontend has stable error handling with toast notifications
- Transcription and export flows complete
- Server middleware properly handles 404s and errors

## 🔜 New Priorities (Phase 3)
- Scaffold authentication endpoints (`/api/auth/login`, `/api/auth/register`)
- Add token-based auth to CLI (placeholder support for now)
- Scaffold deployment configs (Railway, Vercel, Dockerfile, etc.)
- Add project/user tracking logic to backend
- Polish frontend UX with drag/drop, progress bars, and toast states
- Maintain clean commit history and avoid breaking stable API

---

## 🛡️ Rules

### DO:
- Use only real API endpoints
- Add `try/catch` for async calls
- Show user feedback via `react-hot-toast`
- Maintain stable working JSX generation scripts
- Scaffold CLI using `commander`, `chalk`, or similar tools
- Commit feature changes into `copilot-suggestions/` or `copilot-cli/` if unsure
- NEVER break existing transcription or JSX export logic
- ALWAYS return JSON from API endpoints
- Preserve CLI structure (`cli.js`) and commander commands

### DO NOT:
- Use mock code or test-server.js unless asked
- Break or modify JSX generation without explicit instructions
- Guess path variables or hardcode config
- Remove working code without fallback
- Return HTML from API endpoints (causes JSON parse errors)

---

## 🧱 Stack & Structure

- **Frontend**: React (Vite) + Tailwind + TypeScript
- **Backend**: Node.js (Express) with JSON-only middleware
- **Transcription**: Groq Whisper API
- **Storage**: Supabase for video files and transcription data
- **Output**: JSX for After Effects via ExtendScript
- **CLI**: Commander.js with chalk styling
- **UX**: Theme system (dark/light/neon/mystic)

## 🚀 Phase 3 Roadmap

### Authentication System
- `/api/auth/register` - User registration
- `/api/auth/login` - User login with JWT tokens
- `/api/auth/verify` - Token validation
- CLI login support: `capedify login` and `capedify logout`

### Deployment Preparation
- **Docker**: Containerization for backend and frontend
- **Railway**: One-click deployment config
- **Vercel**: Frontend deployment setup
- **Environment**: Production environment variables

### User/Project Management
- User-scoped transcriptions and exports
- Project organization and history
- Usage tracking and quotas (placeholder)
