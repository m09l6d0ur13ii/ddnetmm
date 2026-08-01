/* page-player.js — Logic for player.html */

(function () {
  'use strict';

  const formatTime = (t) => {
    if (t <= 0) return '-';
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(2);
    return `${m}:${s.padStart(5, '0')}`;
  };

  const getServerBadgeClass = (server) => {
    if (!server) return 'server-default';
    const s = server.toLowerCase();
    if (s.includes('novice'))    return 'server-novice';
    if (s.includes('moderate'))  return 'server-moderate';
    if (s.includes('brutal'))    return 'server-brutal';
    if (s.includes('insane'))    return 'server-insane';
    if (s.includes('solo'))      return 'server-solo';
    if (s.includes('dummy'))     return 'server-dummy';
    if (s.includes('oldschool')) return 'server-oldschool';
    return 'server-ddmax';
  };

  document.addEventListener('DOMContentLoaded', async () => {
    renderHeader('player');
    const dict = getDict();

    const urlParams  = new URLSearchParams(window.location.search);
    const playerName = urlParams.get('name');

    if (!playerName) {
      window.location.href = 'index.html';
      return;
    }

    // SEO
    document.title = `${playerName} — DDNet Map Mastery`;
    document.querySelector('meta[name="description"]').content =
      `${playerName} — Base PTS, Skill PTS and Total Mastery on DDNet Map Mastery.`;

    // Static UI text from i18n
    document.getElementById('loader-icon').innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>';

    document.getElementById('player-back').textContent             = dict.player.back;
    document.getElementById('player-loading').textContent          = dict.player.loading;
    document.getElementById('player-error').textContent            = dict.player.error;
    document.getElementById('stat-base').textContent               = dict.player.statBase;
    document.getElementById('stat-skill').textContent              = dict.player.statSkill;
    document.getElementById('stat-total').textContent              = dict.player.statTotal;
    document.getElementById('table-map').textContent               = dict.player.mapName;
    document.getElementById('table-server').textContent            = dict.player.mapServer;
    document.getElementById('table-time').textContent              = dict.player.mapTime;
    document.getElementById('table-base-col').textContent          = dict.player.tableBase;
    document.getElementById('table-skill-col').textContent         = dict.player.tableSkill;
    document.getElementById('table-top-col').textContent           = dict.player.tableTopDDNet;

    // Inline player search
    document.getElementById('inline-player-search-input').placeholder = dict.player.searchPlaceholder;
    document.getElementById('inline-player-search-btn').textContent   = dict.player.searchBtn;
    document.getElementById('inline-player-search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const target = document.getElementById('inline-player-search-input').value.trim();
      if (target) window.location.href = `player.html?name=${encodeURIComponent(target)}`;
    });
    setupPlayerAutocomplete('inline-player-search-input');

    // Blacklist check
    if (window.isBlacklisted && window.isBlacklisted(playerName)) {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('player-error').innerHTML = `
        <div style="background:rgba(239,68,68,0.15);border:2px solid #ef4444;padding:1.5rem;text-align:center;margin:1.5rem 0;">
          <h2 style="font-size:1.5rem;font-weight:bold;color:#f87171;margin-bottom:0.5rem;">
            ${currentLang === 'en' ? 'Player Banned' : 'Игрок заблокирован'}
          </h2>
          <p style="color:#fca5a5;font-weight:500;">
            ${currentLang === 'en'
              ? 'This player is blacklisted in Map Mastery system (TAS / Cheating).'
              : 'Этот никнейм находится в чёрном списке системы Map Mastery (TAS / Читы).'}
          </p>
        </div>
      `;
      document.getElementById('error').classList.remove('hidden');
      return;
    }

    try {
      // Single API call — finishDetails already computed inside fetchPlayerPts
      const data = await window.api.fetchPlayerPts(playerName);

      document.getElementById('player-name').textContent  = data.name;
      document.getElementById('val-base').textContent     = data.newPtsBase.toLocaleString();
      document.getElementById('val-skill').textContent    = data.newPtsSkill.toLocaleString();
      document.getElementById('val-total').textContent    = data.newPtsTotal.toLocaleString();

      const topMaps = data.finishDetails || [];

      document.getElementById('player-maps-title').textContent =
        `${dict.player.mapsWithSkillBonus} (${topMaps.length})`;

      const tbody = document.getElementById('maps-body');

      topMaps.forEach(map => {
        const tr = document.createElement('tr');
        tr.className = 'premium-table-row transition-colors';
        tr.innerHTML = `
          <td class="p-4 font-bold">
            <a href="map.html?name=${encodeURIComponent(map.mapName)}" class="text-white hover:text-amber-400 transition-colors">
              ${escapeHtml(map.mapName)}
            </a>
          </td>
          <td class="p-4"><span class="server-badge ${getServerBadgeClass(map.server)}">${escapeHtml(map.server)}</span></td>
          <td class="p-4 font-mono text-slate-100 font-medium text-right">${formatTime(map.time)}</td>
          <td class="p-4 font-semibold text-emerald-400 text-right">${map.pBase > 0 ? '+' + map.pBase : '0'}</td>
          <td class="p-4 font-bold text-purple-400 text-right">${map.pSkill > 0 ? '+' + map.pSkill : '0'}</td>
          <td class="p-4 font-bold text-amber-300 text-center">#${map.rank}</td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById('loading').classList.add('hidden');
      document.getElementById('content').classList.remove('hidden');

    } catch (e) {
      console.error(e);
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('error').classList.remove('hidden');
    }
  });
})();
