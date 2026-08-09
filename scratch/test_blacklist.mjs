import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const MAPS_CACHE_DIR = path.join(ROOT_DIR, 'data/maps_cache');
const PLAYERS_DIR = path.join(ROOT_DIR, 'data/players');
const BLACKLIST_TXT = path.join(ROOT_DIR, 'blacklist.txt');

const rawNames = fs.readFileSync(BLACKLIST_TXT, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith('//'));

console.log(`Loaded ${rawNames.length} names from blacklist.txt`);

// Store map of playerName (lowercase) -> { name, mapRanks: Map<mapName, { soloRank, teamRank }> }
const playerStats = new Map();
for (const name of rawNames) {
    playerStats.set(name.toLowerCase(), {
        name,
        mapRanks: new Map() // mapName -> { soloRank, teamRank }
    });
}

// 1. Scan local player JSONs in data/players/ if they exist
let playerJsonCount = 0;
for (const name of rawNames) {
    const sanitizeFilename = (n) => String(n).replace(/[^a-zA-Z0-9_\-. ]/g, '_').replace(/\s+/g, '_');
    const localFile = path.join(PLAYERS_DIR, `${sanitizeFilename(name)}.json`);
    if (fs.existsSync(localFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(localFile, 'utf8'));
            const finishes = data.finishes || [];
            if (finishes.length > 0) {
                playerJsonCount++;
                const item = playerStats.get(name.toLowerCase());
                for (const f of finishes) {
                    const mName = f.map ? (f.map.name || f.map.map) : null;
                    if (!mName) continue;
                    const r = f.rank ? (typeof f.rank === 'object' ? f.rank.rank : f.rank) : null;
                    const tr = f.team_rank ? (typeof f.team_rank === 'object' ? f.team_rank.rank : f.team_rank) : null;
                    const existing = item.mapRanks.get(mName) || { soloRank: null, teamRank: null };
                    if (typeof r === 'number' && r > 0) existing.soloRank = existing.soloRank ? Math.min(existing.soloRank, r) : r;
                    if (typeof tr === 'number' && tr > 0) existing.teamRank = existing.teamRank ? Math.min(existing.teamRank, tr) : tr;
                    item.mapRanks.set(mName, existing);
                }
            }
        } catch (e) {}
    }
}
console.log(`1. Checked data/players/: ${playerJsonCount} players had local JSON profile cache.`);

// 2. Scan data/maps_cache/ (contains full raw DDStats rankings for all maps)
if (fs.existsSync(MAPS_CACHE_DIR)) {
    const mapFiles = fs.readdirSync(MAPS_CACHE_DIR).filter(f => f.endsWith('.json'));
    console.log(`2. Scanning ${mapFiles.length} map files in maps_cache...`);

    for (const file of mapFiles) {
        try {
            const mapName = file.replace(/\.json$/, '');
            const data = JSON.parse(fs.readFileSync(path.join(MAPS_CACHE_DIR, file), 'utf8'));
            const rankings = data.rankings || [];
            const teamRankings = data.team_rankings || [];

            for (const r of rankings) {
                const p = (r.name || r.player || '').toLowerCase().trim();
                const item = playerStats.get(p);
                if (item) {
                    const rankPos = r.rank || null;
                    if (typeof rankPos === 'number' && rankPos > 0) {
                        const existing = item.mapRanks.get(mapName) || { soloRank: null, teamRank: null };
                        existing.soloRank = existing.soloRank ? Math.min(existing.soloRank, rankPos) : rankPos;
                        item.mapRanks.set(mapName, existing);
                    }
                }
            }

            for (const tr of teamRankings) {
                const players = (tr.players || [tr.name || tr.player]).map(p => String(p).toLowerCase().trim());
                for (const p of players) {
                    const item = playerStats.get(p);
                    if (item) {
                        const rankPos = tr.rank || null;
                        if (typeof rankPos === 'number' && rankPos > 0) {
                            const existing = item.mapRanks.get(mapName) || { soloRank: null, teamRank: null };
                            existing.teamRank = existing.teamRank ? Math.min(existing.teamRank, rankPos) : rankPos;
                            item.mapRanks.set(mapName, existing);
                        }
                    }
                }
            }
        } catch (e) {}
    }
}

// Compute final breakdown stats per player
const results = [];
let playersWithRecords = 0;

for (const [lowerName, item] of playerStats.entries()) {
    let count = 0, wr1 = 0, top10 = 0, top50 = 0;

    for (const [mName, ranks] of item.mapRanks.entries()) {
        const validRanks = [ranks.soloRank, ranks.teamRank].filter(n => typeof n === 'number' && n > 0);
        if (validRanks.length === 0) continue;
        const bestRank = Math.min(...validRanks);
        count++;
        if (bestRank === 1) wr1++;
        else if (bestRank >= 2 && bestRank <= 10) top10++;
        else if (bestRank >= 11 && bestRank <= 50) top50++;
    }

    if (count > 0) playersWithRecords++;

    results.push({
        name: item.name,
        count,
        wr1,
        top10,
        top50
    });
}

results.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

console.log(`\nResults summary:`);
console.log(`Total blacklisted players: ${results.length}`);
console.log(`Players with >0 records found: ${playersWithRecords}`);
console.log(`Top 15 blacklisted players by records:`);
console.table(results.slice(0, 15));
