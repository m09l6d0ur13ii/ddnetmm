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

function getSeason(timestampStr) {
  if (!timestampStr) return null;
  const d = new Date(timestampStr);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-11
  
  if (year === 2025) return month < 6 ? '2025-H1' : '2025-H2';
  if (year === 2026) return month < 6 ? '2026-H1' : '2026-H2';
  
  return null;
}

const playerCache = new Map();

// Fetch player data from DDStats and calculate Map Mastery PTS
async function fetchPlayerPts(playerName) {
  if (window.isBlacklisted && window.isBlacklisted(playerName)) {
    throw new Error(`Player ${playerName} is blacklisted`);
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
    
    let seasons = {
      '2025-H1': 0,
      '2025-H2': 0,
      '2026-H1': 0,
      '2026-H2': 0,
    };

    const finishes = data.finishes || [];
    const processedMaps = new Set();

    for (const finish of finishes) {
      const mapName = finish.map.name || finish.map.map;
      
      // Only count each map once
      if (processedMaps.has(mapName)) continue;
      // Exclude Fun category explicitly
      if (finish.map.server === 'Fun') continue;

      processedMaps.add(mapName);

      const mapPts = finish.map.points || 0;
      oldPts += mapPts;

      const pBase = mapPts; // Full DDNet points as base
      newPtsBase += pBase;

      const isSoloOrRace = finish.map.server === 'Solo' || finish.map.server === 'Race';
      const isTeamRun = finish.team_rank && finish.rank >= finish.team_rank;
      let pSkill = 0;
      
      if (isSoloOrRace || isTeamRun) {
        const playerTime = finish.time;
        let tBest = mapRecords[mapName];

        if (!tBest) {
          const rank = finish.rank || 1;
          tBest = playerTime / (1 + Math.log10(Math.max(1, rank)) * 0.5);
        }

        const stats = mapStats[mapName] || { s: 2.0 };
        const s = stats.s;

        const timeRatio = playerTime / tBest;
        const pMaxBonus = pBase * 5.0; // x5 multiplier
        pSkill = Math.floor(pMaxBonus * Math.exp(-s * (Math.max(1, timeRatio) - 1)));
      }

      newPtsSkill += pSkill;
      
      const season = getSeason(finish.timestamp);
      if (season && seasons[season] !== undefined) {
        seasons[season] += pSkill;
      }
    }

    const newPtsTotal = newPtsBase + newPtsSkill;

    const result = {
      name: data.profile?.name || playerName,
      oldPts,
      newPtsBase,
      newPtsSkill,
      newPtsTotal,
      seasons
    };

    playerCache.set(playerName, result);
    return result;
  } catch (error) {
    console.error("Player points error:", error);
    throw error;
  }
}

// Fetch top players, replacing server-side top-players/route.ts
async function getTopPlayersLive(limit = 20, onProgress = null) {
  const staticLeaderboard = await getLeaderboardData();
  const topCandidates = staticLeaderboard.slice(0, limit);
  
  if (topCandidates.length === 0) return [];

  const livePlayers = [];
  
  // We process sequentially or in small batches to not overload browser
  const batchSize = 5;
  for (let i = 0; i < topCandidates.length; i += batchSize) {
    const batch = topCandidates.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(async p => {
      try {
        return await fetchPlayerPts(p.name);
      } catch(e) {
        return null;
      }
    }));
    
    for (let j = 0; j < results.length; j++) {
      if (results[j]) {
        livePlayers.push(results[j]);
      } else {
        livePlayers.push(batch[j]); // fallback to static
      }
    }
    
    if (onProgress) {
      onProgress(Math.min(i + batchSize, topCandidates.length), topCandidates.length);
    }
  }

  livePlayers.sort((a, b) => b.newPtsTotal - a.newPtsTotal);
  return livePlayers;
}

// Map leaderboard logic
async function getMapLeaderboardLive(mapQuery, limit = 20) {
  try {
    const mapRecords = await getMapRecords();
    const mapStats = await getMapStats();

    let realMapName = mapQuery;
    let mapServer = 'Novice';
    let pBase = 0;

    try {
      const mapRes = await fetch(`https://ddstats.tw/map/json?map=${encodeURIComponent(mapQuery)}`);
      if (mapRes.ok) {
        const mapData = await mapRes.json();
        if (mapData.info && mapData.info.map) {
          realMapName = mapData.info.map.map;
          mapServer = mapData.info.map.server;
          pBase = mapData.info.map.points || 0;
        }
      }
    } catch (e) {}

    // Prefer pre-enriched clean rankings from data/map_rankings.js
    const staticRankings = window.mapRankingsData ? (window.mapRankingsData[realMapName] || window.mapRankingsData[mapQuery] || []) : [];
    let rankings = staticRankings.filter(r => r && (r.player || r.name) && !(window.isBlacklisted && window.isBlacklisted(r.player || r.name)));

    // Fallback to live DDStats rankings if static is empty
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

    const topPlayers = rankings.slice(0, limit);
    const leaderboard = [];

    let tBest = mapRecords[realMapName] || (rankings.length > 0 ? rankings[0].time : 0);
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
        pSkill
      });
    }

    return {
      mapName: realMapName,
      tBest,
      s,
      leaderboard
    };
  } catch (err) {
    console.error("Map leaderboard error:", err);
    throw err;
  }
}

window.api = {
  fetchPlayerPts,
  getTopPlayersLive,
  getMapLeaderboardLive
};
