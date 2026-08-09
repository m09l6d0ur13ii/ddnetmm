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
  };

  const renderPlayerTee = async (data) => {
    const container = document.getElementById('player-tee-container');
    if (!container) return;

    container.innerHTML = '';

    let skinName = data.skinName || 'default';
    if (!skinName || skinName === 'null') skinName = 'default';

    const localSkinUrl = `../data/skins/${encodeURIComponent(skinName)}.png`;
    const remoteSkinUrl = `https://skins.ddstats.tw/${encodeURIComponent(skinName)}.png`;
    const defaultSkinUrl = `https://skins.ddstats.tw/default.png`;

    const checkImage = (url) => new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });

    let finalSkinUrl = localSkinUrl;
    if (!(await checkImage(localSkinUrl))) {
      if (await checkImage(remoteSkinUrl)) {
        finalSkinUrl = remoteSkinUrl;
      } else {
        finalSkinUrl = defaultSkinUrl;
      }
    }

    const config = {
      skinUrl: finalSkinUrl,
      followMouse: true,
      eyes: 'normal',
      direction: 'right',
    };

    if (data.skinColorBody !== null && data.skinColorBody !== undefined) {
      config.colorBody = Number(data.skinColorBody);
      config.useCustomColor = true;
    }
    if (data.skinColorFeet !== null && data.skinColorFeet !== undefined) {
      config.colorFeet = Number(data.skinColorFeet);
      config.useCustomColor = true;
    }

    try {
      if (window.TeeSkinRenderer && typeof window.TeeSkinRenderer.createAsync === 'function') {
        const teeElement = await window.TeeSkinRenderer.createAsync(config);
        teeElement.style.fontSize = '1.3px';
        container.appendChild(teeElement);
      }
    } catch (err) {
      console.warn('Failed to render player Tee skin:', err);
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    renderHeader('player');
    const dict = getDict();

    const urlParams  = new URLSearchParams(window.location.search);
    const playerName = urlParams.get('name');

    if (!playerName) {
      window.location.href = './';
      return;
    }

    const setTxt = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };
    const setHtml = (id, html) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    };

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = `${playerName} — Base PTS, Skill PTS and Total Mastery on DDNet Map Mastery.`;
    }

    // Static UI text from i18n
    setHtml('loader-icon', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>');

    setTxt('player-back', dict.player.back);
    setTxt('player-loading', dict.player.loading);
    setTxt('player-error', dict.player.error);
    setTxt('stat-base', dict.player.statBase);
    setTxt('stat-skill', dict.player.statSkill);
    setTxt('stat-total', dict.player.statTotal);
    setTxt('table-map', dict.player.mapName || dict.player.map || 'Карта');
    setTxt('table-server', dict.player.mapServer || dict.player.category || 'Сервер');
    setTxt('table-time', dict.player.mapTime || dict.player.time || 'Время');
    setTxt('table-base-col', dict.player.tableBase || 'Base');
    setTxt('table-skill-col', dict.player.tableSkill || 'Skill Bonus');
    setTxt('table-top-col', dict.player.tableTopDDNet || 'Top DDNet');

    const shareTextEl = document.getElementById('share-profile-text');
    if (shareTextEl) shareTextEl.textContent = dict.player.shareBtn || 'Share Profile';

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
      if (typeof renderBreadcrumbs === 'function') {
        const homeLabel = dict.breadcrumbs ? dict.breadcrumbs.home : 'Home';
        renderBreadcrumbs([
          { label: homeLabel, url: '/' },
          { label: data.name }
        ]);
      }
      renderPlayerTee(data);
      document.getElementById('val-base').textContent     = data.newPtsBase.toLocaleString();
      document.getElementById('val-skill').textContent    = data.newPtsSkill.toLocaleString();
      document.getElementById('val-total').textContent    = data.newPtsTotal.toLocaleString();

      const shareBtn = document.getElementById('share-profile-btn');
      if (shareBtn) {
        shareBtn.addEventListener('click', () => {
          const cardText = `${data.name} | base: ${data.newPtsBase} | skill: ${data.newPtsSkill} | total: ${data.newPtsTotal} | https://ddnetmm.ru/player?name=${encodeURIComponent(data.name)}`;
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

      const allMaps = (data.finishDetails || []).filter(m => m.pSkill > 0);

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

        const fragment = document.createDocumentFragment();
        list.forEach(map => {
          const tr = document.createElement('tr');
          tr.className = 'premium-table-row transition-colors';

          const isSoloCategory = ['solo', 'race'].includes((map.server || '').toLowerCase());
          const isSoloOnTeamMap = !isSoloCategory && (map.server !== 'Dummy') && (!map.rank || map.rank === '—');

          let rankDisplay = '—';
          if (typeof map.rank === 'number' && map.rank > 0) {
            rankDisplay = '#' + map.rank;
          } else if (map.rank === '???') {
            rankDisplay = '???';
          } else if (isSoloOnTeamMap) {
            rankDisplay = '— (Solo)';
          } else if (map.rank) {
            rankDisplay = String(map.rank);
          }

          if (typeof map.rank === 'number' && map.rank <= 3) {
            tr.classList.add('top-rank-row', `top-rank-${map.rank}`);
          }

          const rankBadgeClass = (typeof map.rank === 'number' && map.rank <= 3)
            ? `ranking-position-${map.rank}`
            : (isSoloOnTeamMap ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' : 'ranking-position-other');

          tr.innerHTML = `
            <td class="p-4 font-bold">
              <a href="/map?name=${encodeURIComponent(map.mapName)}" class="text-white hover:text-amber-400 transition-colors">
                ${escapeHtml(map.mapName)}
              </a>
            </td>
            <td class="p-4"><span class="server-badge ${getServerBadgeClass(map.server)}">${escapeHtml(map.server)}</span></td>
            <td class="p-4 font-mono text-slate-100 font-medium text-right">${formatTime(map.time)}</td>
            <td class="p-4 font-semibold text-emerald-400 text-right">${map.pBase > 0 ? '+' + map.pBase : '0'}</td>
            <td class="p-4 font-bold text-right">${map.pSkill > 0 ? '<span class="text-purple-400">+' + map.pSkill + '</span>' : '<span class="text-rose-400 font-semibold">0</span>'}</td>
            <td class="p-4 font-bold text-center"><span class="ranking-position-badge ${rankBadgeClass}">${escapeHtml(rankDisplay)}</span></td>
          `;
          fragment.appendChild(tr);
        });
        tbody.appendChild(fragment);
      };

      ['map-filter-server', 'map-sort-order'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderFilteredMaps);
      });
      const searchInput = document.getElementById('map-search-input');
      if (searchInput) {
        let searchTimer;
        searchInput.addEventListener('input', () => {
          clearTimeout(searchTimer);
          searchTimer = setTimeout(renderFilteredMaps, 120);
        });

        if (window.setupMapAutocomplete) {
          window.setupMapAutocomplete('map-search-input', () => {
            renderFilteredMaps();
          });
        }
      }

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
