import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
const MAP_RECORDS_FILE = path.join(DATA_DIR, 'map_records.json');
const MAP_RECORDS_JS = path.join(DATA_DIR, 'map_records.js');
const MAP_RANKINGS_FILE = path.join(DATA_DIR, 'map_rankings.json');
const MAP_RANKINGS_JS = path.join(DATA_DIR, 'map_rankings.js');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function run() {
  if (!fs.existsSync(LEADERBOARD_FILE) || !fs.existsSync(MAP_RECORDS_FILE)) {
    console.log("Missing leaderboard or map_records");
    return;
  }

  const leaderboard = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
  const mapRecords = JSON.parse(fs.readFileSync(MAP_RECORDS_FILE, 'utf8'));
  const mapRankings = fs.existsSync(MAP_RANKINGS_FILE) ? JSON.parse(fs.readFileSync(MAP_RANKINGS_FILE, 'utf8')) : {};

  console.log(`Enriching map data from top ${Math.min(100, leaderboard.length)} legitimate players...`);

  let updatedMapsCount = 0;

  // Process top players
  for (let i = 0; i < Math.min(100, leaderboard.length); i++) {
    const player = leaderboard[i];
    const pData = await fetchJson(`https://ddstats.tw/player/json?player=${encodeURIComponent(player.name)}`);
    if (!pData || !pData.finishes) continue;

    if ((i + 1) % 10 === 0 || i === 0) {
      console.log(`Fetched finishes for ${i + 1}/${Math.min(100, leaderboard.length)} players (${player.name})...`);
    }

    for (const f of pData.finishes) {
      if (!f.map || !f.map.map || !f.time) continue;
      const mapName = f.map.map;
      const pTime = f.time;

      if (!mapRankings[mapName]) {
        mapRankings[mapName] = [];
      }

      // Check if player is already in mapRankings
      const exists = mapRankings[mapName].some(r => r.name === player.name);
      if (!exists) {
        mapRankings[mapName].push({
          rank: f.rank || 999,
          name: player.name,
          time: pTime,
          server: f.server || 'GER',
          timestamp: f.timestamp || ''
        });
        mapRankings[mapName].sort((a, b) => a.time - b.time);
      }

      // Check if this legal time is faster than current map record
      const currentRec = mapRecords[mapName];
      if (!currentRec || pTime < currentRec) {
        mapRecords[mapName] = pTime;
        updatedMapsCount++;
      }
    }
  }

  // Save enriched files
  fs.writeFileSync(MAP_RECORDS_FILE, JSON.stringify(mapRecords, null, 2));
  fs.writeFileSync(MAP_RECORDS_JS, 'window.mapRecordsData = ' + JSON.stringify(mapRecords) + ';');

  fs.writeFileSync(MAP_RANKINGS_FILE, JSON.stringify(mapRankings, null, 2));
  fs.writeFileSync(MAP_RANKINGS_JS, 'window.mapRankingsData = ' + JSON.stringify(mapRankings) + ';');

  console.log(`Enrichment complete! Updated records for ${updatedMapsCount} maps.`);
  console.log(`New record for '2 Days in the back':`, mapRecords['2 Days in the back']);
  console.log(`Rankings for '2 Days in the back':`, mapRankings['2 Days in the back']);
}

run();
