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

  const setupMapPreview = (mapName) => {
    const viewerUrl = `https://ddnet.org/mappreview/?map=${encodeURIComponent(mapName)}`;
    const viewer = document.getElementById('map-viewer');
    const viewerStage = document.getElementById('map-viewer-stage');
    const bgFrame = document.getElementById('map-background-frame');

    if (bgFrame && !bgFrame.src) {
      bgFrame.src = viewerUrl;
    }

    const mapExtLink = document.getElementById('map-external-link');
    if (mapExtLink) {
      mapExtLink.href = viewerUrl;
      const textSpan = mapExtLink.querySelector('span');
      if (textSpan) {
        textSpan.textContent = currentLang === 'en' ? 'View map' : 'Посмотреть карту';
      }

      mapExtLink.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();

        let modalFrame = document.getElementById('map-modal-iframe');
        if (!modalFrame) {
          modalFrame = document.createElement('iframe');
          modalFrame.id = 'map-modal-iframe';
          modalFrame.title = `DDNet map viewer - ${mapName}`;
          modalFrame.loading = 'lazy';
          modalFrame.allow = 'fullscreen';
          modalFrame.style.width = '100%';
          modalFrame.style.height = '100%';
          modalFrame.style.border = '0';
        }
        modalFrame.src = viewerUrl;

        if (viewerStage) {
          viewerStage.innerHTML = '';
          viewerStage.appendChild(modalFrame);
        }

        const viewerTitle = document.getElementById('map-viewer-title');
        if (viewerTitle) viewerTitle.textContent = mapName;

        if (viewer) {
          viewer.classList.remove('hidden');
          document.documentElement.classList.add('map-viewer-open');
          document.body.classList.add('map-viewer-open');
          const closeBtn = document.getElementById('map-viewer-close');
          if (closeBtn) closeBtn.focus();
        }
      });
    }

    const closeViewer = () => {
      if (viewer) viewer.classList.add('hidden');
      document.documentElement.classList.remove('map-viewer-open', 'map-interacting');
      document.body.classList.remove('map-viewer-open', 'map-interacting');
    };

    const closeBtn = document.getElementById('map-viewer-close');
    if (closeBtn) {
      closeBtn.onclick = closeViewer;
    }

    document.addEventListener('keydown', (event) => {
      if (viewer && !viewer.classList.contains('hidden')) {
        if (event.key === 'Escape') closeViewer();
      }
    });
  };

  document.addEventListener('DOMContentLoaded', async () => {
    renderHeader('map');
    const dict = getDict();

    const urlParams = new URLSearchParams(window.location.search);
    const mapQuery  = urlParams.get('name');

    if (!mapQuery) {
      window.location.replace('/');
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
    setElemText('btn-load-more', dict.map.loadTop100);

    const loadMapData = async (limit) => {
      try {
        const data = await window.api.getMapLeaderboardLive(mapQuery, limit);

        // Update SEO title + description
        document.title = `${data.mapName} — DDNet Map Mastery`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.content = `${data.mapName} leaderboard — Skill Points ranking on DDNet Map Mastery.`;
        }
        const canonicalUrl = `https://ddnetmm.ru/map?name=${encodeURIComponent(data.mapName)}`;
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) canonical.href = canonicalUrl;
        setElemText('map-table-caption', `${data.mapName} — ${dict.map.title}`);

        document.getElementById('map-name').textContent     = data.mapName;
        document.getElementById('val-tbest').textContent    = formatTime(data.tBest);
        document.getElementById('val-s').textContent        = data.s.toFixed(2);
        setupMapPreview(data.mapName);

        // Map Meta Tags (Server category, Base PTS, Mapper)
        const metaTagsContainer = document.getElementById('map-meta-tags');
        const mapInfo = (window.mapsData || []).find(m => (m.map || m.name || '').toLowerCase() === data.mapName.toLowerCase());
        if (metaTagsContainer) {
          let tagsHtml = '';
          if (mapInfo) {
            if (mapInfo.server) {
              tagsHtml += `<span class="server-badge ${getServerBadgeClass(mapInfo.server)}">${escapeHtml(mapInfo.server)}</span>`;
            }
            if (mapInfo.points) {
              tagsHtml += `<span class="map-meta-points">Base: ${mapInfo.points} PTS</span>`;
            }
            if (mapInfo.mapper) {
              tagsHtml += `<span class="map-meta-mapper">by <strong>${escapeHtml(mapInfo.mapper)}</strong></span>`;
            }
          }
          metaTagsContainer.innerHTML = tagsHtml;
        }

        const enrichedKey = Object.keys(window.enrichedMapsData || {}).find(key => key.toLowerCase() === data.mapName.toLowerCase());
        const isEnriched = Boolean(enrichedKey);
        const bannerEl = document.getElementById('enriched-banner');
        if (isEnriched && bannerEl) {
          document.getElementById('enriched-banner-text').textContent = dict.map.enrichedBanner;
          bannerEl.classList.remove('hidden');
        } else if (bannerEl) {
          bannerEl.classList.add('hidden');
        }

        const isDummy = mapInfo && (mapInfo.server === 'Dummy');
        const dummyTabsContainer = document.getElementById('dummy-tabs-container');

        const renderLeaderboardRows = (rowsList) => {
          const grouped = rowsList.map((row) => {
            const cleanName = (n) => String(n).replace(/[\u200B-\u200D\uFEFF\uDB40\uDC00-\uDC7F]/g, '').trim();
            const rowNames = (Array.isArray(row.players)
              ? row.players
              : row.isTeamRank ? String(row.player).split(' & ') : [row.player])
              .map(n => n.trim())
              .filter(n => n && cleanName(n).length > 0);
            return { time: row.time, rank: row.rank, players: rowNames };
          });

          // Fastest time for current view mode
          const modeTBest = grouped.length > 0 ? grouped[0].time : data.tBest;
          document.getElementById('val-tbest').textContent = formatTime(modeTBest);

          const tbody = document.getElementById('map-body');
          tbody.innerHTML = '';
          const loadMoreContainer = document.getElementById('load-more-container');
          const loadMoreButton = document.getElementById('btn-load-more');

          if (grouped.length === 0) {
            const noRecText = (typeof getLang === 'function' && getLang() === 'en') ? 'No records in this category' : 'Нет рекордов в этой категории';
            tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">${noRecText}</td></tr>`;
            loadMoreContainer.classList.add('hidden');
            return;
          }

          const mapBasePts = mapInfo ? (mapInfo.points || 0) : 0;
          const pMaxBonus = mapBasePts * 5.0;

          let renderedCount = 0;
          let previousTime = null;
          let previousRank = 0;
          const appendBatch = () => {
            const fragment = document.createDocumentFragment();
            grouped.slice(renderedCount, renderedCount + 100).forEach((group, batchIndex) => {
            const index = renderedCount + batchIndex;
            const displayRank = group.rank || (group.time === previousTime ? previousRank : index + 1);
            previousTime = group.time;
            previousRank = displayRank;
            const tr = document.createElement('tr');
            tr.className = 'premium-table-row transition-colors';
            if (displayRank <= 3) tr.classList.add('top-rank-row', `top-rank-${displayRank}`);

            const timeRatio = modeTBest > 0 ? group.time / modeTBest : 1;
            const gapPct = Math.max(0, (timeRatio - 1) * 100);
            const pSkill = Math.floor(pMaxBonus * Math.exp(-data.s * (Math.max(1, timeRatio) - 1)));

            let rankHtml = `<span class="ranking-position-badge">#${displayRank}</span>`;
            if (displayRank <= 3) rankHtml = `<span class="ranking-position-badge ranking-position-${displayRank}">#${displayRank}</span>`;

            const playersHtml = group.players.map(pName =>
              `<a href="/player?name=${encodeURIComponent(pName)}" class="text-white hover:text-amber-400 transition-colors whitespace-nowrap">${escapeHtml(pName)}</a>`
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
            fragment.appendChild(tr);
            });
            renderedCount = Math.min(renderedCount + 100, grouped.length);
            tbody.appendChild(fragment);
            loadMoreContainer.classList.toggle('hidden', renderedCount >= grouped.length);
          };
          loadMoreButton.onclick = appendBatch;
          appendBatch();
        };

        if (isDummy && dummyTabsContainer) {
          dummyTabsContainer.classList.remove('hidden');

          const soloList = data.leaderboard.filter(item => !item.isTeamRank && !String(item.player).includes(' & '));
          const teamList = data.leaderboard.filter(item => {
            if (!item.isTeamRank && !String(item.player).includes(' & ')) return false;
            const pNames = item.players || String(item.player).split(' & ').map(n => n.trim()).filter(Boolean);
            return pNames.length <= 2;
          });

          document.getElementById('count-dummy-solo').textContent = soloList.length;
          document.getElementById('count-dummy-team').textContent = teamList.length;

          const btnSolo = document.getElementById('tab-dummy-solo');
          const btnTeam = document.getElementById('tab-dummy-team');

          const switchTab = (mode) => {
            if (mode === 'solo') {
              btnSolo.classList.add('is-active');
              btnTeam.classList.remove('is-active');
              btnSolo.setAttribute('aria-pressed', 'true');
              btnTeam.setAttribute('aria-pressed', 'false');
              renderLeaderboardRows(soloList);
            } else {
              btnTeam.classList.add('is-active');
              btnSolo.classList.remove('is-active');
              btnTeam.setAttribute('aria-pressed', 'true');
              btnSolo.setAttribute('aria-pressed', 'false');
              renderLeaderboardRows(teamList);
            }
          };

          btnSolo.onclick = () => switchTab('solo');
          btnTeam.onclick = () => switchTab('team');

          const initialMode = (soloList.length === 0 && teamList.length > 0) ? 'team' : 'solo';
          switchTab(initialMode);
        } else {
          if (dummyTabsContainer) dummyTabsContainer.classList.add('hidden');
          renderLeaderboardRows(data.leaderboard);
        }

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('content').classList.remove('hidden');
        if (window.finishInitialLoading) window.finishInitialLoading();

      } catch (e) {
        console.error(e);
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.remove('hidden');
        if (window.finishInitialLoading) window.finishInitialLoading();
      }
    };

    loadMapData(999999);
  });
})();
