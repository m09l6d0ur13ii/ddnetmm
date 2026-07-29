import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const BLACKLIST_TXT = path.join(ROOT_DIR, 'blacklist.txt');
const BLACKLIST_JS = path.join(ROOT_DIR, 'data/blacklist.js');
const LEADERBOARD_JSON = path.join(ROOT_DIR, 'data/leaderboard.json');
const LEADERBOARD_JS = path.join(ROOT_DIR, 'data/leaderboard.js');

function loadBlacklist() {
    if (!fs.existsSync(BLACKLIST_TXT)) return [];
    const text = fs.readFileSync(BLACKLIST_TXT, 'utf8');
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
}

function run() {
    const list = loadBlacklist();
    console.log(`Loaded ${list.length} blacklisted players from blacklist.txt:`, list);

    // 1. Generate data/blacklist.js
    const jsContent = `// Blacklist of cheaters/TASers loaded locally
window.blacklistData = ${JSON.stringify(list, null, 2)};

window.isBlacklisted = function(name) {
  if (!name || !window.blacklistData || !window.blacklistData.length) return false;
  const lower = String(name).toLowerCase().trim();
  return window.blacklistData.some(b => String(b).toLowerCase().trim() === lower);
};
`;
    fs.writeFileSync(BLACKLIST_JS, jsContent);
    console.log('Saved data/blacklist.js');

    // 2. Filter data/leaderboard.json & data/leaderboard.js
    if (fs.existsSync(LEADERBOARD_JSON)) {
        const lb = JSON.parse(fs.readFileSync(LEADERBOARD_JSON, 'utf8'));
        const lowerList = new Set(list.map(b => b.toLowerCase()));
        const filteredLb = lb.filter(p => !lowerList.has(String(p.name).toLowerCase()));
        
        fs.writeFileSync(LEADERBOARD_JSON, JSON.stringify(filteredLb, null, 2));
        fs.writeFileSync(LEADERBOARD_JS, 'window.leaderboardData = ' + JSON.stringify(filteredLb) + ';');
        console.log(`Filtered leaderboard: ${lb.length} -> ${filteredLb.length} players. Saved leaderboard.js.`);
    }
}

run();
