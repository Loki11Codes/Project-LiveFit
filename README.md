# LiveFit 🏋️

A personal AI-powered fitness tracker that lives in a single HTML file. Log food, workouts, sleep, and body measurements by chatting naturally — no app install, no backend, no accounts.

Built by **Lokeshwaran V R**, maintained with Claude.

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 **AI Chat Logging** | Type naturally — *"had 3 eggs and 150ml milk"* — and the AI parses and logs everything |
| 📷 **Image Analysis** | Attach nutrition labels or food photos; AI extracts all macros |
| 🍽️ **Food Log** | Protein, calories, carbs, fats, fiber tracked per meal |
| 💪 **Workout Log** | Volume, PRs, sets, duration, exercise focus |
| 😴 **Sleep Log** | Hours, bed time, wake time |
| 📊 **History Tab** | Per-day summary table — closes via "Close Day" button |
| 📏 **Body Measurements** | Weight, waist, chest, arms, thighs, hips, calves, neck, body fat % |
| 👤 **Profile** | Custom protein targets per day type (Training / Rest / Lite), workout split, sleep target |
| 🌙 **Dark Mode** | Full light/dark theme toggle |
| 💾 **Persistence** | All data survives page reload via artifact storage |

---

## 🚀 Getting Started

This project has evolved from a single-file prototype into a full **Next.js + Prisma** application.

### Quick Start
Please see [SETUP.md](./SETUP.md) for detailed, step-by-step developer setup instructions including:
1. Environment configuration (`.env`).
2. Local database initialization (`npx prisma migrate dev`).
3. Running the local dev server.

---

---

## 🗂️ File Structure

Everything lives in `LiveFit.html`. The file is organized into clearly labeled sections:

```
LiveFit.html
├── <style>
│   ├── CSS variables (light/dark theme)
│   ├── Nav, chat, sidebar styles
│   ├── Log, history, body, profile styles
│   └── Dark mode overrides
│
├── <body>
│   ├── <nav> — Logo, tab switcher, theme toggle
│   ├── #panel-chat — AI chat + sidebar (protein, calories, stats, Close Day)
│   ├── #panel-log — Food log, workout, sleep
│   ├── #panel-history — Daily history table
│   ├── #panel-body — Body measurements
│   └── #panel-profile — Personal info, goals, workout split
│
└── <script>
    ├── State & constants (S, TARGETS, KCAL_TARGETS, HIST)
    ├── Storage: persist() / hydrate()          ← loki-v5-state + loki-v5-hist
    ├── Theme: toggleTheme() / applyTheme()
    ├── Navigation: switchTab() / setType()
    ├── UI: updateUI()
    ├── Image handling: handleFileSelect() etc.
    ├── Chat: sendMessage() / appendMsg() / showTyping()
    ├── AI parsing: parseState()               ← JSON-first, regex fallback
    ├── Day management: closeDay()
    ├── Render: renderLog() / renderHistory() / renderBody()
    └── Profile: saveProfile() / renderProfile()
    └── init()
```

---

## 🧠 How AI Parsing Works

When you send a message, the app:

1. Sends your message + full day context to the Claude API
2. The AI responds naturally AND appends a hidden structured JSON block:
   ```
   |||DATA
   {"food":{"protein":21,"kcal":280,...},"sleep":{"hours":7.5,"bed":"11pm","wake":"6:30am"},...}
   |||
   ```
3. `parseState()` extracts the JSON block first (reliable), strips it from the displayed reply, and updates the app state
4. If the JSON block is missing, it falls back to regex parsing

---

## 💾 Data Storage

All data is stored via `window.storage` (Claude artifact storage):

| Key | Contents |
|---|---|
| `loki-v5-state` | Full session: food log, workout, sleep, protein, calories, day, theme, profile, measurements |
| `loki-v5-hist` | History array — one entry per closed day |

> ⚠️ Storage is tied to the artifact environment. Data does not sync across devices or browsers.

---

## 🤝 Contributing

This project is maintained by Lokeshwaran and developed in collaboration with Claude.

### Workflow
```
main branch → your changes via PR → review → merge
```

### To contribute:
1. Fork or clone the repo
2. Make your changes to `LiveFit.html`
3. Open a PR with a clear description of what you changed and why
4. Tag sections you changed (e.g. `[JS: parseState]`, `[CSS: dark mode]`, `[HTML: Log tab]`)

### Ground rules
- Keep it single-file for now — no separate JS/CSS files yet
- Test your changes by reloading the page and verifying state persists
- Don't commit personal data (your food logs, measurements, etc.)
- Keep the section comments intact so we can navigate the file cleanly

### Areas open for contribution
- [ ] Water intake tracker (target exists in profile, logging not yet wired)
- [ ] Weight trend chart in Body tab
- [ ] Weekly summary view
- [ ] Export to CSV
- [ ] Streak counter
- [ ] Better workout exercise breakdown logging

---

## 🐛 Known Limitations

- **Chat history is not persisted** — the conversation resets on reload (daily logs are saved, but the chat transcript isn't)
- **Single-user** — one profile per storage instance; no multi-account support yet
- **No offline AI** — chat requires network access to the Claude API
- **Storage is local to the artifact** — no cloud sync across devices

---

## 📋 Day Types & Protein Targets

| Day Type | Protein Target | Calorie Target |
|---|---|---|
| 🛌 Rest | 75–85g | ~2,150 kcal |
| 💪 Training | 95–105g | ~2,450 kcal |
| 🌿 Lite | 50–65g | ~1,800 kcal |

Targets are customizable via the Profile tab.

---

## 📅 Changelog

### v5 (current)
- Full session state persists across reloads (`loki-v5-state`)
- History now persists and populates via "Close Day" button
- `parseState()` upgraded: JSON-first parsing, regex fallback
- Sleep bed time and wake time now parsed from chat
- Log and Body tabs now populate correctly after reload
- History tab label shows dynamic day count
- Day-type button state restored on reload

### v4 (original)
- Only theme, measurements, and profile were persisted
- History was a static hardcoded array
- Regex-only nutrient parsing

---

## 📄 License

Personal project — feel free to fork and adapt for your own use.
