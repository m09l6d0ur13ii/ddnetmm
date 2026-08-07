# Claude Code Instructions

> **Source of Truth**: Read [AGENTS.md](AGENTS.md) for canonical project instructions, architecture guidelines, rules, and workflows.

## Claude Code Quick Reference

- Primary instructions, data flow, and code boundaries are defined in [AGENTS.md](AGENTS.md).
- **Build Commands**:
  - `node scripts/build_all_data.mjs`
  - `node scripts/build_blacklist_data.mjs`
- **Architecture**: Vanilla JS (ES6+), Tailwind CSS, static-first (GitHub Pages). No React/Vue/Vite.
- **i18n**: All UI strings must use `getDict()` from `js/i18n.js` (`ru` / `en`).
