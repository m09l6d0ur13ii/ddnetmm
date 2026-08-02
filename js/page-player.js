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

    const shareTextEl = document.getElementById('share-profile-text');
    if (shareTextEl) shareTextEl.textContent = dict.player.shareBtn || 'Share Profile';

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

      const shareBtn = document.getElementById('share-profile-btn');
      if (shareBtn) {
        shareBtn.addEventListener('click', () => {
          const cardText = `${data.name} | base: ${data.newPtsBase} | skill: ${data.newPtsSkill} | total: ${data.newPtsTotal} | https://m09l6d0ur13ii.github.io/ddnetmm`;
          navigator.clipboard.writeText(cardText).then(() => {
            if (shareTextEl) {
              const origText = dict.player.shareBtn || 'Share Profile';
              shareTextEl.textContent = dict.player.copied || 'Скопировано!';
              setTimeout(() => {
                shareTextEl.textContent = origText;
              }, 2000);
            }
          }).catch(err => {
            console.error('Copy failed:', err);
          });
        });
      }

      const allMaps = data.finishDetails || [];

      const renderFilteredMaps = () => {
        const catFilter = document.getElementById('map-filter-server')?.value || 'ALL';
        const searchQuery = (document.getElementById('map-search-input')?.value || '').toLowerCase().trim();
        const sortOrder = document.getElementById('map-sort-order')?.value || 'skill-desc';

        let list = allMaps.filter(m => {
          if (catFilter !== 'ALL') {
            const s = (m.server || '').toLowerCase();
            if (catFilter.toLowerCase() === 'ddmax') {
              if (!s.includes('ddmax')) return false;
            } else if (s !== catFilter.toLowerCase()) {
              return false;
            }
          }
          if (searchQuery) {
            if (!m.mapName.toLowerCase().includes(searchQuery)) return false;
          }
          return true;
        });

        // Sorting
        list.sort((a, b) => {
          if (sortOrder === 'skill-desc') return b.pSkill - a.pSkill;
          if (sortOrder === 'skill-asc')  return a.pSkill - b.pSkill;
          if (sortOrder === 'time-asc')   return a.time - b.time;
          if (sortOrder === 'time-desc')  return b.time - a.time;
          if (sortOrder === 'name-asc')   return a.mapName.localeCompare(b.mapName);
          return 0;
        });

        const countText = list.length === allMaps.length
          ? `(${allMaps.length})`
          : `(${list.length} / ${allMaps.length})`;

        document.getElementById('player-maps-title').textContent =
          `${dict.player.mapsWithSkillBonus} ${countText}`;

        const tbody = document.getElementById('maps-body');
        tbody.innerHTML = '';

        if (list.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-500">${currentLang === 'en' ? 'No maps match filter' : 'Нет карт, соответствующих фильтру'}</td></tr>`;
          return;
        }

        list.forEach(map => {
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
            <td class="p-4 font-bold text-amber-300 text-center"><span class="ranking-position-badge ranking-position-${map.rank <= 3 ? map.rank : 'other'}">#${map.rank}</span></td>
          `;
          tbody.appendChild(tr);
        });
      };

      ['map-filter-server', 'map-sort-order'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderFilteredMaps);
      });
      const searchInput = document.getElementById('map-search-input');
      if (searchInput) searchInput.addEventListener('input', renderFilteredMaps);

      renderFilteredMaps();

      document.getElementById('loading').classList.add('hidden');
      document.getElementById('content').classList.remove('hidden');

    } catch (e) {
      console.error(e);
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('error').classList.remove('hidden');
    }
  });
})();
