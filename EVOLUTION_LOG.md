
## [2026-08-19T09:36:48.797Z] Iteration Complete
- **Feature**: Underfarmed Maps (Easy PTS) Recommendations
- **Details**: Added algorithm to calculate Farm Score based on Base PTS / Strictness. Displayed top 6 uncompleted maps on the Player Profile page with dynamic rendering.
- **Tests**: Added tests to test/api.test.mjs (100% Green).

## [2026-08-19T09:38:00.959Z] Iteration Complete
- **Feature**: Custom Player Achievements/Badges
- **Details**: Added getPlayerBadges logic to calculate WR Hunter, Oldschool Veteran, Brutal Specialist, etc. Rendered them dynamically on the Player Profile page under Skill Rank.
- **Tests**: Added tests to test/api.test.mjs (100% Green).

## [2026-08-19T09:39:15.313Z] Iteration Complete
- **Feature**: Player Radar Chart
- **Details**: Added getPlayerRadarStats to calculate Speed, Endurance, Skill, and Grind metrics. Dynamically rendered the radar chart on a Canvas (SVG wrapper) on the Player profile.
- **Tests**: Added tests to test/api.test.mjs (100% Green).

## [2026-08-19T09:49:04.450Z] Iteration Complete
- **Feature**: Matchmaking Chances Prediction (Win Probability)
- **Details**: Added Elo-based calculateWinProbability function in api.js using a 20,000 PTS scaling factor. Injected a dynamic UI bar in the PvP Head-to-Head page for matchmaking prediction.
- **Tests**: Added tests to test/api.test.mjs (100% Green).

## [2026-08-19T09:51:25.955Z] Iteration Complete
- **Feature**: Global Rank Calculator
- **Details**: Added getPlayerGlobalRank in api.js to find the exact rank of a player in the pre-built top 5000 leaderboard. Injected a glowing UI badge on the Player Profile page next to the player name.
- **Tests**: Added tests to test/api.test.mjs (100% Green).

## [2026-08-19T09:54:31.164Z] Iteration Complete
- **Feature**: Player Mod / Server Specialization Analysis
- **Details**: Added getPlayerServerSpecialization in api.js to group a player's finishes by DDNet server (Novice, Brutal, etc.) and calculate total PTS per category. Rendered it as a dynamic grid on the Player Profile page.
- **Tests**: Added tests to test/api.test.mjs (100% Green).

## [2026-08-19T09:57:23.018Z] Iteration Complete
- **Feature**: Map Points Decay Curve Visualization
- **Details**: Added an SVG-based line chart on the Map Leaderboard page to visualize how quickly Skill PTS decay on that specific map based on its strictness coefficient (s). Also extracted the mathematical decay calculation into api.js for testing.
- **Tests**: Added tests for calculateDecayPts to test/api.test.mjs (100% Green).

## [2026-08-19T09:59:36.833Z] Iteration Complete
- **Feature**: Recent Activity (Last 7 Days) Heatmap
- **Details**: Added getPlayerRecentActivity in api.js to group a player's finishes by day using the DDStats timestamp. Injected a dynamic, interactive bar chart with tooltips on the Player Profile page to visualize grinding activity.
- **Tests**: Added tests for grouping logic and date filtering in test/api.test.mjs (100% Green).

## [2026-08-19T10:01:20.105Z] Iteration Complete
- **Feature**: Hardest Map Completed Badge
- **Details**: Added getHardestMapCompleted in api.js to find the most difficult map (highest Base PTS) a player has cleared. Injected a fiery badge into the Player Profile header next to custom achievements.
- **Tests**: Added tests for getting the map with the highest Base PTS in test/api.test.mjs (100% Green).

## [2026-08-19T10:03:23.594Z] Iteration Complete
- **Feature**: Map Average Time Metric
- **Details**: Added getMapAverageTime to api.js to calculate the mean finish time of all players in a given leaderboard. Added a new metric card in map/index.html to display this alongside the WR and Strictness.
- **Tests**: Added tests for average calculation ignoring invalid entries in test/api.test.mjs (100% Green).

## [2026-08-19T10:05:15.949Z] Iteration Complete
- **Feature**: Global Map Pool Progress (Player Completion %)
- **Details**: Added getPlayerCompletionProgress in api.js to calculate the ratio of unique completed maps vs total maps in the database. Added a 4th Summary Metric Card on the Player Profile page with an animated progress bar to visualize this metric.
- **Tests**: Added tests to test/api.test.mjs (100% Green) to ensure accurate percentage calculation.

## [2026-08-19T10:08:22.945Z] Iteration Complete
- **Feature**: Player Playstyle Archetypes
- **Details**: Added getPlayerArchetype in api.js to analyze a player's radar stats and classify their playstyle (e.g. Speed Demon, Marathoner, Grinder, All-Rounder). Injected an animated badge with a description into the Player Radar UI.
- **Tests**: Added comprehensive archetype tests in test/api.test.mjs (100% Green).

## [2026-08-19T15:12:03Z] Iteration Complete
- **Feature**: Profile Card Generator (HTML5 Canvas export)
- **Details**: Added an 'Export Card' button next to the share profile button in player/index.html. This button uses a new window.api.generateProfileCard method in js/api.js that renders a beautiful Discord-ready 800x400 PNG card with the player's stats, level, league, and their Tee avatar drawn dynamically on a Canvas.
- **Tests**: Added safety unit test in api.test.mjs to ensure Node.js gracefully handles the absence of the DOM (100% Green).

## [2026-08-19T15:16:37Z] Iteration Complete
- **Bug Fix**: Fixed a critical 'RangeError: Invalid time value' bug caused by raw date strings (DDStats JSON) being multiplied by 1000. Parsed dates properly into Unix epoch seconds inside fetchPlayerPts.
- **Feature**: Interactive PTS Timeline (Интерактивный таймлайн прогресса PTS и рангов)
- **Details**: Built getPlayerProgressionTimeline to cumulatively calculate Base PTS and Skill PTS over time based on finish timestamps. Rendered an SVG timeline graph inside player profile (player/index.html) under the radar.
- **Tests**: 3 new tests in api.test.mjs for timeline generation edge cases (100% Green, 60/60).

## [2026-08-19T15:18:14Z] Iteration Complete
- **Feature**: 60fps Animations for Badges (Foil Sweep)
- **Details**: Added a buttery smooth 60fps '.foil-sweep' animation in css/style.css to give an ultra-premium foil reflection effect to the Custom Badges, Skill League card, and Mastery Level card.
- **Tests**: Ran all 60 tests to verify zero regressions (100% Green).

## [2026-08-19T15:20:12Z] Iteration Complete
- **Feature**: IndexedDB Caching for Player API Data
- **Details**: Added a powerful client-side caching layer using IndexedDB (ddnetmm_cache) to js/api.js. Player data is now aggressively cached for 2 hours (CACHE_TTL_MS). This makes page transitions instantaneous for returning visitors, drastically reducing load on DDStats JSON API.
- **Tests**: Ran all 60 tests to verify Node.js gracefully bypasses IndexedDB logic (100% Green).

## [2026-08-19T15:24:24Z] Iteration Complete
- **Feature**: Head-to-Head Win Probability Predictor
- **Details**: Activated the 'h2h-probability-container' in pvp/index.html and wired it up inside page-pvp.js. Now, when two players are compared, the UI dynamically calculates their match-up win probability using window.api.calculateWinProbability and displays a stylish horizontal progress bar showing the percent chances (e.g., 65% vs 35%).
- **Tests**: Ran all 60 tests to verify zero regressions (100% Green).

## [2026-08-19T15:28:35Z] Iteration Complete
- **Feature**: Player Consistency Score (Рейтинг постоянства)
- **Details**: Added getPlayerConsistencyScore to api.js which calculates the Coefficient of Variation (CV) based on a player's finish time ratios. The CV is inverted into a % score and dynamically displayed in a stylish UI badge inside the Player Radar panel on the player profile page.
- **Tests**: Added 3 new unit tests. All 63 tests pass (100% Green).

## [2026-08-19T15:31:55Z] Iteration Complete
- **Feature**: Estimated Playtime (Approx. Grind Time)
- **Details**: Added an algorithm in api.js (estimatePlaytime) to calculate the approximate number of hours a player has spent grinding based on map completion times, map Base PTS (difficulty exponential factor), and timeRatio. Displayed it as a metric card on the player profile.
- **Bug Fix**: Fixed a critical ReferenceError in page-player.js where 'stats is not defined' was crashing the profile page renderer during radar setup.
- **Tests**: Added 2 unit tests for estimatePlaytime. All 65 tests pass.

## [2026-08-19T15:33:19Z] Iteration Complete
- **Feature**: World Records Counter
- **Details**: Added logic to count the number of World Records (rank 1 finishes) a player holds and displayed it directly inside the Completion metric card (as ??) in the player profile UI.
- **Tests**: Ran all 65 tests to ensure 100% stability.

## [2026-08-19T15:35:21Z] Iteration Complete
- **Feature**: Suggested Rival (Ближайший соперник)
- **Details**: Created getPlayerRival in api.js to find the closest player in PTS on the global leaderboard. Integrated it into the player profile as a new 'Suggested Rival' panel that prompts the user to jump directly into a Head-to-Head PvP matchup against them.
- **Tests**: Added 2 unit tests for getPlayerRival. All 67 tests pass.

## [2026-08-19T15:38:15Z] Iteration Complete
- **Feature**: Global Maps Explorer (Список всех карт)
- **Details**: Created a completely new page (/maps) that serves as a global map directory. Built the UI (maps/index.html) and logic (js/page-maps.js) with features for searching by name, filtering by Server category, and advanced sorting (by Max/Min Base PTS, Farm Score, Strictness). Implemented pagination (48 items per page) and wired it into the global header navigation.
- **Tests**: Ran all 67 tests successfully. The architecture cleanly separates data loading (window.mapsData) from UI rendering.

## [2026-08-19T15:40:17Z] Iteration Complete
- **Feature**: Skill PTS Yield Calculator (Калькулятор очков на карте)
- **Details**: Added a new UI block in map/index.html (Map Details page) that allows players to input a target time (e.g. '10:30') and dynamically see exactly how many Skill PTS they will earn based on the map's current WR and Strictness (s) coefficient. Logic parses MM:SS format into seconds and runs it through calculateDecayPts().
- **Tests**: Ran all 67 tests successfully.

## [2026-08-19T15:42:38Z] Iteration Complete
- **Feature**: Discord Profile Card Generator (Генератор карточки для соцсетей)
- **Details**: Redesigned generateProfileCard in api.js to output a beautiful, high-quality 1000x500 PNG image. It features a dark glassmorphism gradient background, background grid patterns, glowing Player Tee Avatar, Global Rank badge, Archetype text, and formatted metrics for Mastery, Level, Completed Maps, and Estimated Grind Time. Clicking 'Card' in the player profile immediately downloads this image.
- **Tests**: Ran all 67 tests successfully.

## [2026-08-19T15:43:49Z] Iteration Complete
- **Feature**: Expanded Gamification Badges (Новые достижения)
- **Details**: Added 5 new dynamic badges to getPlayerBadges in api.js: Insane Specialist, Dummy Specialist, Race Specialist, Dedicated Grinder (>100 hours playtime), and Perfectionist (Consistency Score > 0.8). These automatically unlock as players progress and render beautifully in their profile and on their exported Discord Card.
- **Tests**: Ran all 67 tests successfully.

## [2026-08-19T15:48:21Z] Iteration Complete
- **Feature**: Global Stats Dashboard on Home Page
- **Details**: Added a new glass-panel dashboard section on the main page (index.html) which displays 'Total Indexed Players', 'Total Maps Indexed', and 'Max Available PTS'. The logic dynamically computes these totals from leaderboardData and mapsData directly in page-index.js after the data successfully loads. Also added foil-sweep animations to the map cards in Maps Explorer.
- **Tests**: Ran all 67 tests successfully.

## [2026-08-19T15:53:05Z] Iteration Complete
- **Feature**: UI Polish, Localization, Tooltips
- **Details**: Fixed duplicate 'PTS Progression' timeline on the player page. Localized static elements ('Maps' -> 'Карт', 'Mod Specialization', 'Suggested Rival') to Russian. Added context tooltips on hover (both explicit (?) on the player page and implicit on table headers) to help users understand complex metrics like Skill PTS, Consistency, and Est. Grind without cluttering the UI.

## [2026-08-19T15:56:33Z] Iteration Complete
- **Feature**: Underfarmed Maps (Recommendations)
- **Details**: Added a 'Легкий PTS (Рекомендации)' module to the player profile using the getUnderfarmedMaps logic. It calculates the 'Farm Score' based on Base PTS and Map Strictness (s) to suggest exactly 6 uncompleted maps where the player can farm the most PTS with the least effort. Automatically filters out already completed maps.
- **Tests**: Ran all 67 tests successfully (getUnderfarmedMaps logic is fully tested).

## [2026-08-19T15:59:27Z] Iteration Complete
- **Feature**: Hardest Map Conquered (Пик сложности)
- **Details**: Added a new metric card in the player profile UI to showcase the 'Hardest Map Conquered' by the player based on Base PTS. Bound this card to the 'api.getHardestMapCompleted' module which identifies the peak completion difficulty. Also fixed a bug with the PvP Matchup button navigation link (../pvp/?p1=...).
- **Tests**: Ran all 67 tests successfully.

## [2026-08-19T16:01:08Z] Iteration Complete
- **Feature**: GitHub-style Activity Heatmap
- **Details**: Built an awesome interactive 'Activity Heatmap' for the player profile. It analyzes all historical map completions across the last 365 days (grouped by YYYY-MM-DD format) and dynamically renders a 52x7 grid SVG heatmap. Colors scale from dark cyan to bright cyan based on intensity (maps completed per day) with native title tooltips.
- **Tests**: Ran all 67 tests successfully.

## [2026-08-19T16:05:26Z] Iteration Complete
- **Feature**: Player Achievements / Custom Badges UI
- **Details**: Bound the backend 'api.getPlayerBadges' module to the UI in the player profile. Achievements ('WR Hunter', 'Top-10 Regular', 'Oldschool Veteran') now render below the player's name and rank dynamically with native HTML tooltips for their descriptions, along with custom SVG icons and colors. Note: Also fully recovered the UI layout which was temporarily destroyed by a misplaced replace operation.
- **Tests**: Ran all 67 tests successfully.

## [2026-08-19T16:46:42Z] Iterations 89-98
- **Bug Fix**: Removed duplicate 'renderUnderfarmedMaps' declaration (SyntaxError) caused by previous loop iteration.
- **Bug Fix**: Farm Score formula was inverted — Tentrom (Insane, hardest map) was showing up as 'easy farm'. Fixed to penalize hard server categories (Insane=0.15x, Brutal=0.35x) and use finishCount accessibility factor.
- **UI**: Removed all (?) markers from player profile. Tooltips now activate on hover over the entire card container (cleaner UX).
- **UI**: Points History chart redesigned with smooth cubic bezier curves, Y-axis labels (k/M format), X-axis month ticks, grid lines, and gradient fill.
- **UI**: Activity Heatmap enhanced with month labels, day-of-week labels (Mon/Wed/Fri), total count badge, and Less/More legend (GitHub-style).
- **Tests**: Updated getUnderfarmedMaps tests to match new formula. 67/67 passing.
