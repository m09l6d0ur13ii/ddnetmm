# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Added extended map filters (points threshold, date range) to the player profile page.
- Implemented a side-by-side Stats Radar Chart using vanilla SVG in the PvP page.
- Added a vanilla JS SVG visual progress chart (Points history) to the player profile page.
- Refactored `page-index.js` to modularize event listeners, localization, and search logic for better maintainability.
- Extracted map and player search autocomplete logic from `app.js` into `js/components/autocomplete.js` to improve modularity.
- Added JSDoc typings to core modules (`api.js`, `app.js`, `page-index.js`) to improve code maintainability.
- Added a native Node.js test suite for `scripts/build_all_data.mjs` parsing logic (`test/build_all_data.test.mjs`).
- Added a native Node.js test suite for `js/api.js` mathematical functions (`test/api.test.mjs`).
- Initialized backlog and changelog.
