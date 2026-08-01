/* page-map.js — Logic for map.html */

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

    const setElemText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setElemText('map-back', dict.map.back);
    setElemText('map-back-err', dict.map.back);
    setElemText('map-loading', dict.map.loading);
    setElemText('map-error', dict.map.mapNotFound);
    setElemText('stat-record', dict.map.statRecord);
    setElemText('stat-s', dict.map.statS);
    setElemText('map-leaderboard-title', dict.map.title);
    setElemText('table-rank', dict.map.tableRank);
    setElemText('table-player', dict.map.tablePlayer);
    setElemText('table-time', dict.map.tableTime);
    setElemText('table-gap', dict.map.tableGap);
    setElemText('table-pts', dict.map.tablePts);

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

        // Map Meta Tags (Server category, Base PTS, Mapper)
        const metaTagsContainer = document.getElementById('map-meta-tags');
        if (metaTagsContainer) {
          const mapInfo = (window.mapsData || []).find(m => (m.map || m.name || '').toLowerCase() === data.mapName.toLowerCase());
          let tagsHtml = '';
          if (mapInfo) {
            if (mapInfo.server) {
              tagsHtml += `<span class="server-badge ${getServerBadgeClass(mapInfo.server)}">${escapeHtml(mapInfo.server)}</span>`;
            }
            if (mapInfo.points) {
              tagsHtml += `<span class="text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2.5 py-0.5 border border-emerald-500/30 text-xs">Base: ${mapInfo.points} PTS</span>`;
            }
            if (mapInfo.mapper) {
              tagsHtml += `<span class="text-slate-400 text-xs font-medium">by <strong class="text-slate-200">${escapeHtml(mapInfo.mapper)}</strong></span>`;
            }
          }
          metaTagsContainer.innerHTML = tagsHtml;
        }

        const isEnriched = window.enrichedMapsData &&
          (window.enrichedMapsData[data.mapName] || window.enrichedMapsData[mapQuery]);
        const bannerEl = document.getElementById('enriched-banner');
        if (isEnriched && bannerEl) {
          document.getElementById('enriched-banner-text').textContent = dict.map.enrichedBanner;
          bannerEl.classList.remove('hidden');
        } else if (bannerEl) {
          bannerEl.classList.add('hidden');
        }

        const mapInfo = (window.mapsData || []).find(m => (m.map || m.name || '').toLowerCase() === data.mapName.toLowerCase());
        const isDummy = mapInfo && (mapInfo.server === 'Dummy');
        const dummyTabsContainer = document.getElementById('dummy-tabs-container');

        const renderLeaderboardRows = (rowsList) => {
          const grouped = [];
          rowsList.forEach((row) => {
            const rowNames = String(row.player).split(/[,&]+/).map(n => n.trim()).filter(Boolean);
            const last = grouped[grouped.length - 1];

            const isSameTeam = last &&
              Math.abs(last.time - row.time) < 0.001 &&
              (!last.timestamp || !row.timestamp || last.timestamp === row.timestamp);

            if (isSameTeam) {
              rowNames.forEach(name => {
                if (!last.players.includes(name)) last.players.push(name);
              });
            } else {
              grouped.push({
                time: row.time,
                timestamp: row.timestamp || null,
                players: rowNames
              });
            }
          });

          // Fastest time for current view mode
          const modeTBest = grouped.length > 0 ? grouped[0].time : data.tBest;
          document.getElementById('val-tbest').textContent = formatTime(modeTBest);

          const tbody = document.getElementById('map-body');
          tbody.innerHTML = '';

          if (grouped.length === 0) {
            const noRecText = (typeof getLang === 'function' && getLang() === 'en') ? 'No records in this category' : 'Нет рекордов в этой категории';
            tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">${noRecText}</td></tr>`;
            return;
          }

          const mapBasePts = mapInfo ? (mapInfo.points || 0) : 0;
          const pMaxBonus = mapBasePts * 5.0;

          let currentRank = 1;
          grouped.forEach((group) => {
            const tr = document.createElement('tr');
            tr.className = 'premium-table-row transition-colors';

            const timeRatio = modeTBest > 0 ? group.time / modeTBest : 1;
            const gapPct = Math.max(0, (timeRatio - 1) * 100);
            const pSkill = Math.floor(pMaxBonus * Math.exp(-data.s * (Math.max(1, timeRatio) - 1)));

            let rankHtml = `<span class="text-slate-400 font-mono font-bold">#${currentRank}</span>`;
            if (currentRank === 1) rankHtml = `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded font-bold text-sm shadow-[0_0_10px_rgba(251,191,36,0.3)]">#1</span>`;
            else if (currentRank === 2) rankHtml = `<span class="bg-slate-300/20 text-slate-300 border border-slate-300/50 px-2 py-0.5 rounded font-bold text-sm">#2</span>`;
            else if (currentRank === 3) rankHtml = `<span class="bg-amber-700/20 text-amber-600 border border-amber-700/50 px-2 py-0.5 rounded font-bold text-sm">#3</span>`;

            const playersHtml = group.players.map(pName =>
              `<a href="player.html?name=${encodeURIComponent(pName)}" class="text-white hover:text-amber-400 transition-colors whitespace-nowrap">${escapeHtml(pName)}</a>`
            ).join(' <span class="text-amber-400 font-bold px-0.5">&amp;</span> ');

            tr.innerHTML = `
              <td class="p-4">${rankHtml}</td>
              <td class="p-4 font-bold text-lg whitespace-normal">
                <div class="flex flex-wrap items-center gap-x-1 gap-y-1">
                  ${playersHtml}
                </div>
              </td>
              <td class="p-4 font-mono text-slate-100 font-medium">${formatTime(group.time)}</td>
              <td class="p-4">${getGapBadgeHtml(gapPct)}</td>
              <td class="p-4 font-bold text-emerald-400 text-right text-lg">${pSkill}</td>
            `;
            tbody.appendChild(tr);

            currentRank += group.players.length;
          });
        };

        if (isDummy && dummyTabsContainer) {
          dummyTabsContainer.classList.remove('hidden');

          const soloList = data.leaderboard.filter(item => !item.isTeamRank && !String(item.player).includes(' & '));
          const teamList = data.leaderboard.filter(item => item.isTeamRank || String(item.player).includes(' & '));

          document.getElementById('count-dummy-solo').textContent = soloList.length;
          document.getElementById('count-dummy-team').textContent = teamList.length;

          const btnSolo = document.getElementById('tab-dummy-solo');
          const btnTeam = document.getElementById('tab-dummy-team');

          const switchTab = (mode) => {
            const activeStyle = 'padding:0.4em 1em;font-size:1.1em;font-weight:bold;background:#ffa500;color:#000;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:0.4em;';
            const inactiveStyle = 'padding:0.4em 1em;font-size:1.1em;font-weight:bold;background:rgba(255,255,255,0.05);color:#9a9a9a;border:1px solid rgba(255,255,255,0.15);cursor:pointer;display:inline-flex;align-items:center;gap:0.4em;';

            if (mode === 'solo') {
              btnSolo.setAttribute('style', activeStyle);
              btnTeam.setAttribute('style', inactiveStyle);
              renderLeaderboardRows(soloList);
            } else {
              btnTeam.setAttribute('style', activeStyle);
              btnSolo.setAttribute('style', inactiveStyle);
              renderLeaderboardRows(teamList);
            }
          };

          btnSolo.onclick = () => switchTab('solo');
          btnTeam.onclick = () => switchTab('team');

          switchTab('solo');
        } else {
          if (dummyTabsContainer) dummyTabsContainer.classList.add('hidden');
          renderLeaderboardRows(data.leaderboard);
        }

        document.getElementById('load-more-container').classList.add('hidden');

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('content').classList.remove('hidden');

      } catch (e) {
        console.error(e);
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.remove('hidden');
      }
    };

    loadMapData(999999);
  });
})();
