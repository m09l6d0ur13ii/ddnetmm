// API fetching and parsing logic for DDNet Map Mastery

/**
 * @returns {Promise<Array<Object>>}
 */
async function getLeaderboardData() {
  return window.leaderboardData || [];
}

/**
 * @returns {Promise<Object<string, number>>}
 */
async function getMapRecords() {
  return window.mapRecordsData || {};
}

/**
 * @returns {Promise<Object<string, Object>>}
 */
async function getMapStats() {
  return window.mapStatsData || {};
}

/**
 * @param {string} server
 * @param {number} rank
 * @param {number|Object} teamRank
 * @returns {boolean}
 */
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

/**
 * @param {string} src
 * @returns {Promise<boolean>}
 */
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

/**
 * @param {string} mapName
 * @returns {string}
 */
function safeRankingFilename(mapName) {
  return String(mapName || '').replace(/[^a-zA-Z0-9_\-.]/g, '_');
}

/**
 * @param {string} mapName
 * @returns {Promise<Array<Object>|null>}
 */
async function getMapRanking(mapName) {
  if (window.mapRankingsData && window.mapRankingsData[mapName]) {
    return window.mapRankingsData[mapName];
  }
  const safeName = safeRankingFilename(mapName);
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

// IndexedDB Persistent Cache for player profiles
const DB_NAME = 'ddnetmm_cache';
const DB_VERSION = 1;
const STORE_NAME = 'players_cache';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

let dbPromise = null;
if (typeof indexedDB !== 'undefined') {
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      if (!e.target.result.objectStoreNames.contains(STORE_NAME)) {
        e.target.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getIDBCache(key) {
  if (!dbPromise) return null;
  try {
    const db = await dbPromise;
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result && (Date.now() - request.result.timestamp < CACHE_TTL_MS)) {
          resolve(request.result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (e) { return null; }
}

async function setIDBCache(key, data) {
  if (!dbPromise) return false;
  try {
    const db = await dbPromise;
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ timestamp: Date.now(), data }, key);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch (e) { return false; }
}

// Skill league is based on the weighted Skill PTS / Base PTS ratio.
// Players need enough Base PTS to prevent one fast finish from granting a top league.
const SKILL_LEAGUE_MIN_BASE_PTS = 1000;
const SKILL_LEAGUES = [
  { id: 'master', minRatio: 2.0 },
  { id: 'diamond', minRatio: 1.5 },
  { id: 'platinum', minRatio: 1.0 },
  { id: 'gold', minRatio: 0.6 },
  { id: 'silver', minRatio: 0.3 },
  { id: 'bronze', minRatio: 0.0 },
];

/**
 * @param {number} basePts
 * @param {number} skillPts
 * @returns {{id: string, ratio: number|null, isProvisional: boolean, minBasePts: number}}
 */
function getSkillLeague(basePts, skillPts) {
  const base = Number(basePts);
  const skill = Number(skillPts);
  const ratio = Number.isFinite(base) && base > 0 && Number.isFinite(skill) && skill >= 0
    ? skill / base
    : null;

  if (ratio === null) {
    return { id: 'unranked', ratio: null, isProvisional: false, minBasePts: SKILL_LEAGUE_MIN_BASE_PTS };
  }

  if (base < SKILL_LEAGUE_MIN_BASE_PTS) {
    return { id: 'provisional', ratio, isProvisional: true, minBasePts: SKILL_LEAGUE_MIN_BASE_PTS };
  }

  const league = SKILL_LEAGUES.find(item => ratio >= item.minRatio) || SKILL_LEAGUES[SKILL_LEAGUES.length - 1];
  return { id: league.id, ratio, isProvisional: false, minBasePts: SKILL_LEAGUE_MIN_BASE_PTS };
}

// Progressive Mastery level. The required points grow quadratically,
// so early levels are quick while high levels remain meaningful.
// Level 100 starts at 98,010 Total Mastery PTS.
/**
 * @param {number} totalPts
 * @returns {{level: number, totalPts: number, currentLevelPts: number, nextLevelPts: number, pointsToNext: number, progress: number, progressPercent: number}}
 */
function getMasteryLevel(totalPts) {
  const total = Math.max(0, Number(totalPts) || 0);
  const level = Math.floor(Math.sqrt(total / 10)) + 1;
  const currentLevelPts = 10 * Math.pow(level - 1, 2);
  const nextLevelPts = 10 * Math.pow(level, 2);
  const earnedThisLevel = total - currentLevelPts;
  const requiredThisLevel = nextLevelPts - currentLevelPts;
  const progress = requiredThisLevel > 0
    ? Math.min(1, Math.max(0, earnedThisLevel / requiredThisLevel))
    : 0;

  return {
    level,
    totalPts: total,
    currentLevelPts,
    nextLevelPts,
    pointsToNext: Math.max(0, nextLevelPts - total),
    progress,
    progressPercent: progress * 100,
  };
}

/**
 * Fetch player data from DDStats and calculate Map Mastery PTS
 * @param {string} playerName
 * @returns {Promise<{name: string, profile: Object, skinName: string, skinColorBody: string, skinColorFeet: string, oldPts: number, newPtsBase: number, newPtsSkill: number, newPtsTotal: number, skillLeague: Object, masteryLevel: Object, finishDetails: Array<Object>}>}
 */
async function fetchPlayerPts(playerName, forceRefresh = false) {
  const cacheKey = String(playerName || '').trim().toLowerCase();
  if (window.isBlacklisted && window.isBlacklisted(playerName)) {
    const err = new Error(`Player ${playerName} is blacklisted`);
    err.isBlacklisted = true;
    throw err;
  }
  if (!forceRefresh) {
    if (playerCache.has(cacheKey)) {
      return playerCache.get(cacheKey);
    }

    const idbCached = await getIDBCache(cacheKey);
    if (idbCached) {
      playerCache.set(cacheKey, idbCached);
      return idbCached;
    }
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
        } catch (localErr) { }
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
        const mapInfoObj = (window.mapsData || []).find(m => (m.map || m.name || '').toLowerCase() === mapName.toLowerCase());
        const server = mapInfoObj ? (mapInfoObj.server || 'Novice') : (finish.map?.server || finish.server || 'Novice');

        const pBase = finish.map.points || 0;
        oldPts += pBase;
        newPtsBase += pBase;

        let pSkill = 0;
        let timeRatio = 0;
        let tBest = mapRecords[mapName] || finish.time;

        const teamRankVal = (finish.team_rank && typeof finish.team_rank === 'object') ? finish.team_rank.rank : finish.team_rank;

        if (isQualifyingRun(server, finish.rank, teamRankVal)) {
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

        // Pick rank: team_rank.rank on team maps if available, or null for solo runs on team maps
        const isSoloCategory = ['solo', 'race'].includes(server.toLowerCase());
        const isTeamMap = !isSoloCategory && (server !== 'Dummy');
        const rawRank = isTeamMap ? (teamRankVal || null) : (finish.rank || 0);

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
          } else if (isEnriched && !rawRank) {
            mmRank = null;
          }
        }

        let teamPartner = null;
        let teamPartners = [];
        if (finish.team_rank) {
          if (Array.isArray(finish.team_rank.players)) {
            teamPartners = finish.team_rank.players
              .map(p => typeof p === 'string' ? p : (p.name || p.player || ''))
              .filter(p => p && p.toLowerCase() !== playerName.toLowerCase());
            teamPartner = teamPartners.join(' & ');
          } else if (finish.team_rank.player) {
            const p = String(finish.team_rank.player);
            if (p.toLowerCase() !== playerName.toLowerCase()) {
              teamPartners = [p];
              teamPartner = p;
            }
          }
        }

        let finishTs = 0;
        if (finish.timestamp) {
          if (typeof finish.timestamp === 'string') {
            // Could be ISO string or "YYYY-MM-DD HH:MM:SS", Date.parse handles standard ISO.
            // Fallback to replacing space with 'T' if it's SQL-like.
            const tsStr = finish.timestamp.replace(' ', 'T');
            finishTs = Math.floor(Date.parse(tsStr) / 1000);
          } else if (typeof finish.timestamp === 'number') {
            // If it's already a number, assume it's seconds (or milliseconds if very large)
            finishTs = finish.timestamp > 20000000000 ? Math.floor(finish.timestamp / 1000) : finish.timestamp;
          }
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
          teamPartner,
          teamPartners,
          isTeamRank: Boolean(finish.team_rank),
          timestamp: finishTs || 0
        });
      }

      // Sort by skill bonus descending
      finishDetails.sort((a, b) => b.pSkill - a.pSkill);

      const newPtsTotal = newPtsBase + newPtsSkill;

      const skillLeague = getSkillLeague(newPtsBase, newPtsSkill);
      const masteryLevel = getMasteryLevel(newPtsTotal);
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
        skillLeague,
        masteryLevel,
        finishDetails,
      };

      playerCache.set(cacheKey, result);
      await setIDBCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Player points error:', error);
      throw error;
    }
  })();
  playerCache.set(cacheKey, request);
  try {
    const finalResult = await request;
    return finalResult;
  } catch (e) {
    playerCache.delete(cacheKey);
    throw e;
  }
}

/**
 * Fetch top players from static leaderboard with live refresh via DDStats
 * @param {number} limit
 * @param {Function} [onProgress]
 * @returns {Promise<Array<Object>>}
 */
async function getTopPlayersLive(limit = 500, onProgress = null) {
  const staticLeaderboard = await getLeaderboardData();
  const maxLimit = limit === Infinity
    ? staticLeaderboard.length
    : (typeof limit === 'number' && limit > 0 ? limit : 500);
  const topCandidates = staticLeaderboard.slice(0, maxLimit);
  if (onProgress) onProgress(topCandidates.length, topCandidates.length);
  return topCandidates;
}

/**
 * Load map rankings from a per-map JS file
 * @param {string} mapName
 * @returns {Promise<Array<Object>>}
 */
function loadMapRankingFile(mapName) {
  return new Promise((resolve) => {
    const safe = safeRankingFilename(mapName);
    const path = window.location.pathname.toLowerCase();
    const isSubfolder = path.includes('/map') ||
      path.includes('/player') ||
      path.includes('/compare') ||
      path.includes('/pvp') ||
      path.includes('/about') ||
      path.includes('/privacy') ||
      path.includes('/settings') ||
      path.includes('/tas');
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

/**
 * Map leaderboard logic
 * @param {string} mapQuery
 * @param {number} limit
 * @returns {Promise<{mapName: string, tBest: number, s: number, leaderboard: Array<Object>}>}
 */
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
      } catch (e) { }
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
      } catch (e) { }
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

/**
 * Finds underfarmed maps that provide the easiest Skill PTS bonus for the player.
 * Prioritizes low-star farmable maps (1-3 stars, high s) and excludes extreme Insane/Brutal 5-star maps.
 * @param {Array<Object>} finishDetails Array of finishes the player already has
 * @param {number} limit Max number of recommendations (default 6)
 * @returns {Array<Object>} List of suggested maps
 */
function getUnderfarmedMaps(finishDetails, limit = 6) {
  if (typeof window === 'undefined' || !window.mapsData) {
    return [];
  }
  const completedMaps = new Set((finishDetails || []).map(f => String(f.mapName).toLowerCase()));

  const SERVER_WEIGHT = {
    'Novice': 1.3,
    'Moderate': 1.1,
    'Dummy': 1.0,
    'Solo': 1.0,
    'Race': 1.0,
    'Oldschool': 0.85,
    'DDmaX': 0.85,
    'DDmaX.Easy': 1.1,
    'DDmaX.Next': 0.8,
    'DDmaX.Pro': 0.7,
    'DDmaX.Nut': 0.7,
    'Brutal': 0.3,
    'Insane': 0.0, // Insane maps are excluded from Easy PTS
    'Event': 0.5,
    'Fun': 0.0
  };

  const potentialMaps = [];

  for (const map of window.mapsData) {
    const mapName = map.map;
    if (completedMaps.has(mapName.toLowerCase())) continue;

    const pBase = Number(map.points) || 0;
    if (pBase <= 0) continue;

    const serverRaw = (map.server || 'Novice').trim();
    const serverLower = serverRaw.toLowerCase();
    if (serverLower.includes('insane') || serverLower === 'fun') continue;

    const stars = Number(map.stars) || 1;
    // For easy farming, prefer 1-3 star maps (avoid 4-5 star endurance walls)
    if (stars > 3 && serverLower !== 'novice') continue;

    const s = Number(map.s) || ((window.mapStatsData && window.mapStatsData[mapName]?.s) ?? 0.8);
    const weight = SERVER_WEIGHT[serverRaw] ?? (serverLower.startsWith('ddmax') ? 0.85 : 0.7);

    // Star factor: 1 star = 1.0, 2 stars = 0.85, 3 stars = 0.6
    const starFactor = stars === 1 ? 1.0 : (stars === 2 ? 0.85 : 0.6);
    const farmScore = (pBase * 0.8 + s * 5) * starFactor * weight;

    let serverNorm = serverRaw;
    if (serverNorm.toLowerCase().startsWith('ddmax')) serverNorm = 'DDmaX';

    potentialMaps.push({
      mapName: mapName,
      server: serverNorm,
      pBase: pBase,
      stars: stars,
      s: s,
      farmScore: farmScore,
      maxSkill: pBase * 5
    });
  }

  // If a veteran player has completed literally all farmable maps (like Mokou 98.8%),
  // suggest remaining maps sorted by lowest difficulty stars
  if (potentialMaps.length === 0) {
    for (const map of window.mapsData) {
      const mapName = map.map;
      if (completedMaps.has(mapName.toLowerCase())) continue;
      const pBase = Number(map.points) || 0;
      if (pBase <= 0) continue;
      const stars = Number(map.stars) || 5;
      const s = Number(map.s) || 0.5;
      let serverNorm = (map.server || 'Insane').trim();
      if (serverNorm.toLowerCase().startsWith('ddmax')) serverNorm = 'DDmaX';
      potentialMaps.push({
        mapName: mapName,
        server: serverNorm,
        pBase: pBase,
        stars: stars,
        s: s,
        farmScore: (10 - stars) * 10 + pBase,
        maxSkill: pBase * 5,
        isChallenge: true
      });
    }
  }

  return potentialMaps.sort((a, b) => b.farmScore - a.farmScore).slice(0, limit);
}

/**
 * Calculates custom player badges/achievements based on finish history.
 * Returns rich achievement objects with tiers, categories, progress tracking, and unlocked status.
 * @param {Object|Array} playerData Player data containing finishDetails or finishes array
 * @returns {Array<Object>} List of achievements
 */
function getPlayerBadges(playerData) {
  const finishes = Array.isArray(playerData) ? playerData : (playerData?.finishDetails || []);
  const newPtsTotal = (playerData && playerData.newPtsTotal) || finishes.reduce((a, f) => a + (f.pBase || 0) + (f.pSkill || 0), 0);
  const newPtsBase = (playerData && playerData.newPtsBase) || finishes.reduce((a, f) => a + (f.pBase || 0), 0);
  const newPtsSkill = (playerData && playerData.newPtsSkill) || finishes.reduce((a, f) => a + (f.pSkill || 0), 0);
  const skillRatio = newPtsBase > 0 ? (newPtsSkill / newPtsBase) : 0;

  let top1 = 0;
  let top10 = 0;
  let subSecCount = 0;
  let oldschoolCount = 0;
  let brutalCount = 0;
  let insaneCount = 0;
  let dummyCount = 0;
  let raceCount = 0;
  let soloCount = 0;
  let teamPartnerCount = 0;
  let ddmaxCount = 0;
  let maxMapPts = 0;

  for (const f of finishes) {
    if (f.rank === 1) top1++;
    if (typeof f.rank === 'number' && f.rank > 0 && f.rank <= 10) top10++;
    if (f.timeRatio && f.timeRatio <= 1.05) subSecCount++;
    if ((f.pBase || 0) > maxMapPts) maxMapPts = f.pBase || 0;

    const server = (f.server || '').toLowerCase();
    if (server.includes('oldschool')) oldschoolCount++;
    if (server.includes('brutal')) brutalCount++;
    if (server.includes('insane')) insaneCount++;
    if (server.includes('dummy')) dummyCount++;
    if (server.includes('race')) raceCount++;
    if (server.includes('solo')) soloCount++;
    if (server.includes('ddmax')) ddmaxCount++;
    if (f.teamPartner) teamPartnerCount++;
  }

  const playtimeHours = Math.round(estimatePlaytime(finishes));
  const consistency = getPlayerConsistencyScore(playerData);
  const consistencyPct = Math.round(consistency * 100);

  const rawBadges = [
    // --- Speed & World Records ---
    {
      id: 'wr_legend',
      name: 'WR Legend',
      desc: 'Achieve Rank 1 on 50 or more maps',
      descRu: 'Достичь топ-1 на 50 или более картах',
      icon: '👑',
      category: 'speed',
      tier: 'legendary',
      current: top1,
      target: 50,
      color: 'text-amber-400',
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/40'
    },
    {
      id: 'wr_master',
      name: 'WR Master',
      desc: 'Achieve Rank 1 on 10 or more maps',
      descRu: 'Достичь топ-1 на 10 или более картах',
      icon: '🏆',
      category: 'speed',
      tier: 'diamond',
      current: top1,
      target: 10,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/15',
      border: 'border-cyan-500/40'
    },
    {
      id: 'wr_hunter',
      name: 'WR Hunter',
      desc: 'Achieve Rank 1 on at least 1 map',
      descRu: 'Достичь топ-1 хотя бы на 1 карте',
      icon: '🥇',
      category: 'speed',
      tier: 'gold',
      current: top1,
      target: 1,
      color: 'text-amber-400',
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/40'
    },
    {
      id: 'top10_regular',
      name: 'Top-10 Regular',
      desc: 'Earn 25 or more Top-10 DDNet finishes',
      descRu: '25 или более финишей в топ-10 DDNet',
      icon: '⭐',
      category: 'speed',
      tier: 'gold',
      current: top10,
      target: 25,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/15',
      border: 'border-yellow-500/40'
    },
    {
      id: 'top10_challenger',
      name: 'Speed Challenger',
      desc: 'Earn 5 or more Top-10 DDNet finishes',
      descRu: '5 или более финишей в топ-10 DDNet',
      icon: '⚡',
      category: 'speed',
      tier: 'silver',
      current: top10,
      target: 5,
      color: 'text-blue-400',
      bg: 'bg-blue-500/15',
      border: 'border-blue-500/40'
    },
    {
      id: 'precision_master',
      name: 'Sub-Second Precision',
      desc: 'Finish within 1.05x of WR time on 10+ maps',
      descRu: 'Финиш в пределах 1.05x от рекорда мира на 10+ картах',
      icon: '🎯',
      category: 'speed',
      tier: 'diamond',
      current: subSecCount,
      target: 10,
      color: 'text-purple-400',
      bg: 'bg-purple-500/15',
      border: 'border-purple-500/40'
    },
    {
      id: 'perfectionist',
      name: 'Laser Focus',
      desc: 'Maintain a 80%+ Consistency Score across runs',
      descRu: 'Стабильность времени (Consistency Score) 80% и выше',
      icon: '🎯',
      category: 'speed',
      tier: 'diamond',
      current: consistencyPct,
      target: 80,
      unit: '%',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/15',
      border: 'border-indigo-500/40'
    },

    // --- Category Specialists ---
    {
      id: 'insane_master',
      name: 'Insane Master',
      desc: 'Complete 50 or more Insane maps',
      descRu: '50+ пройденных Insane карт',
      icon: '💀',
      category: 'category',
      tier: 'legendary',
      current: insaneCount,
      target: 50,
      color: 'text-fuchsia-400',
      bg: 'bg-fuchsia-500/15',
      border: 'border-fuchsia-500/40'
    },
    {
      id: 'insane_specialist',
      name: 'Insane Specialist',
      desc: 'Complete 20 or more Insane maps',
      descRu: '20+ пройденных Insane карт',
      icon: '☠️',
      category: 'category',
      tier: 'gold',
      current: insaneCount,
      target: 20,
      color: 'text-pink-400',
      bg: 'bg-pink-500/15',
      border: 'border-pink-500/40'
    },
    {
      id: 'brutal_slayer',
      name: 'Brutal Slayer',
      desc: 'Complete 50 or more Brutal maps',
      descRu: '50+ пройденных Brutal карт',
      icon: '🔥',
      category: 'category',
      tier: 'diamond',
      current: brutalCount,
      target: 50,
      color: 'text-red-400',
      bg: 'bg-red-500/15',
      border: 'border-red-500/40'
    },
    {
      id: 'brutal_specialist',
      name: 'Brutal Specialist',
      desc: 'Complete 25 or more Brutal maps',
      descRu: '25+ пройденных Brutal карт',
      icon: '💥',
      category: 'category',
      tier: 'gold',
      current: brutalCount,
      target: 25,
      color: 'text-orange-400',
      bg: 'bg-orange-500/15',
      border: 'border-orange-500/40'
    },
    {
      id: 'dummy_maestro',
      name: 'Dummy Maestro',
      desc: 'Complete 25 or more Dummy maps simultaneously',
      descRu: '25+ пройденных Dummy карт',
      icon: '🤖',
      category: 'category',
      tier: 'diamond',
      current: dummyCount,
      target: 25,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/15',
      border: 'border-cyan-500/40'
    },
    {
      id: 'dummy_specialist',
      name: 'Dummy Specialist',
      desc: 'Complete 10 or more Dummy maps',
      descRu: '10+ пройденных Dummy карт',
      icon: '🦾',
      category: 'category',
      tier: 'silver',
      current: dummyCount,
      target: 10,
      color: 'text-teal-400',
      bg: 'bg-teal-500/15',
      border: 'border-teal-500/40'
    },
    {
      id: 'race_legend',
      name: 'Race Demon',
      desc: 'Complete 100 or more Race maps',
      descRu: '100+ пройденных Race карт',
      icon: '🏎️',
      category: 'category',
      tier: 'diamond',
      current: raceCount,
      target: 100,
      color: 'text-sky-400',
      bg: 'bg-sky-500/15',
      border: 'border-sky-500/40'
    },
    {
      id: 'race_specialist',
      name: 'Race Specialist',
      desc: 'Complete 50 or more Race maps',
      descRu: '50+ пройденных Race карт',
      icon: '🏁',
      category: 'category',
      tier: 'silver',
      current: raceCount,
      target: 50,
      color: 'text-blue-400',
      bg: 'bg-blue-500/15',
      border: 'border-blue-500/40'
    },
    {
      id: 'oldschool_legend',
      name: 'Oldschool Legend',
      desc: 'Complete 50 or more Oldschool maps',
      descRu: '50+ пройденных Oldschool карт',
      icon: '⏳',
      category: 'category',
      tier: 'diamond',
      current: oldschoolCount,
      target: 50,
      color: 'text-amber-400',
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/40'
    },
    {
      id: 'oldschool_veteran',
      name: 'Oldschool Veteran',
      desc: 'Complete 20 or more Oldschool maps',
      descRu: '20+ пройденных Oldschool карт',
      icon: '🏛️',
      category: 'category',
      tier: 'silver',
      current: oldschoolCount,
      target: 20,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/15',
      border: 'border-yellow-500/40'
    },
    {
      id: 'lone_wolf',
      name: 'Lone Wolf',
      desc: 'Complete 100 or more Solo maps',
      descRu: '100+ пройденных Solo карт',
      icon: '🐺',
      category: 'category',
      tier: 'gold',
      current: soloCount,
      target: 100,
      color: 'text-slate-300',
      bg: 'bg-slate-500/15',
      border: 'border-slate-500/40'
    },
    {
      id: 'dynamic_duo',
      name: 'Dynamic Duo',
      desc: 'Complete 50+ Team maps with teammates',
      descRu: '50+ финишей в команде с напарником на Team картах',
      icon: '🤝',
      category: 'category',
      tier: 'gold',
      current: teamPartnerCount,
      target: 50,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/40'
    },
    {
      id: 'ddmax_connoisseur',
      name: 'DDmaX Connoisseur',
      desc: 'Complete 25 or more DDmaX maps',
      descRu: '25+ пройденных карт серии DDmaX',
      icon: '⚔️',
      category: 'category',
      tier: 'silver',
      current: ddmaxCount,
      target: 25,
      color: 'text-violet-400',
      bg: 'bg-violet-500/15',
      border: 'border-violet-500/40'
    },

    // --- Mastery & PTS ---
    {
      id: 'ddnet_titan',
      name: 'DDNet Titan',
      desc: 'Accumulate 100,000+ Total Mastery PTS',
      descRu: 'Набрать 100 000+ Total Mastery PTS',
      icon: '👑',
      category: 'mastery',
      tier: 'legendary',
      current: newPtsTotal,
      target: 100000,
      unit: ' PTS',
      color: 'text-amber-300',
      bg: 'bg-amber-500/20',
      border: 'border-amber-400/50'
    },
    {
      id: 'grandmaster',
      name: 'Grandmaster',
      desc: 'Accumulate 50,000+ Total Mastery PTS',
      descRu: 'Набрать 50 000+ Total Mastery PTS',
      icon: '🔮',
      category: 'mastery',
      tier: 'diamond',
      current: newPtsTotal,
      target: 50000,
      unit: ' PTS',
      color: 'text-purple-400',
      bg: 'bg-purple-500/15',
      border: 'border-purple-500/40'
    },
    {
      id: 'master',
      name: 'Master of Maps',
      desc: 'Accumulate 25,000+ Total Mastery PTS',
      descRu: 'Набрать 25 000+ Total Mastery PTS',
      icon: '💎',
      category: 'mastery',
      tier: 'gold',
      current: newPtsTotal,
      target: 25000,
      unit: ' PTS',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/15',
      border: 'border-cyan-500/40'
    },
    {
      id: 'veteran',
      name: 'PTS Veteran',
      desc: 'Accumulate 10,000+ Total Mastery PTS',
      descRu: 'Набрать 10 000+ Total Mastery PTS',
      icon: '🛡️',
      category: 'mastery',
      tier: 'silver',
      current: newPtsTotal,
      target: 10000,
      unit: ' PTS',
      color: 'text-slate-300',
      bg: 'bg-slate-500/15',
      border: 'border-slate-500/40'
    },
    {
      id: 'skill_prodigy',
      name: 'Skill Prodigy',
      desc: 'Achieve a Skill / Base ratio of 2.0x or higher',
      descRu: 'Соотношение Skill / Base более 2.0x при 5k+ Base PTS',
      icon: '📈',
      category: 'mastery',
      tier: 'diamond',
      current: Number(skillRatio.toFixed(2)),
      target: 2.0,
      unit: 'x',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/40'
    },
    {
      id: 'apex_predator',
      name: 'Apex Predator',
      desc: 'Achieve a Skill / Base ratio of 3.0x or higher',
      descRu: 'Соотношение Skill / Base более 3.0x (Apex скорость)',
      icon: '🚀',
      category: 'mastery',
      tier: 'legendary',
      current: Number(skillRatio.toFixed(2)),
      target: 3.0,
      unit: 'x',
      color: 'text-rose-400',
      bg: 'bg-rose-500/20',
      border: 'border-rose-500/50'
    },

    // --- Grind & Dedication ---
    {
      id: 'world_explorer',
      name: 'World Explorer',
      desc: 'Complete 1,000 or more unique DDNet maps',
      descRu: '1 000+ пройденных уникальных карт DDNet',
      icon: '🗺️',
      category: 'grind',
      tier: 'diamond',
      current: finishes.length,
      target: 1000,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/15',
      border: 'border-cyan-500/40'
    },
    {
      id: 'pathfinder',
      name: 'Pathfinder',
      desc: 'Complete 500 or more unique DDNet maps',
      descRu: '500+ пройденных уникальных карт DDNet',
      icon: '🧭',
      category: 'grind',
      tier: 'gold',
      current: finishes.length,
      target: 500,
      color: 'text-amber-400',
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/40'
    },
    {
      id: 'time_lord',
      name: 'Time Lord',
      desc: 'Accumulate 500+ estimated hours of gameplay',
      descRu: '500+ расчетных часов онлайна на картах',
      icon: '⏱️',
      category: 'grind',
      tier: 'diamond',
      current: playtimeHours,
      target: 500,
      unit: 'h',
      color: 'text-purple-400',
      bg: 'bg-purple-500/15',
      border: 'border-purple-500/40'
    },
    {
      id: 'dedicated_grinder',
      name: 'Dedicated Grinder',
      desc: 'Accumulate 100+ estimated hours of gameplay',
      descRu: '100+ расчетных часов онлайна на картах',
      icon: '☕',
      category: 'grind',
      tier: 'gold',
      current: playtimeHours,
      target: 100,
      unit: 'h',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/40'
    }
  ];

  return rawBadges.map(b => ({
    ...b,
    unlocked: b.current >= b.target
  }));
}

/**
 * Calculates metrics for a player's Radar Chart (Speed, Grind, Skill, Endurance).
 * @param {Object} playerData Player data
 * @returns {Array<number>} Array of normalized metrics [0.0 - 1.0] for the radar
 */
function getPlayerRadarStats(playerData) {
  const finishes = Array.isArray(playerData) ? playerData : (playerData?.finishDetails || []);
  if (finishes.length === 0) return [0, 0, 0, 0];

  // Speed: Average efficiency of top qualifying/speedrun finishes (capped at 1.0)
  const valid = finishes.filter(f => f.timeRatio && f.timeRatio >= 1.0);
  let speed = 0;
  if (valid.length > 0) {
    const sortedEff = valid.map(f => Math.min(1.0, 1.0 / f.timeRatio)).sort((a, b) => b - a);
    const topSample = sortedEff.slice(0, Math.max(5, Math.ceil(sortedEff.length * 0.5)));
    speed = topSample.reduce((acc, v) => acc + v, 0) / topSample.length;
  }

  // Endurance: high base PTS / brutal & insane maps performance
  let enduranceSum = 0;
  for (const f of finishes) {
    if (f.pBase > 0) {
      enduranceSum += Math.min(1.0, f.pBase / 25);
    }
  }
  const endurance = Math.min(1.0, enduranceSum / Math.max(1, Math.min(finishes.length, 300)));

  // Skill: Total Skill PTS vs Base PTS ratio mapped to [0, 1]
  const pBase = (playerData && playerData.newPtsBase) || finishes.reduce((a, f) => a + (f.pBase || 0), 0);
  const pSkill = (playerData && playerData.newPtsSkill) || finishes.reduce((a, f) => a + (f.pSkill || 0), 0);
  const skillRatio = pBase > 0 ? (pSkill / pBase) : 0;
  const skillNormalized = Math.min(1.0, skillRatio / 2.5); // 2.5x is top tier

  // Grind: Maps finished out of ~2400 total DDNet maps
  const totalMapsCount = (typeof window !== 'undefined' && window.mapsData && window.mapsData.length) || 2400;
  const grind = Math.min(1.0, finishes.length / totalMapsCount);

  return [
    Number(speed.toFixed(3)),
    Number(skillNormalized.toFixed(3)),
    Number(endurance.toFixed(3)),
    Number(grind.toFixed(3))
  ];
}

/**
 * Calculates win probability for a head-to-head matchup using an Elo-style formula.
 * @param {Object} p1 Player 1 data
 * @param {Object} p2 Player 2 data
 * @returns {Object} Win probabilities { p1Win: number, p2Win: number } in percentages
 */
function calculateWinProbability(p1, p2) {
  const score1 = (p1 && p1.newPtsTotal) || 0;
  const score2 = (p2 && p2.newPtsTotal) || 0;

  if (score1 === 0 && score2 === 0) {
    return { p1Win: 50, p2Win: 50 };
  }

  // DDNetMM PTS can reach 100k+. A 20k difference is significant.
  // We use 20000 as the Elo scaling factor (like 400 in standard Elo).
  const scale = 20000;
  const expected1 = 1 / (1 + Math.pow(10, (score2 - score1) / scale));
  const expected2 = 1 / (1 + Math.pow(10, (score1 - score2) / scale));

  return {
    p1Win: Math.round(expected1 * 1000) / 10,
    p2Win: Math.round(expected2 * 1000) / 10
  };
}

/**
 * Retrieves the global rank of a player based on the leaderboard data.
 * @param {string} playerName Name of the player
 * @returns {number|string} Rank integer or '>5000' if not found
 */
function getPlayerGlobalRank(playerName) {
  if (typeof window === 'undefined' || !window.leaderboardData) return '>5000';
  const lb = window.leaderboardData;
  const nameLower = String(playerName || '').toLowerCase();

  for (let i = 0; i < lb.length; i++) {
    if (String(lb[i].name).toLowerCase() === nameLower) {
      return i + 1;
    }
  }
  return '>5000';
}

/**
 * Calculates a player's server/mod specialization (Novice, Brutal, etc.)
 * Normalizes fragmented sub-servers (e.g. DDmaX.Pro/Next into DDmaX) and computes category completion stats.
 * @param {Object|Array} playerData Player data or finishes array
 * @returns {Array<Object>} Sorted array of server specializations
 */
function getPlayerServerSpecialization(playerData) {
  const finishes = Array.isArray(playerData) ? playerData : (playerData?.finishDetails || []);
  if (finishes.length === 0) return [];

  const normalizeServer = (srv) => {
    if (!srv) return 'Other';
    const s = String(srv).trim();
    const l = s.toLowerCase();
    if (l.startsWith('ddmax')) return 'DDmaX';
    if (l.includes('novice')) return 'Novice';
    if (l.includes('moderate')) return 'Moderate';
    if (l.includes('brutal')) return 'Brutal';
    if (l.includes('insane')) return 'Insane';
    if (l.includes('dummy')) return 'Dummy';
    if (l.includes('race')) return 'Race';
    if (l.includes('solo')) return 'Solo';
    if (l.includes('oldschool')) return 'Oldschool';
    if (l === 'fun') return null; // ignore 0-point fun runs
    if (l.includes('event')) return 'Event';
    return s;
  };

  const stats = {};
  for (const f of finishes) {
    const srv = normalizeServer(f.server);
    if (!srv) continue;
    if (!stats[srv]) stats[srv] = { server: srv, count: 0, pBase: 0, pSkill: 0, pTotal: 0 };
    stats[srv].count++;
    stats[srv].pBase += (f.pBase || 0);
    stats[srv].pSkill += (f.pSkill || 0);
    stats[srv].pTotal += ((f.pBase || 0) + (f.pSkill || 0));
  }

  // Count total maps in each category from mapsData to show completion %
  const allMaps = (typeof window !== 'undefined' && window.mapsData) || [];
  const categoryTotals = {};
  for (const m of allMaps) {
    const srv = normalizeServer(m.server);
    if (!srv) continue;
    categoryTotals[srv] = (categoryTotals[srv] || 0) + 1;
  }

  return Object.values(stats)
    .filter(s => s.pTotal > 0 || s.count > 0)
    .map(s => ({
      ...s,
      totalMaps: categoryTotals[s.server] || s.count,
      pct: Math.min(100, Math.round((s.count / Math.max(1, categoryTotals[s.server] || s.count)) * 100))
    }))
    .sort((a, b) => b.pTotal - a.pTotal);
}

/**
 * Calculates decayed Skill PTS for a given time ratio and strictness.
 * @param {number} basePts The map's base points
 * @param {number} strictness The map's strictness coefficient (s)
 * @param {number} timeRatio The player's time / WR time
 * @returns {number} The awarded Skill PTS (rounded down)
 */
function calculateDecayPts(basePts, strictness, timeRatio) {
  if (basePts <= 0 || strictness <= 0) return 0;
  const ratio = Math.max(1.0, timeRatio);
  return Math.floor((basePts * 5.0) * Math.exp(-strictness * (ratio - 1)));
}

/**
 * Calculates recent activity summary for the player over the last N days.
 * @param {Object} playerData The player's fetched data
 * @param {number} days The number of days to look back (default 7)
 * @returns {Array<Object>} Array of daily stats sorted from oldest to newest
 */
function getPlayerRecentActivity(playerData, days = 7) {
  const finishes = playerData.finishDetails || [];
  if (finishes.length === 0) return [];

  const now = Date.now();
  const cutoff = now - (days * 24 * 60 * 60 * 1000);

  const dailyStats = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - (i * 24 * 60 * 60 * 1000));
    const dateStr = d.toISOString().split('T')[0];
    dailyStats[dateStr] = { date: dateStr, count: 0, pTotal: 0, maps: [] };
  }

  for (const f of finishes) {
    if (!f.timestamp || (f.timestamp * 1000) < cutoff) continue;

    const d = new Date(f.timestamp * 1000);
    const dateStr = d.toISOString().split('T')[0];

    if (dailyStats[dateStr]) {
      dailyStats[dateStr].count++;
      dailyStats[dateStr].pTotal += ((f.pBase || 0) + (f.pSkill || 0));
      dailyStats[dateStr].maps.push(f.mapName);
    }
  }

  return Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Finds the hardest map (highest Base PTS / Difficulty category) the player has completed.
 * @param {Object|Array} playerData The player's fetched data or finishes array
 * @returns {Object|null} The finish object of the hardest map, or null if none
 */
function getHardestMapCompleted(playerData) {
  const finishes = Array.isArray(playerData) ? playerData : (playerData?.finishDetails || []);
  if (finishes.length === 0) return null;

  const categoryWeight = {
    'insane': 6,
    'brutal': 5,
    'dummy': 4,
    'oldschool': 3,
    'moderate': 2,
    'race': 2,
    'solo': 2,
    'ddmax': 2,
    'novice': 1,
  };

  let hardest = finishes[0];
  for (const f of finishes) {
    const curP = f.pBase || 0;
    const bestP = hardest.pBase || 0;
    if (curP > bestP) {
      hardest = f;
    } else if (curP === bestP) {
      const curCat = (f.server || '').toLowerCase();
      const bestCat = (hardest.server || '').toLowerCase();
      const curWeight = categoryWeight[curCat] || 0;
      const bestWeight = categoryWeight[bestCat] || 0;
      if (curWeight > bestWeight || (curWeight === bestWeight && (f.pSkill || 0) > (hardest.pSkill || 0))) {
        hardest = f;
      }
    }
  }
  return hardest;
}

/**
 * Calculates the average finish time of a given leaderboard (e.g. top 500).
 * @param {Array<Object>} leaderboard The map's leaderboard array
 * @returns {number|null} The average time in seconds, or null if no valid times
 */
function getMapAverageTime(leaderboard) {
  if (!leaderboard || !Array.isArray(leaderboard) || leaderboard.length === 0) return null;

  let totalTime = 0;
  let count = 0;

  for (const entry of leaderboard) {
    if (entry && entry.time > 0) {
      totalTime += entry.time;
      count++;
    }
  }

  if (count === 0) return null;
  return totalTime / count;
}

/**
 * Calculates player's map completion progress globally and per-category.
 * @param {Object} playerData The player's fetched data
 * @returns {Object} Completion stats
 */
function getPlayerCompletionProgress(playerData) {
  const finishes = playerData.finishDetails || [];
  const allMaps = window.mapsData || [];

  if (allMaps.length === 0) return null;

  const completedSet = new Set();
  finishes.forEach(f => completedSet.add(f.mapName.toLowerCase()));

  const completed = completedSet.size;
  const total = allMaps.length;
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return {
    completed,
    total,
    percentage
  };
}

/**
 * Determines the player's playstyle archetype based on their radar stats.
 * @param {Array<number>} radarStats Radar statistics array [speed, skill, endurance, grind]
 * @returns {Object} Archetype metadata
 */
function getPlayerArchetype(radarStats) {
  if (!radarStats || !Array.isArray(radarStats) || radarStats.length < 4) return { id: 'unknown', label: 'Unknown', color: 'text-slate-400', desc: 'Not enough data' };

  const [speed, skill, endurance, grind] = radarStats;

  if (speed >= 0.8 && skill >= 0.7) {
    return { id: 'speedrunner', label: 'Speed Demon', color: 'text-rose-400', desc: 'Extremely fast times and WR-focused playstyle' };
  }
  if (speed >= 0.6 && skill >= 0.6 && endurance >= 0.6 && grind >= 0.6) {
    return { id: 'versatile', label: 'All-Rounder', color: 'text-cyan-400', desc: 'Plays all server categories evenly with high skill' };
  }
  if (endurance >= 0.8) {
    return { id: 'marathoner', label: 'Marathoner', color: 'text-emerald-400', desc: 'Specializes in long and exhausting maps' };
  }
  if (grind >= 0.8) {
    return { id: 'grinder', label: 'Grinder', color: 'text-amber-400', desc: 'Consistent farmer of Base PTS across many maps' };
  }

  return { id: 'regular', label: 'Regular', color: 'text-slate-300', desc: 'Standard playstyle' };
}

/**
 * Generates and downloads a PNG profile card for the player (Discord-ready)
 * @param {Object} playerData Player data
 */
function generateProfileCard(playerData) {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 1000, 500);
  gradient.addColorStop(0, '#020617'); // slate-950
  gradient.addColorStop(0.5, '#0f172a'); // slate-900
  gradient.addColorStop(1, '#1e1b4b'); // indigo-950
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1000, 500);

  // Background Grid Pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1000; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 500); ctx.stroke(); }
  for (let y = 0; y <= 500; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1000, y); ctx.stroke(); }

  // Glass Panel Body
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)'; // amber border
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(40, 40, 920, 420, 20);
  ctx.fill();
  ctx.stroke();

  // Watermark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('DDNET MAP MASTERY', 940, 440);

  ctx.textAlign = 'left';

  // Tee Avatar
  try {
    const teeCanvas = document.querySelector('#player-tee-container canvas');
    if (teeCanvas) {
      // Glow behind tee
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 40;
      ctx.drawImage(teeCanvas, 60, 60, 160, 160);
      ctx.shadowBlur = 0; // reset
    }
  } catch (e) { console.error(e); }

  // Player Name
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 64px sans-serif';
  ctx.fillText(playerData.name, 250, 120);

  // Global Rank Badge
  const rank = getPlayerGlobalRank(playerData.name);
  const rankText = rank <= 5000 ? `#${rank}` : '>5000';
  ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(250 + ctx.measureText(playerData.name).width + 20, 70, ctx.measureText(rankText).width + 30, 50, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 24px sans-serif';
  ctx.fillText(rankText, 250 + ctx.measureText(playerData.name).width + 35, 105);

  // League & Archetype
  const league = getSkillLeague(playerData.newPtsBase, playerData.newPtsSkill);
  const archetype = getPlayerArchetype(playerData);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = league.color || '#a78bfa';
  ctx.fillText(league.id.toUpperCase(), 250, 160);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(` •  ${archetype.name.toUpperCase()}`, 250 + ctx.measureText(league.id.toUpperCase()).width, 160);

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.moveTo(250, 190);
  ctx.lineTo(920, 190);
  ctx.stroke();

  // Metrics Generator Helper
  const drawMetric = (x, y, label, value, color) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath(); ctx.roundRect(x, y, 200, 100, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.font = '900 14px sans-serif';
    ctx.fillText(label, x + 20, y + 35);
    ctx.fillStyle = color;
    ctx.font = '900 32px monospace';
    ctx.fillText(value, x + 20, y + 80);
  };

  const mastery = getMasteryLevel(playerData.newPtsTotal);
  const playtime = estimatePlaytime(playerData.finishDetails);

  drawMetric(250, 220, 'TOTAL MASTERY', playerData.newPtsTotal.toLocaleString(), '#f59e0b');
  drawMetric(470, 220, 'BASE PTS', playerData.newPtsBase.toLocaleString(), '#34d399');
  drawMetric(690, 220, 'SKILL PTS', playerData.newPtsSkill.toLocaleString(), '#c084fc');

  drawMetric(250, 340, 'LEVEL', `LVL ${mastery.level}`, '#38bdf8');
  drawMetric(470, 340, 'COMPLETED MAPS', `${playerData.finishDetails ? playerData.finishDetails.length : 0}`, '#e2e8f0');
  drawMetric(690, 340, 'EST. GRIND TIME', playtime > 0 ? `${(playtime / 3600).toFixed(1)} h` : '0 h', '#f43f5e');

  // Trigger Download
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${playerData.name}_profile_card.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Generates cumulative PTS timeline based on finish timestamps.
 * @param {Object} playerData Player data
 * @returns {Array<Object>} Sorted array of daily cumulative points { date, timestamp, pBase, pSkill, pTotal }
 */
function getPlayerProgressionTimeline(playerData) {
  const finishes = playerData.finishDetails || [];
  if (finishes.length === 0) return [];

  const validFinishes = finishes.filter(f => f.timestamp > 0);
  if (validFinishes.length === 0) return [];

  validFinishes.sort((a, b) => a.timestamp - b.timestamp);

  const timeline = [];
  let pBaseCum = 0;
  let pSkillCum = 0;

  for (const f of validFinishes) {
    pBaseCum += (f.pBase || 0);
    pSkillCum += (f.pSkill || 0);

    const dateStr = new Date(f.timestamp * 1000).toISOString().split('T')[0];

    if (timeline.length > 0 && timeline[timeline.length - 1].date === dateStr) {
      timeline[timeline.length - 1].pBase = pBaseCum;
      timeline[timeline.length - 1].pSkill = pSkillCum;
      timeline[timeline.length - 1].pTotal = pBaseCum + pSkillCum;
    } else {
      timeline.push({
        date: dateStr,
        timestamp: f.timestamp,
        pBase: pBaseCum,
        pSkill: pSkillCum,
        pTotal: pBaseCum + pSkillCum
      });
    }
  }

  return timeline;
}

/**
 * Calculates a Consistency Score (0.0 to 1.0) based on speed efficiency and dispersion.
 * Evaluates the player's consistent execution near World Record speeds across qualifying runs.
 * @param {Object|Array} playerData Player data or finishes array
 * @returns {number} Score from 0.0 to 1.0
 */
function getPlayerConsistencyScore(playerData) {
  const finishes = Array.isArray(playerData) ? playerData : (playerData?.finishDetails || []);
  if (finishes.length === 0) return 0.5;

  const valid = finishes.filter(f => f.timeRatio && f.timeRatio >= 1.0);
  if (valid.length < 3) return 0.5;

  // Speed efficiency E_i = 1 / timeRatio (clamped between 0.05 and 1.0)
  const efficiencies = valid.map(f => Math.max(0.05, Math.min(1.0, 1.0 / f.timeRatio)));
  efficiencies.sort((a, b) => b - a);

  // Focus on top 60% of finishes to avoid casual/afk runs ruining the consistency metric
  const sampleSize = Math.max(5, Math.ceil(efficiencies.length * 0.6));
  const sample = efficiencies.slice(0, sampleSize);

  const mean = sample.reduce((acc, v) => acc + v, 0) / sample.length;
  const variance = sample.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / sample.length;
  const stdDev = Math.sqrt(variance);

  // High consistency is a combination of low standard deviation and high average pace
  const stability = Math.max(0, 1.0 - (stdDev * 1.6));
  const pace = Math.pow(mean, 0.4);
  const score = Math.max(0.15, Math.min(0.99, (stability * 0.6) + (pace * 0.4)));

  return Number(score.toFixed(3));
}

/**
 * Estimates the player's total playtime in hours based on their map completions.
 * @param {Object|Array} playerData
 * @returns {number} Estimated playtime in hours
 */
function estimatePlaytime(playerData) {
  const finishes = Array.isArray(playerData) ? playerData : (playerData?.finishDetails || []);
  if (finishes.length === 0) return 0;

  let totalSeconds = 0;
  for (const m of finishes) {
    let mapTime = m.time;
    let multiplier = 2;
    if (m.pBase > 0) {
      multiplier = Math.pow(1.15, m.pBase);
    }
    const ratio = m.timeRatio || 1.5;
    const ratioMultiplier = Math.max(1, 2.0 / ratio);
    totalSeconds += mapTime * multiplier * ratioMultiplier;
  }

  return totalSeconds / 3600;
}

/**
 * Finds the closest player in PTS to the given player to suggest as a rival for PvP.
 * @param {Object} playerData
 * @returns {Object|null} Rival player object or null
 */
function getPlayerRival(playerData) {
  if (typeof window === 'undefined' || !window.leaderboardData) return null;

  const myPts = playerData.newPtsTotal;
  let closest = null;
  let minDiff = Infinity;

  for (const p of window.leaderboardData) {
    if (p.name === playerData.name) continue;

    const diff = Math.abs((p.newPtsTotal || 0) - myPts);
    // Suggest someone who is within a 1500 PTS gap, prioritizing the absolute closest
    if (diff < minDiff && diff < 1500) {
      minDiff = diff;
      closest = p;
    }
  }

  return closest;
}

/**
 * Returns the player's top N maps by Skill PTS score (highest pSkill earned).
 * @param {Object} playerData - Player data with finishDetails
 * @param {number} limit - Max number of results (default 5)
 * @returns {Array<Object>} Sorted list of top performances
 */
function getTopPerformances(playerData, limit = 5) {
  const finishes = (playerData.finishDetails || []).filter(f =>
    f.pSkill > 0 && f.pBase > 0
  );
  if (finishes.length === 0) return [];

  return finishes
    .map(f => ({
      mapName: f.mapName,
      server: f.server || '',
      pBase: f.pBase,
      pSkill: f.pSkill,
      time: f.time,
      rank: f.rank,
      skillRatio: f.pSkill / (f.pBase * (f.s || 1)),
    }))
    .sort((a, b) => b.pSkill - a.pSkill)
    .slice(0, limit);
}

/**
 * Computes top teammates/partners with whom the player earned the highest Skill PTS in shared finishes.
 * @param {Object|Array} playerData
 * @param {number} limit
 * @returns {Array<{name: string, totalSkillPts: number, mapCount: number, topMaps: Array<Object>}>}
 */
function getTopPartners(playerData, limit = 5) {
  const finishes = Array.isArray(playerData) ? playerData : (playerData?.finishDetails || []);
  const playerName = String(playerData?.name || '').toLowerCase();
  const partnerMap = new Map();

  finishes.forEach(finish => {
    if (!finish.pSkill || finish.pSkill <= 0) return;

    let partners = [];
    if (Array.isArray(finish.teamPartners) && finish.teamPartners.length > 0) {
      partners = finish.teamPartners.map(p => String(p).trim()).filter(Boolean);
    } else if (finish.teamPartner) {
      partners = finish.teamPartner.split(/&|,/).map(p => p.trim()).filter(Boolean);
    }

    partners.forEach(pName => {
      if (!pName || pName.toLowerCase() === playerName) return;
      const key = pName.toLowerCase();
      if (!partnerMap.has(key)) {
        partnerMap.set(key, {
          name: pName,
          totalSkillPts: 0,
          mapCount: 0,
          topMaps: []
        });
      }
      const data = partnerMap.get(key);
      data.totalSkillPts += finish.pSkill;
      data.mapCount += 1;
      if (data.topMaps.length < 3) {
        data.topMaps.push({
          mapName: finish.mapName,
          pSkill: finish.pSkill,
          server: finish.server
        });
      }
    });
  });

  return Array.from(partnerMap.values())
    .sort((a, b) => b.totalSkillPts - a.totalSkillPts || b.mapCount - a.mapCount)
    .slice(0, limit);
}

window.api = {
  fetchPlayerPts,
  getTopPlayersLive,
  getMapLeaderboardLive,
  getSkillLeague,
  getMasteryLevel,
  getUnderfarmedMaps,
  getPlayerBadges,
  getPlayerRadarStats,
  calculateWinProbability,
  getPlayerGlobalRank,
  getPlayerServerSpecialization,
  calculateDecayPts,
  getPlayerRecentActivity,
  getHardestMapCompleted,
  getMapAverageTime,
  getPlayerCompletionProgress,
  getPlayerArchetype,
  generateProfileCard,
  getPlayerConsistencyScore,
  getPlayerProgressionTimeline,
  estimatePlaytime,
  getPlayerRival,
  getTopPerformances,
  getTopPartners,
};

