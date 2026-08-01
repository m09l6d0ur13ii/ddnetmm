// API fetching and parsing logic for DDNet Map Mastery

async function getLeaderboardData() {
  return window.leaderboardData || [];
}

async function getMapRecords() {
  return window.mapRecordsData || {};
}

async function getMapStats() {
  return window.mapStatsData || {};
}

const playerCache = new Map();

// Fetch player data from DDStats and calculate Map Mastery PTS
// Returns: { name, oldPts, newPtsBase, newPtsSkill, newPtsTotal, finishDetails }
async function fetchPlayerPts(playerName) {
  if (window.isBlacklisted && window.isBlacklisted(playerName)) {
    const err = new Error(`Player ${playerName} is blacklisted`);
    err.isBlacklisted = true;
    throw err;
  }
  if (playerCache.has(playerName)) {
    return playerCache.get(playerName);
  }
  try {
    const response = await fetch(`https://ddstats.tw/player/json?player=${encodeURIComponent(playerName)}`);
    if (!response.ok) throw new Error(`Failed to fetch player data: ${response.status}`);
    const data = await response.json();

    const mapRecords = await getMapRecords();
    const mapStats = await getMapStats();

    let oldPts = 0;
    let newPtsBase = 0;
    let newPtsSkill = 0;

    const finishes = data.finishes || [];
    const processedMaps = new Set();

    // finishDetails: per-map breakdown for player profile page
    const finishDetails = [];

    for (const finish of finishes) {
      const mapName = finish.map.name || finish.map.map;

      // Only count each map once
      if (processedMaps.has(mapName)) continue;
      // Exclude Fun category explicitly
      if (finish.map.server === 'Fun') continue;

      processedMaps.add(mapName);

      const mapPts = finish.map.points || 0;
      oldPts += mapPts;

      const pBase = mapPts;
      newPtsBase += pBase;

      const isSoloOrRace = finish.map.server === 'Solo' || finish.map.server === 'Race';
      const isTeamRun = finish.team_rank && finish.rank >= finish.team_rank;
      let pSkill = 0;
      let tBest = null;
      let timeRatio = 1;

      if (isSoloOrRace || isTeamRun) {
        const playerTime = finish.time;
        tBest = mapRecords[mapName];

        if (!tBest) {
          const rank = finish.rank || 1;
          tBest = playerTime / (1 + Math.log10(Math.max(1, rank)) * 0.5);
        }

        const stats = mapStats[mapName] || { s: 2.0 };
        const s = stats.s;

        timeRatio = playerTime / tBest;
        const pMaxBonus = pBase * 5.0;
        pSkill = Math.floor(pMaxBonus * Math.exp(-s * (Math.max(1, timeRatio) - 1)));

        // Only include maps with skill bonus in the details list
        if (pSkill > 0) {
          finishDetails.push({
            mapName,
            server: finish.map.server,
            pBase,
            pSkill,
            time: finish.time,
            timeRatio,
            record: tBest,
            rank: finish.rank || 0,
          });
        }
      }

      newPtsSkill += pSkill;
    }

    // Sort by skill bonus descending
    finishDetails.sort((a, b) => b.pSkill - a.pSkill);

    const newPtsTotal = newPtsBase + newPtsSkill;

    const result = {
      name: data.profile?.name || playerName,
      oldPts,
      newPtsBase,
      newPtsSkill,
      newPtsTotal,
      finishDetails,
    };

    playerCache.set(playerName, result);
    return result;
  } catch (error) {
    console.error('Player points error:', error);
    throw error;
  }
}

// Fetch top players from static leaderboard with live refresh via DDStats
// Returns players array; each item has isStatic=true if DDStats was unreachable
async function getTopPlayersLive(limit = 20, onProgress = null) {
  const staticLeaderboard = await getLeaderboardData();
  const topCandidates = staticLeaderboard.slice(0, limit);

  if (topCandidates.length === 0) return [];

  // Quick connectivity check — try to fetch one player
  let ddstatsReachable = true;
  try {
    const probe = await Promise.race([
      fetch(`https://ddstats.tw/player/json?player=${encodeURIComponent(topCandidates[0].name)}`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
    ]);
    if (!probe.ok) ddstatsReachable = false;
  } catch {
    ddstatsReachable = false;
  }

  // If DDStats is down — return static data immediately with a flag
  if (!ddstatsReachable) {
    if (onProgress) onProgress(topCandidates.length, topCandidates.length);
    return topCandidates.map(p => ({ ...p, isStatic: true }));
  }

  const livePlayers = [];

  // Process in batches to avoid flooding the browser
  const batchSize = 5;
  for (let i = 0; i < topCandidates.length; i += batchSize) {
    const batch = topCandidates.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(async p => {
      try {
        return await fetchPlayerPts(p.name);
      } catch (e) {
        return null;
      }
    }));

    for (let j = 0; j < results.length; j++) {
      if (results[j]) {
        livePlayers.push(results[j]);
      } else {
        livePlayers.push({ ...batch[j], isStatic: true }); // fallback to static
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, topCandidates.length), topCandidates.length);
    }
  }

  livePlayers.sort((a, b) => b.newPtsTotal - a.newPtsTotal);
  return livePlayers;
}

// Load map rankings from a per-map JS file (data/rankings/{safe}.js)
// Sets window.mapRankingCurrent, returns the array
function loadMapRankingFile(mapName) {
  return new Promise((resolve) => {
    // Check if per-map file exists by attempting to load it
    const safe = mapName.replace(/[^a-zA-Z0-9_\-. ]/g, '_').replace(/\s+/g, '_');
    const src = `data/rankings/${encodeURIComponent(safe)}.js`;

    // Remove any previously loaded ranking script to avoid conflicts
    const old = document.getElementById('map-ranking-script');
    if (old) old.remove();
    window.mapRankingCurrent = null;

    const script = document.createElement('script');
    script.id = 'map-ranking-script';
    script.src = src;
    script.onload = () => resolve(window.mapRankingCurrent || []);
    script.onerror = () => resolve([]); // file doesn't exist — empty array
    document.head.appendChild(script);
  });
}

// Map leaderboard logic
async function getMapLeaderboardLive(mapQuery, limit = 20) {
  try {
    const mapRecords = await getMapRecords();
    const mapStats = await getMapStats();

    let realMapName = mapQuery;
    let pBase = 0;

    try {
      const mapRes = await fetch(`https://ddstats.tw/map/json?map=${encodeURIComponent(mapQuery)}`);
      if (mapRes.ok) {
        const mapData = await mapRes.json();
        if (mapData.info && mapData.info.map) {
          realMapName = mapData.info.map.map;
          pBase = mapData.info.map.points || 0;
        }
      }
    } catch (e) {}

    // Try per-map ranking file first (split from map_rankings.js)
    let rankings = await loadMapRankingFile(realMapName);

    // Fallback: try legacy window.mapRankingsData (if old file still loaded)
    if (rankings.length === 0 && window.mapRankingsData) {
      const legacy = window.mapRankingsData[realMapName] || window.mapRankingsData[mapQuery] || [];
      rankings = legacy.filter(r => r && (r.player || r.name) && !(window.isBlacklisted && window.isBlacklisted(r.player || r.name)));
    }

    // Last resort: live DDStats rankings
    if (rankings.length === 0) {
      try {
        const mapRes = await fetch(`https://ddstats.tw/map/json?map=${encodeURIComponent(mapQuery)}`);
        if (mapRes.ok) {
          const mapData = await mapRes.json();
          const rawRankings = mapData.rankings || [];
          rankings = rawRankings.filter(r => r && r.name && !(window.isBlacklisted && window.isBlacklisted(r.name)));
        }
      } catch (e) {}
    }

    // Filter blacklisted players
    rankings = rankings.filter(r => r && (r.player || r.name) && !(window.isBlacklisted && window.isBlacklisted(r.player || r.name)));

    const topPlayers = rankings.slice(0, limit);
    const leaderboard = [];

    const tBest = mapRecords[realMapName] || (rankings.length > 0 ? rankings[0].time : 0);
    const stats = mapStats[realMapName] || { s: 2.0 };
    const s = stats.s;
    const pMaxBonus = pBase * 5.0;

    for (const rankItem of topPlayers) {
      const playerName = rankItem.player || rankItem.name;
      const playerTime = rankItem.time;
      const timeRatio = tBest > 0 ? playerTime / tBest : 1;
      const pSkill = Math.floor(pMaxBonus * Math.exp(-s * (Math.max(1, timeRatio) - 1)));
      leaderboard.push({
        player: playerName,
        time: playerTime,
        timeRatio,
        pSkill,
      });
    }

    return { mapName: realMapName, tBest, s, leaderboard };
  } catch (err) {
    console.error('Map leaderboard error:', err);
    throw err;
  }
}

window.api = {
  fetchPlayerPts,
  getTopPlayersLive,
  getMapLeaderboardLive,
};
