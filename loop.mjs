import { execSync } from 'child_process';
import fs from 'fs';

console.log('=== STARTING LOCAL CODE QUALITY & TEST WATCHER ===');
let round = 1;

while (true) {
    console.log(`\n>>> CHECK #${round} [${new Date().toLocaleTimeString()}] <<<`);
    try {
        // 1. Проверка синтаксиса ключевых фронтенд-скриптов
        const jsFiles = ['js/app.js', 'js/api.js', 'js/page-index.js', 'js/page-player.js', 'js/page-map.js'];
        for (const file of jsFiles) {
            if (fs.existsSync(file)) {
                execSync(`node --check "${file}"`, { stdio: 'pipe' });
            }
        }

        // 2. Прогон unit-тестов (сканирует файлы *.test.mjs / *.test.js в папке test)
        if (fs.existsSync('test')) {
            const testFiles = fs.readdirSync('test').filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
            if (testFiles.length > 0) {
                execSync('node --test "test/*.test.*"', { stdio: 'inherit', shell: true });
            }
        }

        console.log('✔ All checks passed cleanly.');
    } catch (err) {
        console.error('✖ Error detected:', err.message);
    }

    round++;
    // Пауза 15 секунд между проверками
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15000);
}