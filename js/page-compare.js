/* page-compare.js — Logic for compare.html */

(function () {
  'use strict';

  function getDDNetPts(rank, maxPts) {
    if (rank === 1)  return maxPts;
    if (rank === 2)  return Math.floor(maxPts * 0.8);
    if (rank === 3)  return Math.floor(maxPts * 0.65);
    if (rank <= 5)   return Math.floor(maxPts * 0.5);
    if (rank <= 10)  return Math.floor(maxPts * 0.3);
    if (rank <= 20)  return Math.floor(maxPts * 0.1);
    return 0;
  }

  function getMasteryPts(tBest, tPlayer, s, maxPts) {
    const timeRatio = tPlayer / tBest;
    return Math.floor(maxPts * Math.exp(-s * (Math.max(1, timeRatio) - 1)));
  }

  function generateScenario(name, desc, tBest, s, maxPts, players) {
    const labels = [];
    const ddnetData = [];
    const masteryData = [];

    players.forEach((time, index) => {
      const rank = index + 1;
      labels.push(time > 60 ? `${Math.floor(time / 60)}m ${Math.floor(time % 60)}s` : `${time.toFixed(1)}s`);
      ddnetData.push(getDDNetPts(rank, maxPts));
      masteryData.push(getMasteryPts(tBest, time, s, maxPts));
    });

    return { name, desc, labels, ddnetData, masteryData };
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderHeader('compare');

    const dict = getDict();
    document.documentElement.lang = currentLang;

    document.getElementById('icon-arrow-left').innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>';

    document.getElementById('compare-back').textContent  = dict.about.back;
    document.getElementById('compare-title').textContent = dict.compare.title;
    document.getElementById('compare-desc').textContent  = dict.compare.desc;

    const scenarios = [
      generateScenario(dict.compare.scenarios[0].name, dict.compare.scenarios[0].desc, 10.0,   3.0, 100,  [10.0, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9]),
      generateScenario(dict.compare.scenarios[1].name, dict.compare.scenarios[1].desc, 120.0,  2.0, 500,  [120, 121, 122, 123, 124, 125, 128, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142]),
      generateScenario(dict.compare.scenarios[2].name, dict.compare.scenarios[2].desc, 7200.0, 0.5, 1000, [7200, 9000, 9500, 10000, 11000, 12000, 14000, 15000, 18000, 20000]),
      generateScenario(dict.compare.scenarios[3].name, dict.compare.scenarios[3].desc, 30.0,   2.5, 200,  [30.00, 30.01, 31.0, 32.0, 33.0, 34.0, 35.0, 36.0, 37.0, 38.0]),
      generateScenario(dict.compare.scenarios[4].name, dict.compare.scenarios[4].desc, 300.0,  1.5, 300,  [300, 305, 310]),
    ];

    const container = document.getElementById('scenarios-container');

    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = 'sans-serif';

    scenarios.forEach((scenario, i) => {
      const div = document.createElement('div');
      div.style.cssText =
        'background:#3e3e3e;border:1px solid rgba(0,0,0,0.6);padding:1.5em;display:flex;flex-direction:column;box-shadow:0 2px 10px rgba(0,0,0,0.5);';
      div.innerHTML = `
        <div class="mb-6">
          <div class="flex items-center gap-2 mb-2">
            <h3 class="font-bold text-xl text-white">${escapeHtml(scenario.name)}</h3>
          </div>
          <p class="text-sm text-slate-400">${scenario.desc}</p>
        </div>
        <div class="flex-1 h-64 min-h-[250px] relative">
          <canvas id="chart-${i}"></canvas>
        </div>
      `;
      container.appendChild(div);

      const ctx = document.getElementById(`chart-${i}`).getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: scenario.labels,
          datasets: [
            {
              label: 'Vanilla DDNet',
              data: scenario.ddnetData,
              borderColor: '#ef4444',
              backgroundColor: '#ef4444',
              stepped: true,
              borderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            {
              label: 'Map Mastery',
              data: scenario.masteryData,
              borderColor: '#10b981',
              backgroundColor: '#10b981',
              tension: 0.4,
              borderWidth: 3,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { color: '#cbd5e1' } },
            tooltip: {
              backgroundColor: '#2a2a2a',
              borderColor: '#555',
              borderWidth: 1,
              titleColor: '#9a9a9a',
              bodyColor: '#dfdede',
              padding: 10,
            },
          },
          scales: {
            x: { grid: { color: '#334155', tickColor: 'transparent' }, ticks: { color: '#64748b' } },
            y: { grid: { color: '#334155' }, ticks: { color: '#64748b' } },
          },
        },
      });
    });
  });
})();
