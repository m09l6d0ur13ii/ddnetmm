import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../src/data/map_records.json');

// Ensure directory exists
fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 MapMastery Crawler' } }, (res) => {
            if (res.statusCode !== 200) {
                // If it's a 404, we just resolve with null (e.g. map not found)
                if (res.statusCode === 404) return resolve(null);
                return reject(new Error(`Status ${res.statusCode}`));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    console.log("Fetching list of all maps...");
    const allMaps = await fetchJson('https://ddstats.tw/maps/json');
    if (!allMaps || !Array.isArray(allMaps)) {
        console.error("Failed to load maps list!");
        return;
    }
    
    console.log(`Found ${allMaps.length} maps. Starting crawler...`);
    
    let records = {};
    if (fs.existsSync(DATA_FILE)) {
        try {
            records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            console.log(`Loaded ${Object.keys(records).length} existing records from cache.`);
        } catch (e) {
            console.error("Cache corrupted, starting fresh.");
        }
    }

    const CONCURRENCY = 10;
    
    for (let i = 0; i < allMaps.length; i += CONCURRENCY) {
        const batch = allMaps.slice(i, i + CONCURRENCY);
        
        const promises = batch.map(async (m) => {
            const mapName = m.map;
            if (records[mapName] !== undefined) {
                return; // Already cached
            }
            
            try {
                const mapData = await fetchJson(`https://ddstats.tw/map/json?map=${encodeURIComponent(mapName)}`);
                if (mapData && mapData.rankings && mapData.rankings.length > 0) {
                    records[mapName] = mapData.rankings[0].time;
                } else {
                    records[mapName] = null; // No finishes yet
                }
            } catch (err) {
                console.error(`Failed to fetch ${mapName}:`, err.message);
            }
        });
        
        await Promise.all(promises);
        
        // Save progress every 100 maps
        if (i > 0 && i % 100 === 0) {
            console.log(`Processed ${i} / ${allMaps.length} maps...`);
            fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));
        }
        
        // Small delay to prevent rate limit (10 reqs per 200ms = 50 reqs/sec)
        await new Promise(r => setTimeout(r, 200));
    }
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));
    console.log(`Crawler finished! Saved ${Object.keys(records).length} records to ${DATA_FILE}`);
}

run().catch(console.error);
