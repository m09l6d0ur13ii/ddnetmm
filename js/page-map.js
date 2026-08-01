/* page-map.js — Logic for map.html */

(function () {
  'use strict';

  const formatTime = (t) => {
    if (t <= 0) return '-';
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(2);
    return `${m}:${s.padStart(5, '0')}`;
  };

  const getGapBadgeHtml = (gapPct) => {
    const gapStr = '+' + gapPct.toFixed(1) + '%';
    let bg, color, border;
    if (gapPct <= 5.0) {
      bg = 'rgba(16,185,129,0.25)'; color = '#34d399'; border = '1px solid rgba(16,185,129,0.5)';
    } else if (gapPct <= 25.0) {
      bg = 'rgba(234,179,8,0.25)';  color = '#fde047'; border = '1px solid rgba(234,179,8,0.5)';
    } else if (gapPct <= 60.0) {
      bg = 'rgba(249,115,22,0.25)'; color = '#ffab70'; border = '1px solid rgba(249,115,22,0.5)';
    } else if (gapPct <= 100.0) {
      bg = 'rgba(244,63,94,0.25)';  color = '#fca5a5'; border = '1px solid rgba(244,63,94,0.5)';
    } else {
      bg = 'rgba(239,68,68,0.25)';  color = '#f87171'; border = '1px solid rgba(239,68,68,0.5)';
    }
    return `<span style="background:${bg};color:${color};border:${border};padding:0.2em 0.6em;border-radius:2px;font-weight:700;font-family:monospace;font-size:0.85em;display:inline-block;">${gapStr}</span>`;
  };

  document.addEventListener('DOMContentLoaded', async () => {
    renderHeader('map');
    const dict = getDict();

    const urlParams = new URLSearchParams(window.location.search);
    const mapQuery  = urlParams.get('name');

    if (!mapQuery) {
      window.location.href = 'index.html';
      return;
    }

    document.title = `${mapQuery} — DDNet Map Mastery`;

    const arrowLeftHtml = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>';
    document.getElementById('icon-arrow-left').innerHTML     = arrowLeftHtml;
    document.getElementById('icon-arrow-left-err').innerHTML = arrowLeftHtml;
    document.getElementById('loader-icon').innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>';

    document.getElementById('map-back').textContent         = dict.map.back;
    document.getElementById('map-back-err').textContent     = dict.map.back;
    document.getElementById('map-loading').textContent      = dict.map.loading;
    document.getElementById('map-error').textContent        = dict.map.mapNotFound;
    document.getElementById('stat-record').textContent      = dict.map.statRecord;
    document.getElementById('stat-s').textContent           = dict.map.statS;
    document.getElementById('map-leaderboard-title').textContent = dict.map.title;
    document.getElementById('table-rank').textContent       = dict.map.tableRank;
    document.getElementById('table-player').textContent     = dict.map.tablePlayer;
    document.getElementById('table-time').textContent       = dict.map.tableTime;
    document.getElementById('table-gap').textContent        = dict.map.tableGap;
    document.getElementById('table-pts').textContent        = dict.map.tablePts;

    const loadMapData = async (limit) => {
      try {
        const data = await window.api.getMapLeaderboardLive(mapQuery, limit);

        // Update SEO title + description
        document.title = `${data.mapName} — DDNet Map Mastery`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.content = `${data.mapName} leaderboard — Skill Points ranking on DDNet Map Mastery.`;
        }

        document.getElementById('map-name').textContent     = data.mapName;
        document.getElementById('val-tbest').textContent    = formatTime(data.tBest);
        document.getElementById('val-s').textContent        = data.s.toFixed(2);

        const isEnriched = window.enrichedMapsData &&
          (window.enrichedMapsData[data.mapName] || window.enrichedMapsData[mapQuery]);
        const bannerEl = document.getElementById('enriched-banner');
        if (isEnriched && bannerEl) {
          document.getElementById('enriched-banner-text').textContent = dict.map.enrichedBanner;
          bannerEl.classList.remove('hidden');
        } else if (bannerEl) {
          bannerEl.classList.add('hidden');
        }

        const tbody = document.getElementById('map-body');
        tbody.innerHTML = '';

        data.leaderboard.forEach((row, idx) => {
          const tr = document.createElement('tr');
          tr.className = 'premium-table-row transition-colors';

          const gapPct = Math.max(0, (row.timeRatio - 1) * 100);

          let rankHtml = `<span class="text-slate-400 font-mono font-bold">#${idx + 1}</span>`;
          if (idx === 0) rankHtml = `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded font-bold text-sm shadow-[0_0_10px_rgba(251,191,36,0.3)]">#1</span>`;
          if (idx === 1) rankHtml = `<span class="bg-slate-300/20 text-slate-300 border border-slate-300/50 px-2 py-0.5 rounded font-bold text-sm">#2</span>`;
          if (idx === 2) rankHtml = `<span class="bg-amber-700/20 text-amber-600 border border-amber-700/50 px-2 py-0.5 rounded font-bold text-sm">#3</span>`;

          tr.innerHTML = `
            <td class="p-4">${rankHtml}</td>
            <td class="p-4 font-bold text-lg">
              <a href="player.html?name=${encodeURIComponent(row.player)}" class="text-white hover:text-amber-400 transition-colors">
                ${escapeHtml(row.player)}
              </a>
            </td>
            <td class="p-4 font-mono text-slate-100 font-medium">${formatTime(row.time)}</td>
            <td class="p-4">${getGapBadgeHtml(gapPct)}</td>
            <td class="p-4 font-bold text-emerald-400 text-right text-lg">${row.pSkill}</td>
          `;
          tbody.appendChild(tr);
        });

        if (limit < 100 && data.leaderboard.length >= limit) {
          document.getElementById('load-more-container').classList.remove('hidden');
          const btn = document.getElementById('btn-load-more');
          btn.textContent = dict.map.loadTop100;
          btn.onclick = () => {
            btn.textContent = '...';
            loadMapData(100);
          };
        } else {
          document.getElementById('load-more-container').classList.add('hidden');
        }

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('content').classList.remove('hidden');

      } catch (e) {
        console.error(e);
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.remove('hidden');
      }
    };

    loadMapData(20);
  });
})();
