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

function isQualifyingRun(server, rank, teamRank) {
  if (!server) return false;
  const s = String(server).trim();
  if (s.toLowerCase() === 'fun') return false;
  if (s === 'Solo' || s === 'Race' || s === 'Dummy') {
    return true;
  }
  const tr = (teamRank && typeof teamRank === 'object') ? teamRank.rank : teamRank;
  return Boolean(tr);
}

function loadRankingScriptAsync(src) {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => {
      s.remove();
      resolve(true);
    };
    s.onerror = () => {
      s.remove();
      resolve(false);
    };
    document.head.appendChild(s);
  });
}

async function getMapRanking(mapName) {
  if (window.mapRankingsData && window.mapRankingsData[mapName]) {
    return window.mapRankingsData[mapName];
  }
  const safeName = String(mapName).replace(/[/\\?%*:|"<>]/g, '_').replace(/ /g, '_');
  const scriptPath = `/data/rankings/${encodeURIComponent(safeName)}.js`;
  const loaded = await loadRankingScriptAsync(scriptPath);
  if (loaded && window.mapRankingCurrent) {
    const rankings = window.mapRankingCurrent;
    if (!window.mapRankingsData) window.mapRankingsData = {};
    window.mapRankingsData[mapName] = rankings;
    return rankings;
  }
  return null;
}

const playerCache = new Map();

// Fetch player data from DDStats and calculate Map Mastery PTS
// Returns: { name, oldPts, newPtsBase, newPtsSkill, newPtsTotal, finishDetails }
async function fetchPlayerPts(playerName) {
  const cacheKey = String(playerName || '').trim().toLowerCase();
  if (window.isBlacklisted && window.isBlacklisted(playerName)) {
    const err = new Error(`Player ${playerName} is blacklisted`);
    err.isBlacklisted = true;
    throw err;
  }
  if (playerCache.has(cacheKey)) {
    return playerCache.get(cacheKey);
  }
  const request = (async () => {
  try {
    let data = null;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`https://ddstats.tw/player/json?player=${encodeURIComponent(playerName)}`, { signal: controller.signal });
      clearTimeout(timer);
      if (response.ok) {
        data = await response.json();
      }
    } catch (e) {
      console.warn(`DDStats live fetch failed for ${playerName}, trying local data/players/ fallback...`, e);
    }

    if (!data || !data.finishes) {
      try {
        const localRes = await fetch(`/data/players/${encodeURIComponent(playerName)}.json`);
        if (localRes.ok) {
          data = await localRes.json();
        }
      } catch (localErr) {}
    }

    if (!data || !data.finishes) {
      throw new Error(`Failed to fetch player data for "${playerName}"`);
    }

    const mapRecords = await getMapRecords();
    const mapStats = await getMapStats();

    let oldPts = 0;
    let newPtsBase = 0;
    let newPtsSkill = 0;

    const finishes = data.finishes || [];
    const finishDetails = [];

    for (const finish of finishes) {
      if (!finish.map || !finish.map.map) continue;

      const mapName = finish.map.map;
      const server = finish.map.server || finish.server || 'Solo';

      const pBase = finish.map.points || 0;
      oldPts += pBase;
      newPtsBase += pBase;

      let pSkill = 0;
      let timeRatio = 0;
      let tBest = mapRecords[mapName] || finish.time;

      if (isQualifyingRun(server, finish.rank, finish.team_rank)) {
        const playerTime = finish.time;
        if (!mapRecords[mapName]) {
          const rank = finish.rank || 1;
          tBest = playerTime / (1 + Math.log10(Math.max(1, rank)) * 0.5);
        } else {
          tBest = mapRecords[mapName];
        }

        const stats = mapStats[mapName] || { s: 2.0 };
        const s = stats.s;

        timeRatio = playerTime / tBest;
        const pMaxBonus = pBase * 5.0;
        pSkill = Math.floor(pMaxBonus * Math.exp(-s * (Math.max(1, timeRatio) - 1)));

        newPtsSkill += pSkill;
      }

      // Pick rank: team_rank.rank on team maps if available, or finish.rank
      const rawRank = (finish.team_rank && finish.team_rank.rank) ? finish.team_rank.rank : (finish.rank || 0);

      // Check if map is enriched / flooded by TASers
      const mLower = mapName.toLowerCase();
      const isEnriched = (window.enrichedMapsData && (window.enrichedMapsData[mapName] || Object.keys(window.enrichedMapsData).some(k => k.toLowerCase() === mLower))) ||
                         (window.mapMinTimesData && window.mapMinTimesData[mLower]) ||
                         (window.customMapRecordsData && window.customMapRecordsData[mLower]);

      let rankings = (window.mapRankingsData && window.mapRankingsData[mapName]) ? window.mapRankingsData[mapName] : null;
      if (!rankings && isEnriched) {
        rankings = await getMapRanking(mapName);
      }

      let mmRank = rawRank;
      if (rankings) {
        const idx = rankings.findIndex(r => {
          const pNames = String(r.player || r.name || '').toLowerCase().split(/[,/&]+/).map(s => s.trim());
          return pNames.includes(playerName.toLowerCase());
        });
        if (idx !== -1) {
          mmRank = rankings[idx].rank || (idx + 1);
        } else if (isEnriched) {
          mmRank = '???';
        }
      } else if (isEnriched) {
        mmRank = '???';
      }

      finishDetails.push({
        mapName,
        server,
        pBase,
        pSkill,
        time: finish.time,
        timeRatio,
        record: tBest,
        rank: mmRank,
      });
    }

    // Sort by skill bonus descending
    finishDetails.sort((a, b) => b.pSkill - a.pSkill);

    const newPtsTotal = newPtsBase + newPtsSkill;

    const result = {
      name: data.profile?.name || playerName,
      profile: data.profile || null,
      skinName: data.profile?.skin_name || data.profile?.skin || 'default',
      skinColorBody: data.profile?.skin_color_body ?? data.profile?.color_body ?? null,
      skinColorFeet: data.profile?.skin_color_feet ?? data.profile?.color_feet ?? null,
      oldPts,
      newPtsBase,
      newPtsSkill,
      newPtsTotal,
      finishDetails,
    };

    return result;
  } catch (error) {
    console.error('Player points error:', error);
    throw error;
  }
  })();
  playerCache.set(cacheKey, request);
  try {
    return await request;
  } catch (error) {
    playerCache.delete(cacheKey);
    throw error;
  }
}

// Fetch top players from static leaderboard with live refresh via DDStats
// Returns players array; each item has isStatic=true if DDStats was unreachable
async function getTopPlayersLive(limit = 500, onProgress = null) {
  const staticLeaderboard = await getLeaderboardData();
  const maxLimit = limit === Infinity
    ? staticLeaderboard.length
    : (typeof limit === 'number' && limit > 0 ? limit : 500);
  const topCandidates = staticLeaderboard.slice(0, maxLimit);
  if (onProgress) onProgress(topCandidates.length, topCandidates.length);
  return topCandidates;
}

// Load map rankings from a per-map JS file (data/rankings/{safe}.js)
// Sets window.mapRankingCurrent, returns the array
function loadMapRankingFile(mapName) {
  return new Promise((resolve) => {
    const safe = mapName.replace(/[^a-zA-Z0-9_\-. ]/g, '_').replace(/\s+/g, '_');
    const isSubfolder = window.location.pathname.includes('/map/') ||
                        window.location.pathname.includes('/player/') ||
                        window.location.pathname.includes('/compare/') ||
                        window.location.pathname.includes('/pvp/') ||
                        window.location.pathname.includes('/about/') ||
                        window.location.pathname.includes('/privacy/') ||
                        window.location.pathname.includes('/tas/');
    const prefix = isSubfolder ? '../' : './';
    const src = `${prefix}data/rankings/${encodeURIComponent(safe)}.js?v=a1601ea`;

    const old = document.getElementById('map-ranking-script');
    if (old) old.remove();
    window.mapRankingCurrent = null;

    let timer = setTimeout(() => resolve([]), 3000);

    const script = document.createElement('script');
    script.id = 'map-ranking-script';
    script.src = src;
    script.onload = () => {
      clearTimeout(timer);
      resolve(window.mapRankingCurrent || []);
    };
    script.onerror = () => {
      clearTimeout(timer);
      resolve([]);
    };
    document.head.appendChild(script);
  });
}

// Map leaderboard logic
async function getMapLeaderboardLive(mapQuery, limit = 999999) {
  try {
    const mapRecords = await getMapRecords();

    // Find canonical map name from window.mapsData (exact case)
    const mapsList = window.mapsData || [];
    const foundInMaps = mapsList.find(m => (m.map || m.name || '').toLowerCase() === mapQuery.toLowerCase());

    let realMapName = foundInMaps ? (foundInMaps.map || foundInMaps.name) : mapQuery;
    let pBase = foundInMaps ? (foundInMaps.points || 0) : 0;

    // Optional DDStats online refresh if pBase is unknown
    if (pBase === 0) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2000);
        const mapRes = await fetch(`https://ddstats.tw/map/json?map=${encodeURIComponent(mapQuery)}`, { signal: controller.signal });
        clearTimeout(timer);
        if (mapRes.ok) {
          const mapData = await mapRes.json();
          if (mapData.info && mapData.info.map) {
            realMapName = mapData.info.map.map || realMapName;
            pBase = mapData.info.map.points || pBase;
          }
        }
      } catch (e) {}
    }

    // Load per-map ranking file
    let rankings = await loadMapRankingFile(realMapName);
    if (rankings.length === 0 && realMapName.toLowerCase() !== mapQuery.toLowerCase()) {
      rankings = await loadMapRankingFile(mapQuery);
    }

    // Fallback: try legacy window.mapRankingsData
    if (rankings.length === 0 && window.mapRankingsData) {
      const legacyKey = Object.keys(window.mapRankingsData).find(k => k.toLowerCase() === realMapName.toLowerCase());
      if (legacyKey && window.mapRankingsData[legacyKey]) {
        rankings = window.mapRankingsData[legacyKey];
      }
    }

    // Last resort: live DDStats rankings
    if (rankings.length === 0) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const mapRes = await fetch(`https://ddstats.tw/map/json?map=${encodeURIComponent(realMapName)}`, { signal: controller.signal });
        clearTimeout(timer);
        if (mapRes.ok) {
          const mapData = await mapRes.json();
          const isDummy = foundInMaps && (foundInMaps.server === 'Dummy');
          if (isDummy) {
            const rawSolo = (mapData.rankings || []).map(r => ({ player: r.name, time: r.time, timestamp: r.timestamp || null, isTeamRank: false }));
            const rawTeam = (mapData.team_rankings || [])
              .filter(r => {
                const pList = r.players || (r.player ? r.player.split(/[,/&]+/) : []);
                return pList.length <= 2;
              })
              .map(r => ({ player: Array.isArray(r.players) ? r.players.join(' & ') : (r.player || r.name), time: r.time, timestamp: r.timestamp || null, isTeamRank: true }));
            rankings = [...rawSolo, ...rawTeam].sort((a, b) => a.time - b.time);
          } else if (mapData.team_rankings && mapData.team_rankings.length > 0 && foundInMaps && foundInMaps.server !== 'Solo' && foundInMaps.server !== 'Race') {
            rankings = mapData.team_rankings.map(r => ({ player: Array.isArray(r.players) ? r.players.join(' & ') : (r.player || r.name), time: r.time, timestamp: r.timestamp || null, isTeamRank: true }));
          } else {
            const rawRankings = mapData.rankings || [];
            rankings = rawRankings.filter(r => r && r.name);
          }
        }
      } catch (e) {}
    }

    // Filter mapMinTimes, ignored finishes, and blacklisted players
    const mLower = String(realMapName || mapQuery).trim().toLowerCase();
    const minTimeSec = (window.mapMinTimesData && window.mapMinTimesData[mLower]) || 0;

    rankings = rankings.filter(r => {
      if (!r) return false;
      const pName = r.player || r.name;
      if (!pName) return false;

      // Custom record manual overrides bypass blacklist/rules
      if (r.isCustomRecord) return true;

      // 1. Min time filter
      if (minTimeSec > 0 && r.time < minTimeSec) return false;

      // 2. Blacklist filter
      if (window.isBlacklisted && window.isBlacklisted(pName)) return false;

      // 3. Ignored finish filter
      if (window.isIgnoredFinish && window.isIgnoredFinish(pName, realMapName)) return false;

      return true;
    });

    rankings.sort((a, b) => Number(a.time) - Number(b.time));
    const topPlayers = rankings.slice(0, limit);
    const leaderboard = [];

    // Case-insensitive lookup for tBest & s
    let tBest = mapRecords[realMapName];
    if (tBest === undefined) {
      const recKey = Object.keys(mapRecords).find(k => k.toLowerCase() === realMapName.toLowerCase());
      if (recKey) tBest = mapRecords[recKey];
    }
    if (!tBest && rankings.length > 0) {
      tBest = rankings[0].time;
    }

    const s = Number(foundInMaps && foundInMaps.s) || 2.0;
    const pMaxBonus = pBase * 5.0;

    for (const rankItem of topPlayers) {
      const playerName = rankItem.player || rankItem.name;
      const playerTime = rankItem.time;
      const timeRatio = tBest > 0 ? playerTime / tBest : 1;
      const pSkill = Math.floor(pMaxBonus * Math.exp(-s * (Math.max(1, timeRatio) - 1)));
      leaderboard.push({
        player: playerName,
        time: playerTime,
        timestamp: rankItem.timestamp || null,
        players: Array.isArray(rankItem.players) ? rankItem.players : null,
        isTeamRank: Boolean(rankItem.isTeamRank),
        rank: rankItem.rank || null,
        timeRatio,
        pSkill,
      });
    }

    if (!foundInMaps && leaderboard.length === 0 && !tBest) {
      throw new Error(`Map not found: ${mapQuery}`);
    }
    return { mapName: realMapName, tBest: tBest || 0, s, leaderboard };
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
