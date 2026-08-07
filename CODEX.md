# Codex Agent Instructions

> **Source of Truth**: Read [AGENTS.md](AGENTS.md) for canonical project instructions, architecture guidelines, rules, and workflows.

## Codex Quick Reference

- All canonical rules, boundaries, and project paths are defined in [AGENTS.md](AGENTS.md).
- **Build Commands**:
  - `node scripts/build_all_data.mjs`
  - `node scripts/build_blacklist_data.mjs`
- **Key Constraints**: Vanilla JS, Static-first, XSS-safe (`escapeHtml`), bilingual i18n (`ru` / `en`).
