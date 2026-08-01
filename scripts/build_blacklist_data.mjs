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

async function fetchPlayerFinishesInfo(name) {
    try {
        const url = `https://ddstats.tw/player/json?player=${encodeURIComponent(name)}`;
        const res = await fetch(url);
        if (!res.ok) return { count: 0, wr1: 0, top10: 0, top50: 0 };
        const data = await res.json();
        const finishes = data.finishes || [];
        const count = finishes.length;
        let wr1 = 0, top10 = 0, top50 = 0;
        for (const f of finishes) {
            const r = f.rank || f.team_rank;
            if (r === 1) wr1++;
            else if (r >= 2 && r <= 10) top10++;
            else if (r >= 11 && r <= 50) top50++;
        }
        return { count, wr1, top10, top50 };
    } catch (e) {
        return { count: 0, wr1: 0, top10: 0, top50: 0 };
    }
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
  const lower = String(name).toLowerCase().trim();
  return window.blacklistData.some(b => {
    const bName = typeof b === 'string' ? b : b.name;
    return String(bName).toLowerCase().trim() === lower;
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
