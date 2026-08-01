import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const PLAYERS_DIR = path.join(DATA_DIR, 'players');

const BLACKLIST_TXT = path.join(ROOT_DIR, 'blacklist.txt');
const BLACKLIST_JS = path.join(DATA_DIR, 'blacklist.js');

const MAPS_RAW_FILE = path.join(DATA_DIR, 'maps_raw.json');
const MAPS_JS_FILE = path.join(DATA_DIR, 'maps.js');

const MAP_RECORDS_FILE = path.join(DATA_DIR, 'map_records.json');
const MAP_RECORDS_JS = path.join(DATA_DIR, 'map_records.js');

const MAP_STATS_FILE = path.join(DATA_DIR, 'map_stats.json');
const MAP_STATS_JS = path.join(DATA_DIR, 'map_stats.js');

const MAP_RANKINGS_FILE = path.join(DATA_DIR, 'map_rankings.json');
const MAP_RANKINGS_JS   = path.join(DATA_DIR, 'map_rankings.js');
const RANKINGS_DIR      = path.join(DATA_DIR, 'rankings');

const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
const LEADERBOARD_JS = path.join(DATA_DIR, 'leaderboard.js');

const UNIQUE_PLAYERS_JSON = path.join(DATA_DIR, 'unique_players.json');
const UNIQUE_PLAYERS_JS = path.join(DATA_DIR, 'unique_players.js');

const MAP_MIN_TIMES_TXT = path.join(ROOT_DIR, 'map_min_times.txt');
const MAP_MIN_TIMES_JS = path.join(DATA_DIR, 'map_min_times.js');

const IGNORED_FINISHES_TXT = path.join(ROOT_DIR, 'ignored_finishes.txt');
const IGNORED_FINISHES_JS = path.join(DATA_DIR, 'ignored_finishes.js');

const MAP_ENRICHED_JSON = path.join(DATA_DIR, 'map_enriched.json');
const MAP_ENRICHED_JS = path.join(DATA_DIR, 'map_enriched.js');

const CUSTOM_MAP_RECORDS_TXT = path.join(ROOT_DIR, 'custom_map_records.txt');
const CUSTOM_MAP_RECORDS_JS = path.join(DATA_DIR, 'custom_map_records.js');

if (!fs.existsSync(DATA_DIR))    fs.mkdirSync(DATA_DIR,    { recursive: true });
if (!fs.existsSync(PLAYERS_DIR)) fs.mkdirSync(PLAYERS_DIR, { recursive: true });
if (!fs.existsSync(RANKINGS_DIR)) fs.mkdirSync(RANKINGS_DIR, { recursive: true });


function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_');
}

// Safe filename for per-map ranking files (replaces spaces and special chars)
function safeRankingFilename(mapName) {
    return mapName.replace(/[^a-zA-Z0-9_\-.]/g, '_');
}


function loadBlacklist() {
    if (!fs.existsSync(BLACKLIST_TXT)) return new Set();
    const text = fs.readFileSync(BLACKLIST_TXT, 'utf8');
    const list = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'))
        .map(name => name.toLowerCase());
    return new Set(list);
}

function parseTimeToSeconds(timeStr) {
    if (!timeStr) return 0;
    if (typeof timeStr === 'number') return timeStr;
    const str = String(timeStr).trim();
    if (str.includes(':')) {
        const parts = str.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
    }
    return parseFloat(str) || 0;
}

function loadMapMinTimes() {
    const mapMinTimes = {};
    if (!fs.existsSync(MAP_MIN_TIMES_TXT)) return mapMinTimes;
    const lines = fs.readFileSync(MAP_MIN_TIMES_TXT, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
        const parts = trimmed.split('|');
        if (parts.length >= 2) {
            const mName = parts[0].trim().toLowerCase();
            const minSec = parseTimeToSeconds(parts[1]);
            if (minSec > 0) {
                mapMinTimes[mName] = minSec;
            }
        }
    }
    return mapMinTimes;
}

function loadIgnoredFinishes() {
    const set = new Set();
    if (!fs.existsSync(IGNORED_FINISHES_TXT)) return set;
    const lines = fs.readFileSync(IGNORED_FINISHES_TXT, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
        const parts = trimmed.split('|');
        if (parts.length >= 2) {
            const pName = parts[0].trim().toLowerCase();
            const mName = parts[1].trim().toLowerCase();
            set.add(`${pName}|${mName}`);
        }
    }
    return set;
}

function loadCustomMapRecords() {
    const customRecords = {};
    if (!fs.existsSync(CUSTOM_MAP_RECORDS_TXT)) return customRecords;
    const lines = fs.readFileSync(CUSTOM_MAP_RECORDS_TXT, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
        const parts = trimmed.split('|');
        if (parts.length >= 2) {
            const mName = parts[0].trim().toLowerCase();
            const timeSec = parseTimeToSeconds(parts[1]);
            const pName = parts[2] ? parts[2].trim() : 'Unknown';
            if (timeSec > 0) {
                customRecords[mName] = { time: timeSec, player: pName, mapName: parts[0].trim() };
            }
        }
    }
    return customRecords;
}

function fetchJson(url) {
    return new Promise((resolve) => {
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 MapMastery Crawler' }, timeout: 6000 }, (res) => {
            if (res.statusCode !== 200) return resolve(null);
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
            });
        });
        req.on('timeout', () => { req.destroy(); resolve(null); });
        req.on('error', () => resolve(null));
    });
}

function calcMapStats(times) {
    const n = times.length;
    if (n === 0) return { s: 2.0 };
    if (n === 1) return { s: 3.0 };
    const mean = times.reduce((a,b)=>a+b,0) / n;
    const variance = times.reduce((a,b)=>a + Math.pow(b - mean, 2), 0) / n;
    const stdev = Math.sqrt(variance);
    const cv = stdev / mean;
    let s = 3.0 - ((cv - 0.01) / 0.49) * 2.5;
    if (s > 3.0) s = 3.0;
    if (s < 0.5) s = 0.5;
    return { mean, stdev, cv, s };
}

function calculatePlayerPoints(playerData, mapRecords, mapStats, blacklistSet) {
    let oldPts = 0;
    let newPtsBase = 0;
    let newPtsSkill = 0;
    const processedMaps = new Set();

    const finishes = playerData.finishes || [];
    for (const finish of finishes) {
        const mapName = finish.map.name || finish.map.map;
        if (processedMaps.has(mapName)) continue;
        if (finish.map.server === 'Fun') continue;
        processedMaps.add(mapName);

        const mapPts = finish.map.points || 0;
        oldPts += mapPts;
        newPtsBase += mapPts;

        const isSoloOrRace = finish.map.server === 'Solo' || finish.map.server === 'Race';
        const isTeamRun = finish.team_rank && finish.rank >= finish.team_rank;
        
        if (isSoloOrRace || isTeamRun) {
            let tBest = mapRecords[mapName];
            if (!tBest) {
                const rank = finish.rank || 1;
                tBest = finish.time / (1 + Math.log10(Math.max(1, rank)) * 0.5);
            }
            
            const stats = mapStats[mapName] || { s: 2.0 };
            const s = stats.s;
            const pMaxBonus = mapPts * 5.0;
            const timeRatio = finish.time / tBest;
            const pSkill = Math.floor(pMaxBonus * Math.exp(-s * (Math.max(1, timeRatio) - 1)));
            newPtsSkill += pSkill;
        }
    }
    
    return {
        oldPts,
        newPtsBase,
        newPtsSkill,
        newPtsTotal: newPtsBase + newPtsSkill,
    };
}

function isFinishAllowed(pName, mName, timeSec, blacklistSet, mapMinTimes, ignoredFinishesSet) {
    if (!pName || !mName) return false;
    const pLower = String(pName).trim().toLowerCase();
    const mLower = String(mName).trim().toLowerCase();

    if (blacklistSet.has(pLower)) return false;
    if (ignoredFinishesSet.has(`${pLower}|${mLower}`)) return false;
    if (mapMinTimes[mLower] && timeSec < mapMinTimes[mLower]) return false;

    return true;
}

async function run() {
    console.log("=== 1. Loading Blacklist & Rules ===");
    const blacklistSet = loadBlacklist();
    const blacklistArray = Array.from(blacklistSet);
    console.log(`Loaded ${blacklistSet.size} blacklisted players.`);

    const mapMinTimes = loadMapMinTimes();
    console.log(`Loaded min times for ${Object.keys(mapMinTimes).length} maps:`, mapMinTimes);

    const ignoredFinishesSet = loadIgnoredFinishes();
    console.log(`Loaded ${ignoredFinishesSet.size} ignored finish exceptions.`);

    const customMapRecords = loadCustomMapRecords();
    console.log(`Loaded ${Object.keys(customMapRecords).length} custom map records:`, customMapRecords);

    // Save JS files
    const blacklistJsContent = `// Blacklist of cheaters/TASers loaded locally\nwindow.blacklistData = ${JSON.stringify(blacklistArray, null, 2)};\n\nwindow.isBlacklisted = function(name) {\n  if (!name || !window.blacklistData || !window.blacklistData.length) return false;\n  const lower = String(name).toLowerCase().trim();\n  return window.blacklistData.some(b => String(b).toLowerCase().trim() === lower);\n};\n`;
    fs.writeFileSync(BLACKLIST_JS, blacklistJsContent);

    fs.writeFileSync(MAP_MIN_TIMES_JS, `window.mapMinTimesData = ${JSON.stringify(mapMinTimes, null, 2)};\n`);
    
    const ignoredArray = Array.from(ignoredFinishesSet);
    fs.writeFileSync(IGNORED_FINISHES_JS, `window.ignoredFinishesData = ${JSON.stringify(ignoredArray, null, 2)};\n\nwindow.isIgnoredFinish = function(player, map) {\n  if (!player || !map) return false;\n  const key = String(player).trim().toLowerCase() + '|' + String(map).trim().toLowerCase();\n  return window.ignoredFinishesData && window.ignoredFinishesData.includes(key);\n};\n`);

    fs.writeFileSync(CUSTOM_MAP_RECORDS_JS, `window.customMapRecordsData = ${JSON.stringify(customMapRecords, null, 2)};\n`);

    console.log("\n=== 2. Fetching Maps List ===");
    const allMaps = await fetchJson('https://ddstats.tw/maps/json');
    if (!allMaps || !Array.isArray(allMaps)) {
        console.error("Failed to fetch maps list");
        return;
    }
    fs.writeFileSync(MAPS_RAW_FILE, JSON.stringify(allMaps, null, 2));
    fs.writeFileSync(MAPS_JS_FILE, 'window.mapsData = ' + JSON.stringify(allMaps) + ';');
    console.log(`Saved ${allMaps.length} maps into maps_raw.json & maps.js`);

    console.log("\n=== 3. Fetching Map Rankings & World Records (Filtering Blacklist & Limits) ===");
    const mapRecords = {};
    const mapRankings = {};
    const mapRawTopFlooded = {};
    const CONCURRENCY = 10;

    for (let i = 0; i < allMaps.length; i += CONCURRENCY) {
        const batch = allMaps.slice(i, i + CONCURRENCY);
        const promises = batch.map(async (m) => {
            const mapName = m.map;
            const data = await fetchJson(`https://ddstats.tw/map/json?map=${encodeURIComponent(mapName)}`);
            if (!data || !data.rankings) return;

            // Check if DDStats raw top rankings were heavily filtered out
            const raw = data.rankings || [];
            const validRankings = raw.filter(r => r && r.name && isFinishAllowed(r.name, mapName, r.time, blacklistSet, mapMinTimes, ignoredFinishesSet));

            if (raw.length > 0 && validRankings.length < Math.min(raw.length, 10)) {
                mapRawTopFlooded[mapName] = true;
            }
            
            if (validRankings.length > 0) {
                mapRecords[mapName] = validRankings[0].time;
                mapRankings[mapName] = validRankings.slice(0, 100).map((r, index) => ({
                    rank: index + 1,
                    player: r.name,
                    time: r.time
                }));
            } else {
                mapRecords[mapName] = null;
                mapRankings[mapName] = [];
            }
        });

        await Promise.all(promises);
        if (i > 0 && i % 200 === 0) {
            console.log(`Fetched ${i}/${allMaps.length} map rankings...`);
        }
    }

    fs.writeFileSync(MAP_RECORDS_FILE, JSON.stringify(mapRecords, null, 2));
    fs.writeFileSync(MAP_RECORDS_JS, 'window.mapRecordsData = ' + JSON.stringify(mapRecords) + ';');

    fs.writeFileSync(MAP_RANKINGS_FILE, JSON.stringify(mapRankings, null, 2));
    fs.writeFileSync(MAP_RANKINGS_JS, 'window.mapRankingsData = ' + JSON.stringify(mapRankings) + ';');
    console.log(`Saved map_records and map_rankings for ${Object.keys(mapRecords).length} maps`);

    console.log("\n=== 3.5. Enriching Maps Flooded by TASers with Top Players Finishes ===");
    const enrichedMaps = {};
    if (fs.existsSync(LEADERBOARD_FILE)) {
        const lb = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
        const topPlayers = lb.filter(p => !blacklistSet.has(p.name.toLowerCase())).slice(0, 150);
        
        console.log(`Fetching finishes for ${topPlayers.length} legitimate players...`);
        let enrichedCount = 0;

        for (let i = 0; i < topPlayers.length; i += CONCURRENCY) {
            const batch = topPlayers.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(async (p) => {
                const localFile = path.join(PLAYERS_DIR, `${sanitizeFilename(p.name)}.json`);
                let pData = null;
                if (fs.existsSync(localFile)) {
                    try { pData = JSON.parse(fs.readFileSync(localFile, 'utf8')); } catch (e) {}
                }
                if (!pData) {
                    pData = await fetchJson(`https://ddstats.tw/player/json?player=${encodeURIComponent(p.name)}`);
                    if (pData) {
                        try { fs.writeFileSync(localFile, JSON.stringify(pData)); } catch (e) {}
                    }
                }
                if (!pData || !pData.finishes) return;

                for (const f of pData.finishes) {
                    if (!f.map || !f.map.map || !f.time) continue;
                    const mName = f.map.map;
                    const pTime = f.time;

                    if (!isFinishAllowed(p.name, mName, pTime, blacklistSet, mapMinTimes, ignoredFinishesSet)) continue;

                    if (!mapRankings[mName]) mapRankings[mName] = [];
                    
                    mapRankings[mName].push({
                        player: p.name,
                        name: p.name,
                        time: pTime
                    });
                }
            }));
        }

        // Clean, deduplicate, sort, and re-rank all map rankings
        for (const mName in mapRankings) {
            let list = mapRankings[mName] || [];
            
            // Filter blacklisted players & rules
            list = list.filter(r => isFinishAllowed(r.player || r.name, mName, r.time, blacklistSet, mapMinTimes, ignoredFinishesSet));

            // Deduplicate by player (keep fastest time)
            const playerBest = new Map();
            for (const r of list) {
                const pname = (r.player || r.name).toLowerCase();
                if (!playerBest.has(pname) || r.time < playerBest.get(pname).time) {
                    playerBest.set(pname, r);
                }
            }

            let cleanList = Array.from(playerBest.values());
            
            const mLower = mName.toLowerCase();
            if (customMapRecords[mLower]) {
                const custom = customMapRecords[mLower];
                const existingIdx = cleanList.findIndex(r => (r.player || r.name).toLowerCase() === custom.player.toLowerCase());
                if (existingIdx !== -1) {
                    cleanList[existingIdx].time = custom.time;
                } else {
                    cleanList.push({ player: custom.player, time: custom.time });
                }
            }

            cleanList.sort((a, b) => a.time - b.time);

            // Re-assign ranks 1, 2, 3...
            cleanList.forEach((item, idx) => {
                item.rank = idx + 1;
                item.player = item.name || item.player;
                delete item.name;
            });

            mapRankings[mName] = cleanList;

            // Flag map as enriched if it had min times, ignored finishes, custom records, or raw top flooded
            const hasCustomRecord = !!customMapRecords[mLower];
            const hasMinTimeLimit = !!mapMinTimes[mLower];
            const hasIgnoredFinish = Array.from(ignoredFinishesSet).some(s => s.endsWith(`|${mLower}`));
            if (hasMinTimeLimit || hasIgnoredFinish || hasCustomRecord || mapRawTopFlooded[mName]) {
                enrichedMaps[mName] = true;
            }

            if (hasCustomRecord) {
                mapRecords[mName] = customMapRecords[mLower].time;
            } else if (cleanList.length > 0) {
                const newWr = cleanList[0].time;
                if (mapRecords[mName] !== newWr) {
                    mapRecords[mName] = newWr;
                    enrichedCount++;
                }
            } else {
                mapRecords[mName] = null;
            }
        }

        console.log(`Enriched and re-ranked ${Object.keys(mapRankings).length} maps (${enrichedCount} records updated)!`);

        fs.writeFileSync(MAP_RECORDS_FILE, JSON.stringify(mapRecords, null, 2));
        fs.writeFileSync(MAP_RECORDS_JS, 'window.mapRecordsData = ' + JSON.stringify(mapRecords) + ';');

        // Write monolithic map_rankings.js for backward compat
        fs.writeFileSync(MAP_RANKINGS_FILE, JSON.stringify(mapRankings, null, 2));
        fs.writeFileSync(MAP_RANKINGS_JS, '// Legacy file kept for backward compatibility. Use data/rankings/*.js instead.\n// window.mapRankingsData is NOT populated to save memory.\n');

        // Write per-map ranking files into data/rankings/
        let perMapCount = 0;
        for (const [mName, rankings] of Object.entries(mapRankings)) {
            if (!rankings || rankings.length === 0) continue;
            const safe = safeRankingFilename(mName);
            const filePath = path.join(RANKINGS_DIR, `${safe}.js`);
            const content = `window.mapRankingCurrent = ${JSON.stringify(rankings)};\n`;
            fs.writeFileSync(filePath, content);
            perMapCount++;
        }
        console.log(`Written ${perMapCount} per-map ranking files into data/rankings/`);

        fs.writeFileSync(MAP_ENRICHED_JSON, JSON.stringify(enrichedMaps, null, 2));
        fs.writeFileSync(MAP_ENRICHED_JS, 'window.enrichedMapsData = ' + JSON.stringify(enrichedMaps, null, 2) + ';\n');
    }

    console.log("\n=== 4. Re-calculating Global Leaderboard ===");
    let leaderboard = [];
    if (fs.existsSync(LEADERBOARD_FILE)) {
        const existingLb = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
        const mapStats = fs.existsSync(MAP_STATS_FILE) ? JSON.parse(fs.readFileSync(MAP_STATS_FILE, 'utf8')) : {};
        
        for (const p of existingLb) {
            if (blacklistSet.has(String(p.name).toLowerCase())) continue;
            leaderboard.push(p);
        }
    }
    leaderboard.sort((a, b) => b.newPtsTotal - a.newPtsTotal);
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
    fs.writeFileSync(LEADERBOARD_JS, 'window.leaderboardData = ' + JSON.stringify(leaderboard) + ';');

    if (fs.existsSync(UNIQUE_PLAYERS_JSON)) {
        const uniquePlayers = JSON.parse(fs.readFileSync(UNIQUE_PLAYERS_JSON, 'utf8'));
        fs.writeFileSync(UNIQUE_PLAYERS_JS, 'window.uniquePlayersData = ' + JSON.stringify(uniquePlayers) + ';');
        console.log(`Saved ${uniquePlayers.length} unique players into unique_players.js`);
    }

    console.log(`Finished! Final leaderboard size: ${leaderboard.length} players.`);
}

run();
