# DDNet Map Mastery

DDNet Map Mastery is an alternative ranking and points (PTS) system for [DDNet](https://ddnet.org) (DDRace Network) players. It addresses the limitation of the standard ladder by prioritizing completion speed, skill, and performance over sheer quantity of finished maps.

## Overview

In traditional DDNet rankings, points are awarded primarily for completing maps regardless of finish times. DDNet Map Mastery introduces a time-adjusted skill scoring model that evaluates player performance against world records while accounting for completion time variance across individual maps.

### Key Features

* **Base Points**: Standard DDNet completion points awarded once per map.
* **Skill Bonus (Up to 5x Base PTS)**: Additional points scaled exponentially based on proximity to the map's World Record (WR).
* **Dynamic Strictness Coefficient ($s$)**: A per-map difficulty parameter ($0.5 \le s \le 3.0$) computed from the statistical variance of top completion times. Maps with tightly contested top times enforce stricter decay rates.
* **Static-First Architecture**: Designed for static hosting environments (such as GitHub Pages) with pre-rendered datasets to eliminate server-side database requirements.
* **Live Refresh & Fallbacks**: Real-time player statistics retrieval from DDStats API (`https://ddstats.tw`) with fallback to pre-rendered local static caches.
* **Tee Skin Renderer**: Canvas-based rendering of DDNet player avatars ("Tees") using custom color matrices and skin textures.
* **Player vs Player (PvP) & Comparison**: Head-to-head performance analysis and shared map matchup comparisons.
* **Anti-Cheat & Filtering**: Blacklisting system and custom record overrides to eliminate invalid or TAS-assisted records.

## Ranking Formula

Total points for a player on a given map are calculated as:

$$\text{PTS}_{\text{total}} = \text{PTS}_{\text{base}} + \text{PTS}_{\text{skill}}$$

The Skill Bonus $\text{PTS}_{\text{skill}}$ is determined by:

$$\text{PTS}_{\text{skill}} = \left\lfloor (\text{PTS}_{\text{base}} \times 5.0) \times e^{-s \cdot (\max(1, \frac{t_{\text{player}}}{t_{\text{best}}}) - 1)} \right\rfloor$$

Where:
* $\text{PTS}_{\text{base}}$: Base completion points of the map.
* $t_{\text{player}}$: Player's finish time on the map (in seconds).
* $t_{\text{best}}$: Map World Record time.
* $s$: Strictness coefficient based on top-tier finish variance ($0.5 \le s \le 3.0$).

## Project Structure

```
.
├── about/              # System documentation & formula breakdown page
├── compare/            # Player comparison page
├── css/                # Stylesheets and CSS dependencies
├── data/               # Pre-rendered datasets (maps, leaderboards, rankings)
│   ├── players/        # Pre-rendered individual player profile caches
│   └── rankings/       # Per-map pre-rendered ranking JS files
├── js/                 # Client-side scripts
│   ├── api.js          # API client (DDStats live fetch + static fallbacks)
│   ├── app.js          # Global app UI, navbar, and i18n initialization
│   ├── i18n.js         # Internationalization dictionary (RU / EN)
│   └── page-*.js       # Page-specific controllers
├── map/                # Map leaderboard page
├── player/             # Player profile page
├── privacy/            # Privacy policy page
├── pvp/                # Player vs Player matchup page
├── scripts/            # Node.js build and data pre-rendering pipeline
├── index.html          # Main leaderboard & map browser page
├── blacklist.txt       # List of blacklisted players
├── custom_map_records.txt # Manual record overrides
└── map_min_times.txt   # Minimum valid time thresholds per map
```

## Data Pipeline and Build Scripts

The pre-rendering pipeline fetches player finishes, calculates strictness coefficients, filters blacklisted entities, and generates static data bundles under the `data/` directory.

### Running Data Build Scripts

Prerequisites: [Node.js](https://nodejs.org) (v18 or higher recommended).

```bash
# Build all datasets (maps, rankings, leaderboards, player caches)
node scripts/build_all_data.mjs

# Update blacklist dataset
node scripts/build_blacklist_data.mjs
```

## Community and Support

* **Discord**: Join the community on [TeeProject Discord](https://discord.gg/BWmT3q96FP).
* **Issues**: Report bugs or submit feature requests via GitHub Issues.

## License

This project is licensed under the MIT License.

