import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const BLACKLIST_TXT = path.join(ROOT_DIR, 'blacklist.txt');
const BLACKLIST_JS = path.join(ROOT_DIR, 'data/blacklist.js');

function loadBlacklist() {
    if (!fs.existsSync(BLACKLIST_TXT)) return [];
    const text = fs.readFileSync(BLACKLIST_TXT, 'utf8');
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#') && !line.startsWith('//'));
}

let mapRankingsCache = null;
function getMapRankingsCache() {
    if (mapRankingsCache) return mapRankingsCache;
    const mapRankingsFile = path.join(ROOT_DIR, 'data/map_rankings.json');
    if (fs.existsSync(mapRankingsFile)) {
        try {
            mapRankingsCache = JSON.parse(fs.readFileSync(mapRankingsFile, 'utf8'));
        } catch (e) {
            mapRankingsCache = {};
        }
    } else {
        mapRankingsCache = {};
    }
    return mapRankingsCache;
}

async function fetchPlayerFinishesInfo(name) {
    const sanitizeFilename = (n) => String(n).replace(/[^a-zA-Z0-9_\-. ]/g, '_').replace(/\s+/g, '_');
    const localFile = path.join(ROOT_DIR, 'data/players', `${sanitizeFilename(name)}.json`);
    let finishes = null;

    if (fs.existsSync(localFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(localFile, 'utf8'));
            finishes = data.finishes || [];
        } catch (e) { }
    }

    if (!finishes) {
        try {
            const url = `https://ddstats.tw/player/json?player=${encodeURIComponent(name)}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                finishes = data.finishes || [];
            }
        } catch (e) { }
    }

    let count = 0, wr1 = 0, top10 = 0, top50 = 0;

    if (finishes && finishes.length > 0) {
        count = finishes.length;
        for (const f of finishes) {
            const r = f.rank || f.team_rank;
            if (r === 1) wr1++;
            else if (r >= 2 && r <= 10) top10++;
            else if (r >= 11 && r <= 50) top50++;
        }
    }

    // Always fallback / enrich using local map_rankings.json
    const mapCache = getMapRankingsCache();
    const targetName = String(name).toLowerCase().trim();
    let mapCount = 0, mapWr1 = 0, mapTop10 = 0, mapTop50 = 0;

    for (const mapName in mapCache) {
        const rankings = mapCache[mapName];
        if (!Array.isArray(rankings)) continue;
        for (const r of rankings) {
            if (!r || !r.player) continue;
            const players = String(r.player).split(/[,/&]+/).map(p => p.toLowerCase().trim());
            if (players.includes(targetName)) {
                mapCount++;
                const rankPos = r.rank || 999;
                if (rankPos === 1) mapWr1++;
                else if (rankPos >= 2 && rankPos <= 10) mapTop10++;
                else if (rankPos >= 11 && rankPos <= 50) mapTop50++;
            }
        }
    }

    // Take max of API/profile cache and raw map rankings
    if (mapCount > count) {
        count = mapCount;
        wr1 = Math.max(wr1, mapWr1);
        top10 = Math.max(top10, mapTop10);
        top50 = Math.max(top50, mapTop50);
    }

    return { count, wr1, top10, top50 };
}

export async function updateBlacklistData() {
    const rawNames = loadBlacklist();
    console.log(`Fetching record counts & rank breakdowns for ${rawNames.length} blacklisted players...`);

    const results = [];
    const batchSize = 10;

    for (let i = 0; i < rawNames.length; i += batchSize) {
        const batch = rawNames.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(async (name) => {
            const info = await fetchPlayerFinishesInfo(name);
            return { name, count: info.count, wr1: info.wr1, top10: info.top10, top50: info.top50 };
        }));
        results.push(...batchResults);
        console.log(`Processed ${Math.min(i + batchSize, rawNames.length)} / ${rawNames.length}...`);
    }

    // Sort descending by count, then by name
    results.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const jsContent = `// Blacklist of cheaters/TASers loaded locally with deleted record counts
window.blacklistData = ${JSON.stringify(results, null, 2)};

window.isBlacklisted = function(name) {
  if (!name || !window.blacklistData || !window.blacklistData.length) return false;
  const players = String(name).split(/[,/&]+/).map(p => p.toLowerCase().trim()).filter(Boolean);
  return window.blacklistData.some(b => {
    const bName = (typeof b === 'string' ? b : b.name).toLowerCase().trim();
    return players.includes(bName);
  });
};
`;

    fs.writeFileSync(BLACKLIST_JS, jsContent);
    console.log(`Saved updated data/blacklist.js with ${results.length} blacklisted players.`);
    return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    updateBlacklistData();
}
