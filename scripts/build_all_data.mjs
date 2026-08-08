import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { updateBlacklistData } from './build_blacklist_data.mjs';

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
const MAP_RANKINGS_JS = path.join(DATA_DIR, 'map_rankings.js');
const RANKINGS_DIR = path.join(DATA_DIR, 'rankings');

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

const PLAYER_LIST_TXT = path.join(ROOT_DIR, 'player_list.txt');
const MAPS_CACHE_DIR = path.join(DATA_DIR, 'maps_cache');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PLAYERS_DIR)) fs.mkdirSync(PLAYERS_DIR, { recursive: true });
if (!fs.existsSync(RANKINGS_DIR)) fs.mkdirSync(RANKINGS_DIR, { recursive: true });
if (!fs.existsSync(MAPS_CACHE_DIR)) fs.mkdirSync(MAPS_CACHE_DIR, { recursive: true });


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

function loadPlayerList(blacklistSet) {
    if (!fs.existsSync(PLAYER_LIST_TXT)) {
        console.warn('⚠ player_list.txt not found — falling back to leaderboard.json');
        if (fs.existsSync(LEADERBOARD_FILE)) {
            const lb = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
            return lb.filter(p => !blacklistSet.has(p.name.toLowerCase())).slice(0, 500).map(p => ({ name: p.name }));
        }
        return [];
    }
    const text = fs.readFileSync(PLAYER_LIST_TXT, 'utf8');
    const lines = text.split('\n');
    let removedCount = 0;

    const cleanedLines = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return true;
        if (blacklistSet.has(trimmed.toLowerCase())) {
            removedCount++;
            return false;
        }
        return true;
    });

    if (removedCount > 0) {
        fs.writeFileSync(PLAYER_LIST_TXT, cleanedLines.join('\n'));
        console.log(`🧹 Automatically removed ${removedCount} blacklisted player(s) directly from player_list.txt!`);
    }

    // Purge cached profile JSONs for all blacklisted players
    for (const bPlayer of blacklistSet) {
        const jsonFile = path.join(PLAYERS_DIR, `${sanitizeFilename(bPlayer)}.json`);
        if (fs.existsSync(jsonFile)) {
            try { fs.unlinkSync(jsonFile); } catch (e) {}
        }
    }

    const names = cleanedLines
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#') && !line.startsWith('//'))
        .filter((name, idx, arr) => arr.indexOf(name) === idx);

    return names.map(name => ({ name }));
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
            let timeSec = 0;
            let pStr = '';
            if (parts.length >= 3) {
                timeSec = parseTimeToSeconds(parts[1]);
                pStr = parts[2] ? parts[2].trim() : '';
            } else {
                pStr = parts[1] ? parts[1].trim() : '';
            }
            const players = pStr.split(/[,/&]+/).map(p => p.trim()).filter(Boolean);
            if (players.length > 0) {
                customRecords[mName] = {
                    time: timeSec,
                    player: pStr,
                    players: players.length ? players : [pStr],
                    mapName: parts[0].trim()
                };
            }
        }
    }
    return customRecords;
}

async function resolveCustomRecords(customMapRecords) {
    for (const mLower in customMapRecords) {
        const custom = customMapRecords[mLower];
        if (!custom.players || !custom.players.length) continue;

        const mainPlayer = custom.players[0];
        const localFile = path.join(PLAYERS_DIR, `${sanitizeFilename(mainPlayer)}.json`);
        let pData = null;

        if (fs.existsSync(localFile)) {
            try { pData = JSON.parse(fs.readFileSync(localFile, 'utf8')); } catch (e) {}
        }

        if (!pData) {
            pData = await fetchJson(`https://ddstats.tw/player/json?player=${encodeURIComponent(mainPlayer)}`);
            if (pData) {
                try { fs.writeFileSync(localFile, JSON.stringify(pData)); } catch (e) {}
            }
        }

        if (pData && pData.finishes) {
            const f = pData.finishes.find(item => item.map && item.map.map && item.map.map.toLowerCase() === mLower);
            if (f && f.time) {
                // Dynamically fetch player's latest best finish time from DDStats
                if (custom.time === 0 || f.time < custom.time) {
                    custom.time = f.time;
                }
                if (f.team_rank && Array.isArray(f.team_rank.players) && f.team_rank.players.length > 0) {
                    custom.players = f.team_rank.players;
                    custom.player = f.team_rank.players.join(' & ');
                }
            }
        }
    }
}

let apiCallCount = 0;
let consecutiveBlockedCount = 0;

function fetchJson(url, retries = 1) {
    apiCallCount++;
    return new Promise((resolve) => {
        const executeFetch = (attempt) => {
            const req = https.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 MapMastery/2.0'
                },
                timeout: 5000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const isBlockedStatus = res.statusCode === 403 || res.statusCode === 429 || res.statusCode === 503;
                    const isBlockedBody = data.includes('Blocked.') || data.includes('furo@posteo.net') || data.includes('Access denied');

                    if (isBlockedStatus || isBlockedBody) {
                        consecutiveBlockedCount++;
                        console.error(`\n⛔ DDStats API Blocked / Rate-Limited! (HTTP ${res.statusCode}): ${url}`);
                        if (data.includes('furo@posteo.net')) {
                            console.error(`🛑 DDStats message: "Blocked. E-mail furo@posteo.net if this was a mistake."`);
                        }

                        if (consecutiveBlockedCount >= 3) {
                            console.error(`\n💥 ОШИБКА: DDStats API заблокировал IP (HTTP ${res.statusCode})!`);
                            console.error(`🔌 Включай VPN, ёпта! Скрипт остановлен, чтобы не спамить.`);
                            process.exit(1);
                        }

                        if (res.statusCode === 429 && attempt < retries) {
                            const delay = (attempt + 1) * 2000;
                            console.warn(`⏳ Rate limited (429). Waiting ${delay}ms...`);
                            setTimeout(() => executeFetch(attempt + 1), delay);
                            return;
                        }
                        return resolve(null);
                    }

                    // Reset count on non-blocked successful response
                    consecutiveBlockedCount = 0;

                    if (res.statusCode !== 200) return resolve(null);

                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch (e) {
                        resolve(null);
                    }
                });
            });

            req.on('timeout', () => {
                req.destroy();
                if (attempt < retries) {
                    setTimeout(() => executeFetch(attempt + 1), 1000);
                } else {
                    resolve(null);
                }
            });

            req.on('error', () => {
                if (attempt < retries) {
                    setTimeout(() => executeFetch(attempt + 1), 1000);
                } else {
                    resolve(null);
                }
            });
        };

        executeFetch(0);
    });
}

function calcMapStats(times) {
    const n = times.length;
    if (n === 0) return { s: 2.0 };
    if (n === 1) return { s: 3.0 };
    const mean = times.reduce((a, b) => a + b, 0) / n;
    const variance = times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdev = Math.sqrt(variance);
    const cv = stdev / mean;
    let s = 3.0 - ((cv - 0.01) / 0.49) * 2.5;
    if (s > 3.0) s = 3.0;
    if (s < 0.5) s = 0.5;
    return { mean, stdev, cv, s };
}

function isQualifyingRun(server, rank, teamRank) {
    if (!server) return false;
    const s = String(server).trim();
    if (s.toLowerCase() === 'fun') return false;
    if (s === 'Solo' || s === 'Race' || s === 'Dummy') {
        return true;
    }
    return Boolean(teamRank && rank >= teamRank);
}

function calculatePlayerPoints(playerData, mapRecords, mapStats, blacklistSet) {
    let oldPts = 0;
    let newPtsBase = 0;
    let newPtsSkill = 0;
    const processedMaps = new Set();

    const finishes = playerData.finishes || [];
    for (const finish of finishes) {
        const mapName = finish.map.name || finish.map.map;
        const server = finish.map.server;
        if (!server || server.toLowerCase() === 'fun') continue;
        if (processedMaps.has(mapName)) continue;
        processedMaps.add(mapName);

        const mapPts = finish.map.points || 0;
        oldPts += mapPts;
        newPtsBase += mapPts;

        if (isQualifyingRun(server, finish.rank, finish.team_rank)) {
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
    const mLower = String(mName).trim().toLowerCase();

    if (mapMinTimes[mLower] && timeSec < mapMinTimes[mLower]) return false;

    // Check all players in team (e.g. "PlayerA & PlayerB").
    // If ANY player in the team is blacklisted or has ignored finish exception, reject the finish!
    const playerList = String(pName).split(/[,/&]+/).map(p => p.trim()).filter(Boolean);
    for (const p of playerList) {
        const pLower = p.toLowerCase();
        if (blacklistSet.has(pLower)) return false;
        if (ignoredFinishesSet.has(`${pLower}|${mLower}`)) return false;
    }

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
    await resolveCustomRecords(customMapRecords);
    console.log(`Loaded & resolved ${Object.keys(customMapRecords).length} custom map records:`, customMapRecords);

    // Save JS files
    const blacklistJsContent = `// Blacklist of cheaters/TASers loaded locally\nwindow.blacklistData = ${JSON.stringify(blacklistArray, null, 2)};\n\nwindow.isBlacklisted = function(name) {\n  if (!name || !window.blacklistData || !window.blacklistData.length) return false;\n  const lower = String(name).toLowerCase().trim();\n  return window.blacklistData.some(b => String(b).toLowerCase().trim() === lower);\n};\n`;
    fs.writeFileSync(BLACKLIST_JS, blacklistJsContent);

    fs.writeFileSync(MAP_MIN_TIMES_JS, `window.mapMinTimesData = ${JSON.stringify(mapMinTimes, null, 2)};\n`);

    const ignoredArray = Array.from(ignoredFinishesSet);
    fs.writeFileSync(IGNORED_FINISHES_JS, `window.ignoredFinishesData = ${JSON.stringify(ignoredArray, null, 2)};\n\nwindow.isIgnoredFinish = function(player, map) {\n  if (!player || !map) return false;\n  const key = String(player).trim().toLowerCase() + '|' + String(map).trim().toLowerCase();\n  return window.ignoredFinishesData && window.ignoredFinishesData.includes(key);\n};\n`);

    fs.writeFileSync(CUSTOM_MAP_RECORDS_JS, `window.customMapRecordsData = ${JSON.stringify(customMapRecords, null, 2)};\n`);

    console.log("\n=== 2. Fetching Maps List ===");
    let allMaps = null;
    const args = process.argv.slice(2);
    const isFastMode = args.includes('--fast');

    if (isFastMode && fs.existsSync(MAPS_RAW_FILE)) {
        try {
            allMaps = JSON.parse(fs.readFileSync(MAPS_RAW_FILE, 'utf8'));
            console.log(`⚡ [--fast mode] Loaded ${allMaps.length} maps from local maps_raw.json cache.`);
        } catch (e) { }
    }

    if (!allMaps) {
        allMaps = await fetchJson('https://ddstats.tw/maps/json');
        if ((!allMaps || !Array.isArray(allMaps)) && fs.existsSync(MAPS_RAW_FILE)) {
            console.warn("⚠ Could not fetch live maps list from DDStats. Falling back to local maps_raw.json cache.");
            try { allMaps = JSON.parse(fs.readFileSync(MAPS_RAW_FILE, 'utf8')); } catch (e) { }
        }
    }

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
    const harvestedTeammates = new Set();

    for (let i = 0; i < allMaps.length; i += CONCURRENCY) {
        const batch = allMaps.slice(i, i + CONCURRENCY);
        const promises = batch.map(async (m) => {
            const mapName = m.map;
            const safeName = safeRankingFilename(mapName);
            const localCacheFile = path.join(MAPS_CACHE_DIR, `${safeName}.json`);

            const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
            let data = null;

            if (fs.existsSync(localCacheFile)) {
                try {
                    const stats = fs.statSync(localCacheFile);
                    if (isFastMode || Date.now() - stats.mtimeMs < THREE_DAYS_MS) {
                        data = JSON.parse(fs.readFileSync(localCacheFile, 'utf8'));
                    }
                } catch (e) { }
            }

            if (!data && !isFastMode) {
                data = await fetchJson(`https://ddstats.tw/map/json?map=${encodeURIComponent(mapName)}`);
                if (data) {
                    try { fs.writeFileSync(localCacheFile, JSON.stringify(data)); } catch (e) { }
                } else if (fs.existsSync(localCacheFile)) {
                    try { data = JSON.parse(fs.readFileSync(localCacheFile, 'utf8')); } catch (e) { }
                }
            }

            if (!data || !data.rankings) return;

            // Prefer team_rankings for team category maps
            const rawTeam = data.team_rankings || [];
            const validTeamRankings = rawTeam.filter(r => {
                if (!r) return false;
                const playerList = r.players || [r.name || r.player];
                if (m.server === 'Dummy' && playerList.length > 2) return false; // Reject bugged practice mode finishes (>2 players on Dummy map)
                return playerList.every(p => p && isFinishAllowed(p, mapName, r.time, blacklistSet, mapMinTimes, ignoredFinishesSet));
            });

            // Harvest valid non-blacklisted team partners
            for (const r of validTeamRankings) {
                if (r.players && Array.isArray(r.players)) {
                    for (const p of r.players) {
                        const cleanP = p.trim();
                        if (cleanP && !blacklistSet.has(cleanP.toLowerCase())) {
                            harvestedTeammates.add(cleanP);
                        }
                    }
                }
            }

            const rawSolo = data.rankings || [];
            const validSoloRankings = rawSolo.filter(r => r && r.name && isFinishAllowed(r.name, mapName, r.time, blacklistSet, mapMinTimes, ignoredFinishesSet));

            if (rawSolo.length > 0 && validSoloRankings.length < Math.min(rawSolo.length, 10)) {
                mapRawTopFlooded[mapName] = true;
            }

            if (validSoloRankings.length > 0 || validTeamRankings.length > 0) {
                if (m.server === 'Dummy') {
                    // Combine both solo and team rankings for Dummy category maps
                    const combined = [
                        ...validSoloRankings.map(r => ({
                            player: r.name,
                            time: r.time,
                            timestamp: r.timestamp || null,
                            isTeamRank: false
                        })),
                        ...validTeamRankings.map(r => ({
                            player: Array.isArray(r.players) ? r.players.join(' & ') : (r.player || r.name),
                            time: r.time,
                            timestamp: r.timestamp || null,
                            isTeamRank: true
                        }))
                    ];
                    combined.sort((a, b) => a.time - b.time);

                    mapRecords[mapName] = combined[0] ? combined[0].time : null;
                    mapRankings[mapName] = combined.slice(0, 500).map((r, index) => ({
                        rank: index + 1,
                        player: r.player,
                        time: r.time,
                        timestamp: r.timestamp,
                        isTeamRank: r.isTeamRank
                    }));
                } else if (validTeamRankings.length > 0 && m.server !== 'Solo' && m.server !== 'Race') {
                    mapRecords[mapName] = validTeamRankings[0].time;
                    mapRankings[mapName] = validTeamRankings.slice(0, 500).map((r, index) => ({
                        rank: r.rank || index + 1,
                        player: Array.isArray(r.players) ? r.players.join(' & ') : (r.player || r.name),
                        time: r.time,
                        timestamp: r.timestamp || null,
                        isTeamRank: true
                    }));
                } else {
                    mapRecords[mapName] = validSoloRankings[0] ? validSoloRankings[0].time : null;
                    mapRankings[mapName] = validSoloRankings.slice(0, 500).map((r, index) => ({
                        rank: index + 1,
                        player: r.name,
                        time: r.time,
                        timestamp: r.timestamp || null
                    }));
                }
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

    if (fs.existsSync(PLAYER_LIST_TXT) && harvestedTeammates.size > 0) {
        const existingLines = fs.readFileSync(PLAYER_LIST_TXT, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
        const existingSet = new Set(existingLines.map(l => l.toLowerCase()));
        const newAdded = [];
        for (const pName of harvestedTeammates) {
            if (!existingSet.has(pName.toLowerCase())) {
                existingSet.add(pName.toLowerCase());
                newAdded.push(pName);
            }
        }
        if (newAdded.length > 0) {
            fs.appendFileSync(PLAYER_LIST_TXT, '\n' + newAdded.join('\n'));
            console.log(`➕ Auto-harvested ${newAdded.length} legitimate teammates into player_list.txt!`);
        }
    }

    fs.writeFileSync(MAP_RECORDS_FILE, JSON.stringify(mapRecords, null, 2));
    fs.writeFileSync(MAP_RECORDS_JS, 'window.mapRecordsData = ' + JSON.stringify(mapRecords) + ';');

    fs.writeFileSync(MAP_RANKINGS_FILE, JSON.stringify(mapRankings, null, 2));
    fs.writeFileSync(MAP_RANKINGS_JS, 'window.mapRankingsData = ' + JSON.stringify(mapRankings) + ';');
    console.log(`Saved map_records and map_rankings for ${Object.keys(mapRecords).length} maps`);

    console.log("\n=== 3.5. Enriching Maps Flooded by TASers with Trusted Players Finishes ===");
    const mapsRawMap = {};
    for (const m of allMaps) { mapsRawMap[m.map] = m; }

    const enrichedMaps = {};
    let enrichedCount = 0;
    if (isFastMode) {
        console.log("⚡ [--fast mode] Preserving existing enriched rankings and instantly filtering blacklisted players.");
        for (const mName in mapsRawMap) {
            const safe = safeRankingFilename(mName);
            const filePath = path.join(RANKINGS_DIR, `${safe}.js`);
            if (fs.existsSync(filePath)) {
                try {
                    const code = fs.readFileSync(filePath, 'utf8');
                    const match = code.match(/window\.mapRankingCurrent\s*=\s*(.*);/s);
                    if (match) {
                        const parsed = JSON.parse(match[1]);
                        if (parsed && parsed.length > 0) {
                            mapRankings[mName] = parsed.filter(r => isFinishAllowed(r.player || r.name, mName, r.time, blacklistSet, mapMinTimes, ignoredFinishesSet));
                        }
                    }
                } catch (e) { }
            }
        }
    } else {
        const allLegitPlayers = loadPlayerList(blacklistSet);
        if (fs.existsSync(LEADERBOARD_FILE)) {
            try {
                const lbData = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
                const ptsMap = new Map();
                lbData.forEach((p, idx) => ptsMap.set(p.name.toLowerCase(), p.newPtsTotal || (100000 - idx)));
                allLegitPlayers.sort((a, b) => (ptsMap.get(b.name.toLowerCase()) || 0) - (ptsMap.get(a.name.toLowerCase()) || 0));
            } catch (e) { }
        }

        // Limit enrichment to cached profiles + top 500 players by PTS for optimal coverage without hitting rate limits
        const cachedPlayers = allLegitPlayers.filter(p => fs.existsSync(path.join(PLAYERS_DIR, `${sanitizeFilename(p.name)}.json`)));
        const topPlayers = cachedPlayers.concat(allLegitPlayers.slice(0, 500)).filter((p, idx, arr) => arr.findIndex(o => o.name.toLowerCase() === p.name.toLowerCase()) === idx);
        console.log(`Enrichment source: player_list.txt (${allLegitPlayers.length} total harvested, ${topPlayers.length} active scanned)`);

        for (let i = 0; i < topPlayers.length; i += CONCURRENCY) {
            const batch = topPlayers.slice(i, i + CONCURRENCY);
            let neededNetworkFetch = false;
            await Promise.all(batch.map(async (p) => {
                const localFile = path.join(PLAYERS_DIR, `${sanitizeFilename(p.name)}.json`);
                const ONE_DAY_MS = 24 * 60 * 60 * 1000;
                let pData = null;
                let isCacheValid = false;

                if (fs.existsSync(localFile)) {
                    try {
                        pData = JSON.parse(fs.readFileSync(localFile, 'utf8'));
                        const fileStats = fs.statSync(localFile);
                        if (Date.now() - fileStats.mtimeMs < ONE_DAY_MS) {
                            isCacheValid = true;
                        }
                    } catch (e) { }
                }

                if (!isCacheValid) {
                    neededNetworkFetch = true;
                    const fetched = await fetchJson(`https://ddstats.tw/player/json?player=${encodeURIComponent(p.name)}`);
                    if (fetched) {
                        pData = fetched;
                        try { fs.writeFileSync(localFile, JSON.stringify(pData)); } catch (e) { }
                    }
                }
                if (!pData || !pData.finishes) return;

                for (const f of pData.finishes) {
                    if (!f.map || !f.map.map || !f.time) continue;
                    const mName = f.map.map;
                    const mLower = mName.toLowerCase();
                    const pTime = f.time;

                    // Selective enrichment: only enrich maps that are flooded by TASers or have custom/min time rules
                    const needsEnrichment = mapRawTopFlooded[mName] || customMapRecords[mLower] || mapMinTimes[mLower] || Array.from(ignoredFinishesSet).some(s => s.endsWith(`|${mLower}`));
                    if (!needsEnrichment) continue;

                    const mapInfo = mapsRawMap[mName];
                    const isTeamCat = mapInfo && mapInfo.server !== 'Solo' && mapInfo.server !== 'Race' && mapInfo.server !== 'Dummy';

                    let teamPlayers = [p.name];
                    let isTeamRank = Boolean(f.team_rank);

                    if (f.team_rank && typeof f.team_rank === 'object' && Array.isArray(f.team_rank.players) && f.team_rank.players.length > 0) {
                        teamPlayers = f.team_rank.players.map(n => String(n).trim()).filter(Boolean);
                    }

                    // Reject solo finishes on team category maps
                    if (isTeamCat && !isTeamRank) continue;

                    const playerStr = teamPlayers.join(' & ');

                    if (!isFinishAllowed(playerStr, mName, pTime, blacklistSet, mapMinTimes, ignoredFinishesSet)) continue;

                    if (!mapRankings[mName]) mapRankings[mName] = [];

                    mapRankings[mName].push({
                        player: playerStr,
                        name: playerStr,
                        time: pTime,
                        timestamp: f.timestamp || null,
                        isTeamRank
                    });
                }
            }));
            if (neededNetworkFetch) {
                await new Promise(r => setTimeout(r, 200));
            }
            if (i % 100 === 0 && i > 0) console.log(`   Enrichment: ${i}/${topPlayers.length} players scanned...`);
        }
    }

    // Clean, deduplicate, sort, and re-rank all map rankings
    for (const mName in mapRankings) {
        let list = mapRankings[mName] || [];

        // Filter blacklisted players & rules (preserving custom map record overrides)
        list = list.filter(r => r.isCustomRecord || isFinishAllowed(r.player || r.name, mName, r.time, blacklistSet, mapMinTimes, ignoredFinishesSet));

        let cleanList = [];
        const isTeamCategory = mapsRawMap[mName] && mapsRawMap[mName].server !== 'Solo' && mapsRawMap[mName].server !== 'Race' && mapsRawMap[mName].server !== 'Dummy';

        if (isTeamCategory) {
            // Group finishes by time + timestamp to form team entries (PlayerA & PlayerB)
            // AND allow a player to appear in multiple distinct team ranks with different teams/times!
            const teamMap = new Map();
            const cleanNameStr = (n) => String(n).replace(/[\u200B-\u200D\uFEFF\uDB40\uDC00-\uDC7F]/g, '').trim();
            for (const r of list) {
                const timeKey = `${r.time.toFixed(2)}|${r.timestamp || ''}`;
                if (!teamMap.has(timeKey)) {
                    const pNames = (r.player || r.name || '').split(/[,/&]+/).map(p => p.trim()).filter(n => n && cleanNameStr(n).length > 0);
                    teamMap.set(timeKey, { ...r, playersSet: new Set(pNames) });
                } else {
                    const existing = teamMap.get(timeKey);
                    const pNames = (r.player || r.name || '').split(/[,/&]+/).map(p => p.trim()).filter(n => n && cleanNameStr(n).length > 0);
                    pNames.forEach(p => existing.playersSet.add(p));
                }
            }

            cleanList = Array.from(teamMap.values())
                .map(r => {
                    const pArray = Array.from(r.playersSet);
                    return {
                        player: pArray.join(' & '),
                        time: r.time,
                        timestamp: r.timestamp || null,
                        isTeamRank: true
                    };
                })
                .filter(r => {
                    // Reject single player entries on team category maps
                    const pArray = r.player.split(' & ').map(p => p.trim()).filter(Boolean);
                    return pArray.length >= 2;
                });
        } else {
            // Solo map: keep player's single best time
            const playerBest = new Map();
            for (const r of list) {
                const pname = (r.player || r.name).toLowerCase();
                if (!playerBest.has(pname) || r.time < playerBest.get(pname).time) {
                    playerBest.set(pname, r);
                }
            }
            cleanList = Array.from(playerBest.values());
        }

        const mLower = mName.toLowerCase();
        if (customMapRecords[mLower]) {
            const custom = customMapRecords[mLower];
            const teamPlayers = custom.players && custom.players.length ? custom.players : [custom.player];
            if (isTeamCategory && teamPlayers.length >= 2) {
                const customTeamStr = teamPlayers.join(' & ');
                const existingIdx = cleanList.findIndex(r => (r.player || r.name || '').toLowerCase() === customTeamStr.toLowerCase());
                if (existingIdx !== -1) {
                    cleanList[existingIdx].time = custom.time;
                    cleanList[existingIdx].isCustomRecord = true;
                } else {
                    cleanList.push({ player: customTeamStr, time: custom.time, isTeamRank: true, isCustomRecord: true });
                }
            } else {
                for (const pName of teamPlayers) {
                    const existingIdx = cleanList.findIndex(r => (r.player || r.name || '').toLowerCase() === pName.toLowerCase());
                    if (existingIdx !== -1) {
                        cleanList[existingIdx].time = custom.time;
                        cleanList[existingIdx].isCustomRecord = true;
                    } else {
                        cleanList.push({ player: pName, time: custom.time, isCustomRecord: true });
                    }
                }
            }
        }

        if (mapsRawMap[mName] && mapsRawMap[mName].server === 'Dummy') {
            cleanList = cleanList.filter(r => {
                if (r.isTeamRank || String(r.player).includes(' & ')) {
                    const pArray = String(r.player).split(/[,/&]+/).map(p => p.trim()).filter(Boolean);
                    if (pArray.length > 2) return false;
                }
                return true;
            });
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

        const updatedMapNames = [];
        if (cleanList.length > 0) {
            const newWr = cleanList[0].time;
            if (mapRecords[mName] !== newWr) {
                mapRecords[mName] = newWr;
                enrichedCount++;
                updatedMapNames.push(`${mName} (WR: ${newWr}s by ${cleanList[0].player})`);
            }
        } else if (hasCustomRecord) {
            mapRecords[mName] = customMapRecords[mLower].time;
        } else {
            mapRecords[mName] = null;
        }
    }

    console.log(`\n✨ Enriched and re-ranked ${Object.keys(mapRankings).length} maps (${enrichedCount} records updated)!`);
    if (Object.keys(enrichedMaps).length > 0) {
        console.log(`📋 Enriched Maps count: ${Object.keys(enrichedMaps).length}`);
    }

    fs.writeFileSync(MAP_RECORDS_FILE, JSON.stringify(mapRecords, null, 2));
    fs.writeFileSync(MAP_RECORDS_JS, 'window.mapRecordsData = ' + JSON.stringify(mapRecords) + ';');

    // Write monolithic map_rankings.js for backward compat
    fs.writeFileSync(MAP_RANKINGS_FILE, JSON.stringify(mapRankings, null, 2));
    fs.writeFileSync(MAP_ENRICHED_JSON, JSON.stringify(enrichedMaps, null, 2));
    fs.writeFileSync(MAP_ENRICHED_JS, 'window.enrichedMapsData = ' + JSON.stringify(enrichedMaps, null, 2) + ';\n');

    // Write per-map ranking files into data/rankings/ unconditionally
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

    console.log("\n=== 4. Re-calculating Global Leaderboard ===");
    let leaderboard = [];
    const topPlayers = loadPlayerList(blacklistSet);
    const mapStats = fs.existsSync(MAP_STATS_FILE) ? JSON.parse(fs.readFileSync(MAP_STATS_FILE, 'utf8')) : {};
    const playerFiles = new Set(fs.existsSync(PLAYERS_DIR) ? fs.readdirSync(PLAYERS_DIR).map(f => f.toLowerCase()) : []);

    for (const p of topPlayers) {
        const pName = p.name;
        if (blacklistSet.has(pName.toLowerCase())) continue;

        const fname = `${sanitizeFilename(pName)}.json`.toLowerCase();
        if (!playerFiles.has(fname)) continue;

        const localFile = path.join(PLAYERS_DIR, `${sanitizeFilename(pName)}.json`);

        try {
            const pData = JSON.parse(fs.readFileSync(localFile, 'utf8'));
            const pts = calculatePlayerPoints(pData, mapRecords, mapStats, blacklistSet);
            if (pts.newPtsTotal > 0) {
                leaderboard.push({
                    name: pName,
                    ...pts
                });
            }
        } catch (e) { }
    }

    leaderboard.sort((a, b) => b.newPtsTotal - a.newPtsTotal);
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
    fs.writeFileSync(LEADERBOARD_JS, 'window.leaderboardData = ' + JSON.stringify(leaderboard) + ';');

    if (fs.existsSync(UNIQUE_PLAYERS_JSON)) {
        const uniquePlayers = JSON.parse(fs.readFileSync(UNIQUE_PLAYERS_JSON, 'utf8'));
        const cleanUnique = uniquePlayers.filter(name => !blacklistSet.has(String(name).toLowerCase().trim()));
        fs.writeFileSync(UNIQUE_PLAYERS_JS, 'window.uniquePlayersData = ' + JSON.stringify(cleanUnique) + ';');
        console.log(`Saved ${cleanUnique.length} unique players into unique_players.js`);
    }

    console.log("\n=== 5. Updating Blacklist Data & Removed Finish Counts ===");
    await updateBlacklistData();

    console.log(`\n📡 Total API requests made: ${apiCallCount.toLocaleString()}`);
    if (apiCallCount > 0) {
        console.log(`   ≈ Maps fetch: ~${Math.min(apiCallCount, Object.keys(mapRecords).length)} requests`);
        console.log(`   ≈ Player enrichment: ~${Math.max(0, apiCallCount - Object.keys(mapRecords).length - 1)} requests`);
    } else {
        console.log(`   ⚡ 100% offline build from disk cache (0 network requests made).`);
    }
}

run();
