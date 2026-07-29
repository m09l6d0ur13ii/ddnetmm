import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../src/data');
const RAW_FILE = path.join(DATA_DIR, 'raw_top500.txt');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
const MAP_RECORDS_FILE = path.join(DATA_DIR, 'map_records.json');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 MapMastery' } }, (res) => {
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

function calculatePoints(playerData, mapRecords) {
    let oldPts = 0;
    let newPtsBase = 0;
    let newPtsSkill = 0;
    const processedMaps = new Set();

    const finishes = playerData.finishes || [];
    for (const finish of finishes) {
        const mapName = finish.map.name || finish.map.map;
        if (processedMaps.has(mapName)) continue;
        
        // Exclude Fun category explicitly
        if (finish.map.server === 'Fun') continue;
        
        processedMaps.add(mapName);

        const mapPts = finish.map.points || 0;
        oldPts += mapPts;
        newPtsBase += mapPts;

        const isSoloOrRace = finish.map.server === 'Solo' || finish.map.server === 'Race';
        if (isSoloOrRace || finish.team) {
            const tBest = mapRecords[mapName] || finish.time;
            const pMaxBonus = mapPts * 0.8;
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
    console.log("Loading map records...");
    let mapRecords = {};
    if (fs.existsSync(MAP_RECORDS_FILE)) {
        mapRecords = JSON.parse(fs.readFileSync(MAP_RECORDS_FILE, 'utf8'));
    }

    console.log("Parsing raw top 500 players...");
    const rawText = fs.readFileSync(RAW_FILE, 'utf8');
    const lines = rawText.split('\n');
    const players = [];
    
    for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 4) {
            players.push(parts[3].trim());
        }
    }
    
    console.log(`Found ${players.length} players. Building leaderboard...`);
    
    const leaderboard = [];
    const CONCURRENCY = 10;
    
    for (let i = 0; i < players.length; i += CONCURRENCY) {
        const batch = players.slice(i, i + CONCURRENCY);
        const promises = batch.map(async (name) => {
            try {
                const data = await fetchJson(`https://ddstats.tw/player/json?player=${encodeURIComponent(name)}`);
                if (!data || data.error) return;
                
                const pts = calculatePoints(data, mapRecords);
                leaderboard.push({ name: data.profile?.name || name, ...pts });
            } catch (err) {
                console.error(`Failed player ${name}:`, err.message);
            }
        });
        
        await Promise.all(promises); console.log('Current length:', leaderboard.length);
        console.log(`Processed ${Math.min(i + CONCURRENCY, players.length)} / ${players.length} players`);
        await new Promise(r => setTimeout(r, 200)); // Small delay
    }
    
    leaderboard.sort((a, b) => b.newPtsTotal - a.newPtsTotal);
    console.log('Final length:', leaderboard.length); //(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
    console.log("Leaderboard updated!");
}

run().catch(console.error);
