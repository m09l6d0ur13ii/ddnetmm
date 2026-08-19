import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scriptCode = fs.readFileSync(path.join(__dirname, '../scripts/build_all_data.mjs'), 'utf8');

const testableCode = scriptCode
  .replace(/import .*? from '.*?';/g, '')
  .replace(/const __filename = fileURLToPath\(import\.meta\.url\);/g, 'const __filename = "/mock/path/script.mjs";')
  .replace(/run\(\);/, '');

const sandbox = {
  console: { warn: () => {}, error: () => {}, log: () => {} },
  process: { argv: [], exit: () => {} },
  setTimeout: setTimeout,
  fs: { existsSync: () => false, mkdirSync: () => {} },
  path: path
};

const contextInit = Object.keys(sandbox).map(key => `const ${key} = sandbox.${key};`).join('\n');
const evalCode = `
  (function(sandbox) {
    ${contextInit}
    ${testableCode}
    return { sanitizeFilename, safeRankingFilename, parseTimeToSeconds, calcMapStats, isQualifyingRun };
  })(sandbox);
`;

const functions = eval(evalCode);

describe('scripts/build_all_data.mjs data parsing', () => {
  const { sanitizeFilename, safeRankingFilename, parseTimeToSeconds, calcMapStats, isQualifyingRun } = functions;

  describe('sanitizeFilename', () => {
    test('should replace invalid characters with underscore', () => {
      assert.strictEqual(sanitizeFilename('Map<Name>'), 'Map_Name_');
      assert.strictEqual(sanitizeFilename('Map:Name*'), 'Map_Name_');
      assert.strictEqual(sanitizeFilename('ValidMap123'), 'ValidMap123');
    });
  });

  describe('safeRankingFilename', () => {
    test('should replace spaces and special chars', () => {
      assert.strictEqual(safeRankingFilename('Map Name'), 'Map_Name');
      assert.strictEqual(safeRankingFilename('special!chars@'), 'special_chars_');
      assert.strictEqual(safeRankingFilename('Map-Name_1.2'), 'Map-Name_1.2');
    });
  });

  describe('parseTimeToSeconds', () => {
    test('should handle MM:SS format', () => {
      assert.strictEqual(parseTimeToSeconds('1:20'), 80);
    });

    test('should handle HH:MM:SS format', () => {
      assert.strictEqual(parseTimeToSeconds('1:02:05'), 3725);
    });

    test('should handle raw seconds or numbers', () => {
      assert.strictEqual(parseTimeToSeconds('45.5'), 45.5);
      assert.strictEqual(parseTimeToSeconds(60), 60);
      assert.strictEqual(parseTimeToSeconds(0), 0);
      assert.strictEqual(parseTimeToSeconds(''), 0);
    });
  });

  describe('calcMapStats', () => {
    test('should return default stats for empty times', () => {
      const stats = calcMapStats([]);
      assert.strictEqual(stats.s, 2.0);
    });

    test('should return capped max strictness for 1 time', () => {
      const stats = calcMapStats([10]);
      assert.strictEqual(stats.s, 3.0);
    });

    test('should calculate strictness for identical times', () => {
      const stats = calcMapStats([10, 10, 10]);
      assert.strictEqual(stats.s, 3.0); // Capped at 3.0
    });

    test('should calculate strictness based on CV', () => {
      // Different times: [10, 20, 30] -> mean=20, variance=66.6, stdev=8.16, cv=0.408
      // s = 3.0 - ((0.408 - 0.01)/0.49)*2.5 = 3.0 - 2.03 = 0.97 (roughly)
      const stats = calcMapStats([10, 20, 30]);
      assert.ok(stats.s < 2.0 && stats.s > 0.5);
      assert.ok(Math.abs(stats.mean - 20) < 0.001);
    });
  });

  describe('isQualifyingRun', () => {
    test('should reject fun server runs', () => {
      assert.strictEqual(isQualifyingRun('Fun', 1, 1), false);
    });

    test('should accept solo categories unconditionally', () => {
      assert.strictEqual(isQualifyingRun('Solo', 10, null), true);
      assert.strictEqual(isQualifyingRun('Race', 5, null), true);
      assert.strictEqual(isQualifyingRun('Dummy', 1, null), true);
    });

    test('should evaluate teamRank logic for other servers', () => {
      // For Novice, rank >= teamRank is required
      assert.strictEqual(isQualifyingRun('Novice', 1, 2), false);
      assert.strictEqual(isQualifyingRun('Novice', 2, 1), true);
      assert.strictEqual(isQualifyingRun('Novice', 1, null), false);
    });
  });
});
