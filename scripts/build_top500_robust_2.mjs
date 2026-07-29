import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../src/data');
const PLAYERS_DIR = path.join(DATA_DIR, 'players');
const RAW_FILE = path.join(DATA_DIR, 'raw_top500.txt');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
const MAP_RECORDS_FILE = path.join(DATA_DIR, 'map_records.json');
const MAP_STATS_FILE = path.join(DATA_DIR, 'map_stats.json');

function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_');
}

if (!fs.existsSync(PLAYERS_DIR)) fs.mkdirSync(PLAYERS_DIR, { recursive: true });

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 MapMastery' } }, (res) => {
            if (res.statusCode === 404) return resolve(null);
            if (res.statusCode !== 200) {
                let errData = '';
                res.on('data', c => errData += c);
                res.on('end', () => resolve({ error: `Status ${res.statusCode} ${errData}` }));
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { resolve({ error: 'Parse Error' }); }
            });
        }).on('error', err => resolve({ error: err.message }));
    });
}

function getSeason(timestampStr) {
    if (!timestampStr) return null;
    const d = new Date(timestampStr);
    const year = d.getFullYear();
    const month = d.getMonth();
    if (year === 2025) return month < 6 ? '2025-H1' : '2025-H2';
    if (year === 2026) return month < 6 ? '2026-H1' : '2026-H2';
    return null;
}

function calcMapStats(times) {
    const n = times.length;
    if (n === 0) return { s: 2.0 };
    if (n === 1) return { s: 3.0 }; // only 1 finish, very strict
    
    const mean = times.reduce((a,b)=>a+b,0) / n;
    const variance = times.reduce((a,b)=>a + Math.pow(b - mean, 2), 0) / n;
    const stdev = Math.sqrt(variance);
    const cv = stdev / mean;
    
    // Map CV [0.01, 0.5] -> S [3.0, 0.5]
    let s = 3.0 - ((cv - 0.01) / 0.49) * 2.5;
    if (s > 3.0) s = 3.0;
    if (s < 0.5) s = 0.5;
    
    return { mean, stdev, cv, s };
}

function calculatePoints(playerData, mapRecords, mapStats) {
    let oldPts = 0;
    let newPtsBase = 0;
    let newPtsSkill = 0;
    let seasons = {
        '2025-H1': 0,
        '2025-H2': 0,
        '2026-H1': 0,
        '2026-H2': 0,
    };
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
            
            // USE STATISTICAL S!
            const stats = mapStats[mapName] || { s: 2.0 };
            const s = stats.s;

            const pMaxBonus = mapPts * 5.0;
            const timeRatio = finish.time / tBest;
            const pSkill = Math.floor(pMaxBonus * Math.exp(-s * (Math.max(1, timeRatio) - 1)));
            newPtsSkill += pSkill;

            const season = getSeason(finish.timestamp);
            if (season && seasons[season] !== undefined) {
                seasons[season] += pSkill;
            }
        }
    }
    
    return {
        oldPts: oldPts || 0,
        newPtsBase: newPtsBase || 0,
        newPtsSkill: newPtsSkill || 0,
        newPtsTotal: (newPtsBase || 0) + (newPtsSkill || 0),
        seasons
    };
}

async function run() {
    let mapRecords = {};
    if (fs.existsSync(MAP_RECORDS_FILE)) {
        mapRecords = JSON.parse(fs.readFileSync(MAP_RECORDS_FILE, 'utf8'));
    }

    const rawText = fs.readFileSync(RAW_FILE, 'utf8');
    const lines = rawText.split('\n');
    const players = [];
    
    for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 4) players.push(parts[3].trim());
    }

    // 1. Fetch & Cache all players
    console.log("Phase 1: Downloading & Caching players...");
    const CONCURRENCY = 15;
    for (let i = 0; i < players.length; i += CONCURRENCY) {
        const batch = players.slice(i, i + CONCURRENCY);
        const promises = batch.map(async (name) => {
            const cachePath = path.join(PLAYERS_DIR, `${sanitizeFilename(name)}.json`);
            if (fs.existsSync(cachePath)) return;

            const data = await fetchJson(`https://ddstats.tw/player/json?player=${encodeURIComponent(name)}`);
            if (data && !data.error) {
                fs.writeFileSync(cachePath, JSON.stringify(data));
            }
        });
        await Promise.all(promises);
        if (i % 150 === 0) console.log(`Cached up to ${i}/${players.length}`);
    }

    // 2. Aggregate times for stats
    console.log("Phase 2: Calculating Statistical 's' for Maps...");
    const mapTimes = new Map();
    for (const name of players) {
        const cachePath = path.join(PLAYERS_DIR, `${sanitizeFilename(name)}.json`);
        if (!fs.existsSync(cachePath)) continue;
        const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        const finishes = data.finishes || [];
        for (const finish of finishes) {
            const mapName = finish.map.name || finish.map.map;
            const isSoloOrRace = finish.map.server === 'Solo' || finish.map.server === 'Race';
            const isTeamRun = finish.team_rank && finish.rank >= finish.team_rank;
            if (isSoloOrRace || isTeamRun) {
                if (!mapTimes.has(mapName)) mapTimes.set(mapName, []);
                mapTimes.get(mapName).push(finish.time);
            }
        }
    }

    const mapStats = {};
    for (const [mapName, times] of mapTimes.entries()) {
        mapStats[mapName] = calcMapStats(times);
    }
    fs.writeFileSync(MAP_STATS_FILE, JSON.stringify(mapStats, null, 2));
    console.log(`Generated map_stats.json for ${mapTimes.size} maps`);

    // 3. Calculate points and build leaderboard
    console.log("Phase 3: Calculating Leaderboard...");
    let leaderboard = [];
    for (const name of players) {
        const cachePath = path.join(PLAYERS_DIR, `${sanitizeFilename(name)}.json`);
        if (!fs.existsSync(cachePath)) continue;
        const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        const pts = calculatePoints(data, mapRecords, mapStats);
        leaderboard.push({ name: data.profile?.name || name, ...pts });
    }

    leaderboard.sort((a, b) => b.newPtsTotal - a.newPtsTotal);
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
    console.log(`Final Leaderboard size: ${leaderboard.length}`);
}

run().catch(console.error);
