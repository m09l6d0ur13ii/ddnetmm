# AI Agents Instructions — DDNet Map Mastery (AGENTS.md)

This document is the **Canonical Single Source of Truth** for all AI coding agents (Gemini, Claude, Codex, Copilot, Cursor, Aider, Windsurf, etc.) working on the **DDNet Map Mastery (ddnetmm)** codebase.

---

## 1. Project Overview & Architecture

DDNet Map Mastery is an alternative ranking and points (PTS) system for [DDNet](https://ddnet.org) (DDRace Network) players. It evaluates player performance based on completion speed and skill relative to map World Records.

- **Stack**: Vanilla JS (ES6+), HTML5, Tailwind CSS (via standalone `js/tailwindcss.js`), Canvas-based `tee-skin-renderer.umd.js` for Tee avatars, Node.js ES modules (`.mjs`) for build pipelines.
- **Hosting**: GitHub Pages (Static-first Jamstack, no backend server).
- **Data Flow**: Pre-rendered static JSON/JS bundles attached to `window.*` globals with live client-side fallback/refresh via DDStats REST API (`https://ddstats.tw`).

---

## 2. Context Lifecycle & File Routing Rules

To prevent context pollution and maintain high compliance, files are segregated by their **rate of change (lifecycle)**:

| Layer / Directory | Update Frequency | Purpose & Rules |
| :--- | :--- | :--- |
| **Root (Canon)** | Quarterly / Rare | Core instruction files (`AGENTS.md`), main entry point (`index.html`), `README.md`. **Forbidden**: Do not create temporary draft files in root. |
| **Data Layer (`data/`)** | Weekly / Automated | Pre-rendered datasets (`data/rankings/`, `data/players/`). Generated via `scripts/`. Do not edit pre-rendered JSON/JS manually. |
| **Build Pipeline (`scripts/`)** | Rare / Maintenance | Node.js automation scripts (`build_all_data.mjs`). Changes require explicit verification. |
| **App Code (`js/`, `css/`, pages)** | Active Development | UI logic, API client, page controllers. Keep modules decoupled and vanilla. |
| **Scratch (`scratch/`)** | Volatile / Ephemeral | One-off debugging scripts, raw API dumps, temporary tests. Never committed to production. |

---

## 3. Canonical Paths (Repository Map)

| Path | Purpose / Description |
| :--- | :--- |
| `index.html`, `js/page-index.js` | Main leaderboard & map overview page |
| `player/index.html`, `js/page-player.js` | Player profile, skin rendering, finish details |
| `map/index.html`, `js/page-map.js` | Map leaderboard, WR stats, strictness coefficient ($s$) |
| `compare/index.html`, `js/page-compare.js` | Side-by-side player comparison page |
| `pvp/index.html`, `js/page-pvp.js` | Head-to-head matchup mode between 2 players |
| `about/index.html` | Formula breakdown and project documentation page |
| `privacy/index.html` | Privacy policy page |
| `js/api.js` | Centralized API client (`window.api`) for DDStats live fetch & static fallbacks |
| `js/app.js` | Global UI utilities, navbar header, map search, i18n init |
| `js/i18n.js` | Localization dictionaries (`en` / `ru`) |
| `scripts/` | Data processing pipeline (`build_all_data.mjs`, `build_blacklist_data.mjs`) |
| `data/` | Pre-rendered datasets, player caches (`data/players/`), and rankings (`data/rankings/`) |
| `blacklist.txt`, `custom_map_records.txt`, `map_min_times.txt` | Manual configuration & filtering rules |

---

## 4. Source of Truth for Data

1. **Player & Map Rankings**: Pre-rendered in `data/leaderboard.js` and per-map `data/rankings/{safeMapName}.js`. Live updates fetched via `https://ddstats.tw/player/json` and `https://ddstats.tw/map/json`.
2. **Blacklist**: Defined in `blacklist.txt` and pre-built into `data/blacklist.js` (`window.isBlacklisted(name)`).
3. **Custom Records & Min Times**: `custom_map_records.txt` and `map_min_times.txt`.
4. **Localization**: `dictionaries` object in `js/i18n.js`.

---

## 5. Core Boundaries & Rules for AI Agents

| Autonomous (OK) | Requires Verification | Forbidden / Prohibited |
| :--- | :--- | :--- |
| Modifying UI layouts, Tailwind CSS styling | Changing PTS formula or strictness limits | Introducing React, Vue, Svelte, or Webpack/Vite bundlers |
| Adding new string translations in `js/i18n.js` | Modifying `scripts/build_all_data.mjs` | Creating temporary draft files in root (use `scratch/`) |
| Fixing bug reports in `js/page-*.js` or `js/api.js` | Modifying `blacklist.txt` or record filters | Bypassing `escapeHtml()` when rendering user text |

---

## 6. Key Commands & Workflow

```bash
# Rebuild all static datasets (maps, rankings, leaderboards, player caches)
node scripts/build_all_data.mjs

# Rebuild blacklist datasets
node scripts/build_blacklist_data.mjs

# Fetch map records
node scripts/fetch_records.mjs
```

---

## 7. AI Agent Persona & Skill Guidelines

When generating UI, designing layouts, or solving issues, adopt the dual expert mindset defined in [.agents/skills/ddnet-domain-expert/SKILL.md](.agents/skills/ddnet-domain-expert/SKILL.md):

1. **Senior Frontend Architect & UI Designer**:
   - Deliver modern, high-contrast Dark Mode UI inspired by state-of-the-art standards (smooth transitions, glassmorphism, responsive grid layouts).
   - Ensure maximum UX responsiveness without relying on heavy frameworks.
2. **Veteran DDNet & Teeworlds Player**:
   - Design features through the eyes of an active DDNet player: focus on millisecond-level time precision, WR gap visibility, skin customization, team vs solo ranks, and competitive head-to-head match details.

