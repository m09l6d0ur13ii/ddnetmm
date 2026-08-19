import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../src/data');
const MAP_RECORDS_FILE = path.join(DATA_DIR, 'map_records.json');
const UNIQUE_PLAYERS_FILE = path.join(DATA_DIR, 'unique_players.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 MapMastery Crawler' } }, (res) => {
            if (res.statusCode === 404) return resolve(null);
            if (res.statusCode !== 200) return reject(new Error(`Status ${res.statusCode}`));
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
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

function calculatePoints(playerData, mapRecords) {
    let oldPts = 0;
    let newPtsBase = 0;
    let newPtsSkill = 0;

    const finishes = playerData.finishes || [];
    const processedMaps = new Set();

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
            const tBest = mapRecords[mapName] || finish.time;
            const pMaxBonus = mapPts * 5.0;
            const timeRatio = finish.time / tBest;
            const strictness = 2.0;
            const skillBonus = Math.floor(pMaxBonus * Math.exp(-strictness * (Math.max(1, timeRatio) - 1)));
            newPtsSkill += skillBonus;
        }
    }

    return {
        oldPts,
        newPtsBase,
        newPtsSkill,
        newPtsTotal: newPtsBase + newPtsSkill
    };
}

async function run() {
    console.log("1. Fetching all maps...");
    const allMaps = await fetchJson('https://ddstats.tw/maps/json');

    let mapRecords = {};
    if (fs.existsSync(MAP_RECORDS_FILE)) {
        mapRecords = JSON.parse(fs.readFileSync(MAP_RECORDS_FILE, 'utf8'));
    }

    console.log("2. Collecting unique players from top 100 of all maps...");
    const playerAppearances = {};
    const CONCURRENCY = 10;

    for (let i = 0; i < allMaps.length; i += CONCURRENCY) {
        const batch = allMaps.slice(i, i + CONCURRENCY);
        const promises = batch.map(async (m) => {
            try {
                const data = await fetchJson(`https://ddstats.tw/map/json?map=${encodeURIComponent(m.map)}`);
                if (!data) return;

                const processRankings = (rankings) => {
                    if (!rankings) return;
                    for (const r of rankings) {
                        if (r.name) {
                            playerAppearances[r.name] = (playerAppearances[r.name] || 0) + 1;
                        }
                    }
                };

                processRankings(data.rankings);
                processRankings(data.team_rankings);

                // Update map record just in case
                if (data.rankings && data.rankings.length > 0) {
                    mapRecords[m.map] = data.rankings[0].time;
                }
            } catch (err) {
                console.error(`Failed map ${m.map}`);
            }
        });
        await Promise.all(promises);
        if (i % 500 === 0 && i > 0) console.log(`   ...scanned ${i} maps`);
        await new Promise(r => setTimeout(r, 100)); // rate limit
    }

    fs.writeFileSync(MAP_RECORDS_FILE, JSON.stringify(mapRecords, null, 2));

    // Filter players who appear at least 3 times in top 100s to reduce the pool slightly (removes one-hit wonders on dead maps)
    const uniquePlayers = Object.keys(playerAppearances).filter(name => playerAppearances[name] >= 3);
    console.log(`Found ${Object.keys(playerAppearances).length} unique players. Filtered to ${uniquePlayers.length} core players (>= 3 top100s).`);
    fs.writeFileSync(UNIQUE_PLAYERS_FILE, JSON.stringify(uniquePlayers, null, 2));

    console.log("3. Fetching player stats and building leaderboard...");
    const leaderboard = [];

    for (let i = 0; i < uniquePlayers.length; i += CONCURRENCY) {
        const batch = uniquePlayers.slice(i, i + CONCURRENCY);
        const promises = batch.map(async (name) => {
            try {
                const data = await fetchJson(`https://ddstats.tw/player/json?player=${encodeURIComponent(name)}`);
                if (!data || data.error) return;

                const pts = calculatePoints(data, mapRecords);
                if (pts.newPtsTotal > 0) {
                    leaderboard.push({ name, ...pts });
                }
            } catch (err) {
                console.error(`Failed player ${name}`);
            }
        });
        await Promise.all(promises);
        if (i % 200 === 0 && i > 0) {
            console.log(`   ...processed ${i} / ${uniquePlayers.length} players`);
            // Save intermediate
            leaderboard.sort((a, b) => b.newPtsTotal - a.newPtsTotal);
            fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
        }
        await new Promise(r => setTimeout(r, 100));
    }

    leaderboard.sort((a, b) => b.newPtsTotal - a.newPtsTotal);
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
    console.log(`Leaderboard successfully generated with ${leaderboard.length} players!`);
}

run().catch(console.error);
