# Project Backlog - DDNet Map Mastery (ddnetmm)

## Queue (To Do)
- [x] **Task 1**: Add a native Node.js test suite (`node:test`) for `js/api.js` mathematical functions (Base PTS, Skill PTS).
- [x] **Task 2**: Add a native Node.js test suite for the map data parsing logic (`scripts/build_all_data.mjs`).
- [x] **Task 3**: Implement JSDoc typings for all core modules (`app.js`, `api.js`, `page-*.js`) to improve maintainability.
- [x] **Task 4**: Extract the map search autocomplete logic from `app.js` into a separate reusable UI component (`js/components/autocomplete.js`).
- [x] **Task 5**: Refactor `page-index.js` to split leaderboard rendering logic and event listeners into distinct functions.
- [x] **Task 6**: Add a visual progress chart (Points history) to the player profile page using a vanilla JS compatible chart (e.g., SVG based or lightweight chart).
- [x] **Task 7**: Implement side-by-side player comparison stats radar chart (accuracy, speed, completion rate).
- [x] **Task 8**: Add extended filters to map rankings (filter by map type, points threshold, date).
- [ ] **Task 9**: Implement a "Global Dashboard" on the index page showing recent world records and top movers.
- [ ] **Task 10**: Add tooltips for map strictness (s) explaining how it was calculated.
- [ ] **Task 11**: Support deep linking (URL parameters) for specific map filters and player comparison selection.
- [ ] **Task 12**: Add a "Tee Skin Customization" preview in the player profile, allowing users to modify skin colors dynamically before downloading.
- [ ] **Task 13**: Optimize `tee-skin-renderer.umd.js` integration: Implement RequestAnimationFrame throttling for active canvas animations.
- [ ] **Task 14**: Cache rendered static Tee skins into base64 to avoid re-rendering the same skin multiple times on the leaderboard.
- [ ] **Task 15**: Minify and bundle JS/CSS files for production deployment using a simple node script (without Webpack/Vite as per rules).
- [ ] **Task 16**: Add GitHub Actions CI workflow to automatically run tests and rebuild data on push.
- [ ] **Task 17**: Implement dark mode toggle with local storage persistence.
- [ ] **Task 18**: Add an 'Achievements' or 'Milestones' system (e.g. First 1000 PTS, 100 Maps Finished).
- [ ] **Task 19**: Improve mobile responsiveness for the map leaderboard tables (horizontal scrolling/sticky headers).
- [ ] **Task 20**: Implement a "Player Title" feature based on mastery level (e.g. Novice, Master, Legend) to display next to player names.
- [ ] **Task 21**: Optimize API data fetching by pre-fetching critical map endpoints in the background (Service Worker or hidden prefetch).
- [ ] **Task 22**: Replace all `innerHTML` table row rendering with `createElement` in leaderboard generation to improve XSS safety and performance.
- [ ] **Task 23**: Add a keyboard shortcut (e.g., `/` or `Ctrl+K`) to focus the global map search input.
- [ ] **Task 24**: Create a "Top Mappers" leaderboard showing the mappers whose maps generate the most PTS for players.
- [ ] **Task 25**: Implement lazy loading for player avatars and static assets on the global leaderboard to reduce initial load time.
- [ ] **Task 26**: Add an Easter Egg interactive animation on the home page when a specific sequence of keys is pressed.
- [ ] **Task 27**: Add "Last updated" timestamps to player profile and map pages to indicate data freshness.
- [ ] **Task 28**: Create a lightweight UI tooltip component to replace native HTML `title` attributes for a more premium feel.
- [ ] **Task 29**: Introduce a "Heatmap" visualization on the map page to show the concentration of finish times using HTML Canvas.
- [ ] **Task 30**: Add a "News & Updates" banner system configurable via a simple JSON or Markdown file.
- [ ] **Task 31**: Optimize `build_all_data.mjs` using `worker_threads` to process map enrichments in parallel for faster build times.
- [ ] **Task 32**: Implement a global map search modal (Cmd+K) accessible from anywhere using a modern floating UI design.

## Completed
*(None yet)*
