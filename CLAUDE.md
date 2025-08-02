# 🧠 Claude Project Memory – TRUECAPTIONTOOL

## 🧭 Project Goal
This project turns audio/video into editable captions for After Effects using Whisper and ffmpeg.  
Captions are output as JSX with precise timing and optional style presets.

- Output = 0.001s accuracy + human-readable layer naming
- Claude should assist with:
  - ✅ SRT ➜ JSX conversion
  - ✅ AE text layer scripting
  - ✅ Timestamp alignment
  - ✅ Batch export + validation
  - ✅ No commentary unless asked

---

## 🧼 Startup Routine (Manual Reminder)

Claude will not auto-check or auto-launch servers.  
Please manually ensure servers are running before beginning any task.

---

### 🚀 To launch servers:
From the project root, run:
```powershell
.\launch.bat
```

Or launch servers manually via:
- `npm run dev` from `CapEdify/client`
- `npm start` from `CapEdify/server`

---

### 🧹 To kill old server ports (optional):
```powershell
for ($p in 5173, 4000) {
  try {
    Stop-Process -Id (Get-NetTCPConnection -LocalPort $p).OwningProcess -Force
    Write-Host "✅ Killed port $p"
  } catch {
    Write-Host "⚠️ Port $p was already free"
  }
}
```

---

## 🚫 Devtools / Reactor Note
❌ `react-devtools` was removed from `npm run dev:debug`  
✅ Use `npm run devtools` manually if needed

---

## ✅ Last Confirmed Status
- Frontend confirmed working on port 5173 ✅  
- Backend not running = batch failed ❌  
- Fixed by adding `launch.ps1` and port cleaner

---

## 🔒 Agent Rules

- Always respond with structured JSON:
```json
{ "status": "...", "action": "...", "reason": "...", "next_step": "..." }
```

- Max 3 consecutive actions without user input. After 3 steps, pause and wait.
- Never run destructive or external commands without explicit permission.
- Assume servers are already running unless explicitly told to check.
- Only operate inside the current project directory.
- When unsure, ask for user input.
