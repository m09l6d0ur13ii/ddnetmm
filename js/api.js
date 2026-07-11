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

// Fetch player data from DDStats and calculate Map Mastery PTS
async function fetchPlayerPts(playerName) {
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

    return {
      name: data.profile?.name || playerName,
      oldPts,
      newPtsBase,
      newPtsSkill,
      newPtsTotal,
      seasons
    };
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

    const mapRes = await fetch(`https://ddstats.tw/map/json?map=${encodeURIComponent(mapQuery)}`);
    if (!mapRes.ok) throw new Error('Map not found on DDStats');

    const mapData = await mapRes.json();
    if (!mapData.info || !mapData.info.map) throw new Error('Map not found');

    const realMapName = mapData.info.map.map;
    const mapServer = mapData.info.map.server;
    const pBase = mapData.info.map.points || 0;
    
    const rankings = mapData.rankings || [];
    const topPlayers = rankings.slice(0, limit);

    const isSoloOrRace = mapServer === 'Solo' || mapServer === 'Race';
    const leaderboard = [];

    let tBest = mapRecords[realMapName] || (topPlayers.length > 0 ? topPlayers[0].time : 0);
    const stats = mapStats[realMapName] || { s: 2.0 };
    const s = stats.s;
    const pMaxBonus = pBase * 5.0;

    const checkPlayer = async (rankItem) => {
      const playerTime = rankItem.time;
      let isValid = isSoloOrRace;

      if (!isValid) {
        try {
          const pRes = await fetch(`https://ddstats.tw/player/json?player=${encodeURIComponent(rankItem.name)}`);
          if (pRes.ok) {
            const pData = await pRes.json();
            const finishes = pData.finishes || [];
            const playerMapFinish = finishes.find(f => (f.map.name || f.map.map) === realMapName);
            if (playerMapFinish) {
              const teamRank = playerMapFinish.team_rank;
              const playerRank = playerMapFinish.rank;
              if (teamRank && playerRank >= teamRank) {
                isValid = true;
              }
            }
          }
        } catch (e) {
          // If fail, assume invalid
        }
      }

      if (isValid) {
        const timeRatio = playerTime / tBest;
        const pSkill = Math.floor(pMaxBonus * Math.exp(-s * (Math.max(1, timeRatio) - 1)));
        return {
          player: rankItem.name,
          time: playerTime,
          timeRatio,
          pSkill
        };
      }
      return null;
    };

    const batchSize = 5;
    for (let i = 0; i < topPlayers.length; i += batchSize) {
      const batch = topPlayers.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(checkPlayer));
      for (const res of results) {
        if (res) leaderboard.push(res);
      }
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
