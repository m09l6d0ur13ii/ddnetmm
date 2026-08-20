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
    const setElemHtml = (id, html) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    };

    setElemHtml('icon-arrow-left', arrowLeftHtml);
    setElemHtml('icon-arrow-left-err', arrowLeftHtml);
    setElemHtml('loader-icon',
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>');

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
        
        if (window.api.getMapAverageTime) {
          const avgTime = window.api.getMapAverageTime(data.leaderboard);
          document.getElementById('val-avg').textContent = avgTime ? formatTime(avgTime) : '—';
        }
        
        setupMapPreview(data.mapName);

        const renderDecayChart = () => {
          const chartContainer = document.getElementById('map-decay-chart-container');
          const wrapper = document.getElementById('map-decay-svg-wrapper');
          if (!chartContainer || !wrapper || !data.tBest || !data.s) return;
          
          const mapInfoObj = (window.mapsData || []).find(m => (m.map || m.name || '').toLowerCase() === data.mapName.toLowerCase());
          const mapBasePts = mapInfoObj ? (mapInfoObj.points || 0) : 0;
          if (mapBasePts === 0) return; 

          chartContainer.classList.remove('hidden');

          const wrPts = Math.floor(mapBasePts * 5.0);
          const midPts = Math.floor((mapBasePts * 5.0) * Math.exp(-data.s * 0.5));
          document.getElementById('val-decay-wr').textContent = '+' + wrPts;
          document.getElementById('val-decay-mid').textContent = '+' + midPts;

          const w = 400;
          const h = 180;
          let pathD = `M 0,${h} `;
          let first = true;
          for (let x = 0; x <= w; x += 10) {
            const ratio = 1.0 + (x / w) * 1.5; 
            const pts = (mapBasePts * 5.0) * Math.exp(-data.s * (ratio - 1));
            const y = h - (pts / wrPts) * (h - 30) - 15;
            if (first) {
              pathD += `L ${x},${y} `;
              first = false;
            } else {
              pathD += `L ${x},${y} `;
            }
          }
          
          wrapper.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}">
              <path d="${pathD}" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          `;
        };
        renderDecayChart();

        // Render Personal Record Card if myNickname is set
        const renderMyRecordCard = () => {
          const card = document.getElementById('my-map-record-card');
          if (!card) return;

          const settings = typeof getSettings === 'function' ? getSettings() : { myNickname: '' };
          const myNick = settings.myNickname ? settings.myNickname.trim() : '';
          if (!myNick) {
            card.classList.add('hidden');
            return;
          }

          const myLower = myNick.toLowerCase();
          const t = dict.map || {};

          // Priority 1: Check live leaderboard of the current map
          let leaderboardMatch = null;
          if (data && Array.isArray(data.leaderboard)) {
            leaderboardMatch = data.leaderboard.find(r => {
              const pNames = (Array.isArray(r.players) ? r.players : String(r.player || '').split(/[,/&]+/)).map(n => n.trim().toLowerCase());
              return pNames.includes(myLower);
            });
          }

          // Priority 2: Fallback to user profile cache
          const cache = typeof getUserProfileCache === 'function' ? getUserProfileCache() : null;
          const finishes = (cache && cache.finishes) ? cache.finishes : [];
          const cacheFinish = finishes.find(f => (f.map || f.mapName || '').toLowerCase() === data.mapName.toLowerCase());

          if (!leaderboardMatch && !cacheFinish) {
            card.className = 'glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md shadow-xl transition-all';
            card.innerHTML = `
              <div class="flex items-center justify-between flex-wrap gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg shrink-0">👤</div>
                  <div>
                    <div class="text-xs font-bold text-amber-400 uppercase tracking-wider">${escapeHtml(myNick)} — ${t.myRecordTitle || 'Ваш результат'}</div>
                    <div class="text-sm text-slate-300 font-medium">${t.myRecordNotFinished || 'Карта ещё не пройдена вашим никнеймом'}</div>
                  </div>
                </div>
                <a href="/player?name=${encodeURIComponent(myNick)}" class="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-all">${t.myProfileBtn || 'Мой профиль 👤'}</a>
              </div>
            `;
            card.classList.remove('hidden');
            return;
          }

          let rank = '-';
          let timeVal = 0;
          let partnerNames = null;

          if (leaderboardMatch) {
            rank = leaderboardMatch.rank || '-';
            timeVal = leaderboardMatch.time;
            const pNames = Array.isArray(leaderboardMatch.players) ? leaderboardMatch.players : String(leaderboardMatch.player || '').split('&').map(s => s.trim());
            const otherPlayers = pNames.filter(p => p.toLowerCase() !== myLower);
            if (otherPlayers.length > 0) {
              partnerNames = otherPlayers.join(' & ');
            }
          } else if (cacheFinish) {
            rank = cacheFinish.rank || '-';
            timeVal = cacheFinish.time;
            partnerNames = cacheFinish.teamPartner || cacheFinish.partner || null;
          }

          const timeFormatted = formatTime(timeVal);
          const gapText = (timeVal && data.tBest) ? `+${(((timeVal / data.tBest) - 1) * 100).toFixed(1)}%` : '0.0%';

          const mapInfoObj = (window.mapsData || []).find(m => (m.map || m.name || '').toLowerCase() === data.mapName.toLowerCase());
          const mapServer = mapInfoObj ? (mapInfoObj.server || 'Novice') : 'Novice';
          const isSoloCategory = ['solo', 'race'].includes(mapServer.toLowerCase());

          // A run is a Team run if partners exist OR if marked as team rank
          const isTeamRun = Boolean(partnerNames && partnerNames.length > 0) || (leaderboardMatch && leaderboardMatch.isTeamRank);
          const isSoloOnTeamMap = !isSoloCategory && (mapServer !== 'Dummy') && !isTeamRun;

          const mapBasePts = mapInfoObj ? (mapInfoObj.points || 0) : 0;
          const pSkill = isSoloOnTeamMap ? 0 : Math.floor((mapBasePts * 5.0) * Math.exp(-data.s * (Math.max(1, timeVal / (data.tBest || timeVal)) - 1)));

          if (isSoloOnTeamMap) {
            card.className = 'glass-panel p-5 sm:p-6 rounded-2xl border border-rose-500/50 bg-gradient-to-r from-rose-500/10 via-slate-900/60 to-slate-900/90 backdrop-blur-md shadow-xl transition-all';
          } else {
            card.className = 'glass-panel p-5 sm:p-6 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-slate-900/50 to-slate-900/80 backdrop-blur-md shadow-xl transition-all';
          }

          const warningHtml = isSoloOnTeamMap ? `
            <div class="mt-3 p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-300 text-xs sm:text-sm font-semibold flex items-center gap-3">
              <span class="text-xl shrink-0">⚠️</span>
              <div>
                <strong>${t.myRecordSoloWarningTitle || (currentLang === 'en' ? 'Solo finish on Team map!' : 'Вы прошли эту карту соло (без команды)!')}</strong>
                <p class="text-rose-200/80 font-normal mt-0.5">${t.myRecordSoloWarningDesc || (currentLang === 'en' ? 'According to DDNet Map Mastery rules, Skill PTS on team servers are awarded ONLY for Duo/Team finishes. No bonus PTS are given for solo finishes — you should practice teamplay!' : 'По правилам DDNet Map Mastery на командных серверах бонусные очки Skill PTS начисляются только за совместное (Duo/Team) прохождение. Вам стоит больше тренировать командную игру!')}</p>
              </div>
            </div>
          ` : '';

          card.innerHTML = `
            <div class="space-y-4">
              <div class="flex items-center justify-between border-b ${isSoloOnTeamMap ? 'border-rose-500/30' : 'border-amber-500/20'} pb-3 flex-wrap gap-2">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl ${isSoloOnTeamMap ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-amber-500/20 border-amber-500/40 text-amber-400'} border flex items-center justify-center font-bold text-lg shrink-0">${isSoloOnTeamMap ? '🚫' : '⭐'}</div>
                  <div>
                    <div class="text-xs font-bold ${isSoloOnTeamMap ? 'text-rose-400' : 'text-amber-400'} uppercase tracking-widest">${t.myRecordTitle || 'Ваш личный результат'} — <a href="/player?name=${encodeURIComponent(myNick)}" class="underline hover:text-amber-300">${escapeHtml(myNick)}</a></div>
                    <div class="text-lg font-black text-white font-mono">#${rank} ${t.myRecordRankInWorld || (currentLang === 'en' ? 'global rank' : 'место в мире')} ${isSoloOnTeamMap ? '<span class="text-xs text-rose-400 font-bold ml-1">(' + (t.soloRuns || 'Solo') + ')</span>' : ''}</div>
                  </div>
                </div>
                <a href="/player?name=${encodeURIComponent(myNick)}" class="px-4 py-2 ${isSoloOnTeamMap ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40' : 'bg-amber-500 hover:bg-amber-600 text-slate-950'} rounded-xl text-xs font-extrabold transition-all shadow-md">${t.myProfileBtn || 'Мой профиль 👤'}</a>
              </div>

              ${warningHtml}

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                <div class="bg-black/30 p-3 rounded-xl border border-white/5">
                  <div class="text-[11px] text-slate-400 font-semibold uppercase">${t.myRecordTime || 'Ваше время'}</div>
                  <div class="text-base font-bold font-mono ${isSoloOnTeamMap ? 'text-rose-300' : 'text-amber-300'}">${timeFormatted}</div>
                </div>
                <div class="bg-black/30 p-3 rounded-xl border border-white/5">
                  <div class="text-[11px] text-slate-400 font-semibold uppercase">${t.myRecordGap || 'Отставание от WR'}</div>
                  <div class="text-base font-bold font-mono text-slate-200">${gapText}</div>
                </div>
                <div class="bg-black/30 p-3 rounded-xl border border-white/5">
                  <div class="text-[11px] text-slate-400 font-semibold uppercase">${t.myRecordSkill || 'Skill PTS'}</div>
                  <div class="text-base font-bold font-mono ${isSoloOnTeamMap ? 'text-rose-400' : 'text-emerald-400'}">${isSoloOnTeamMap ? '0 PTS' : '+' + pSkill + ' PTS'}</div>
                </div>
                <div class="bg-black/30 p-3 rounded-xl border border-white/5">
                  <div class="text-[11px] text-slate-400 font-semibold uppercase">${t.myRecordPartners || 'Напарники'}</div>
                  <div class="text-base font-bold ${isSoloOnTeamMap ? 'text-rose-400' : 'text-slate-200'} truncate">${partnerNames ? escapeHtml(partnerNames) : '— (Solo)'}</div>
                </div>
              </div>
            </div>
          `;
          card.classList.remove('hidden');
        };

        try {
          renderMyRecordCard();
        } catch (cardErr) {
          console.warn('Failed to render my record card:', cardErr);
        }

        if (typeof renderBreadcrumbs === 'function') {
          const homeLabel = dict.breadcrumbs ? dict.breadcrumbs.home : 'Home';
          renderBreadcrumbs([
            { label: homeLabel, url: '/' },
            { label: data.mapName }
          ]);
        }

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

            const favs = (typeof getSettings === 'function' ? getSettings().favorites : []).map(f => f.toLowerCase());
            const hasFavorite = group.players.some(p => favs.includes(p.toLowerCase()));
            if (hasFavorite) {
              tr.classList.add('favorite-player-row');
              tr.style.background = 'rgba(245, 158, 11, 0.05)';
            }

            const playersHtml = group.players.map(pName => {
              const isPNameFav = favs.includes(pName.toLowerCase());
              const favStar = isPNameFav ? '<span class="text-amber-400 text-xs ml-0.5" title="Избранный игрок">⭐</span>' : '';
              return `<a href="/player?name=${encodeURIComponent(pName)}" class="text-white hover:text-amber-400 transition-colors whitespace-nowrap">${escapeHtml(pName)}${favStar}</a>`;
            }).join(' <span class="text-amber-400 font-bold px-0.5">&amp;</span> ');

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

        const renderMapFavorites = () => {
          const btn = document.getElementById('btn-fav-records');
          const countEl = document.getElementById('fav-records-count');
          const modal = document.getElementById('map-favorites-modal');
          const listEl = document.getElementById('fav-modal-list');
          const closeBtn = document.getElementById('fav-modal-close');
          const closeBottomBtn = document.getElementById('btn-close-fav-modal');
          const openSettingsBtn = document.getElementById('btn-open-settings-from-fav');
          const refreshModalBtn = document.getElementById('fav-modal-refresh-btn');

          if (!btn || !modal || !listEl) return;

          const settings = typeof getSettings === 'function' ? getSettings() : { favorites: [], myNickname: '' };
          const favs = Array.isArray(settings.favorites) ? settings.favorites : [];
          const myNick = settings.myNickname ? settings.myNickname.trim() : '';
          const myLower = myNick.toLowerCase();

          btn.classList.remove('hidden');
          if (countEl) countEl.textContent = favs.length;

          // Cache of favorite players' fetched profile data
          if (!window._mapFavProfilesCache) {
            window._mapFavProfilesCache = new Map();
          }
          const favProfilesCache = window._mapFavProfilesCache;

          // Find my personal time on this map if available
          let myTime = null;
          if (myNick && data && Array.isArray(data.leaderboard)) {
            const myRun = data.leaderboard.find(r => {
              const pNames = (Array.isArray(r.players) ? r.players : String(r.player || '').split(/[,/&]+/)).map(n => n.trim().toLowerCase());
              return pNames.includes(myLower);
            });
            if (myRun) myTime = myRun.time;
          }
          if (!myTime && typeof getUserProfileCache === 'function') {
            const cache = getUserProfileCache();
            const finish = (cache?.finishes || []).find(f => (f.map || f.mapName || '').toLowerCase() === (data.mapName || '').toLowerCase());
            if (finish) myTime = finish.time;
          }

          const renderFavCards = () => {
            if (favs.length === 0) {
              listEl.innerHTML = `
                <div class="p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-3">
                  <div class="text-3xl">⭐</div>
                  <div class="text-white font-bold text-sm">${dict.map?.noFavsTitle || (currentLang === 'en' ? 'No favorite players yet' : 'У вас пока нет избранных игроков')}</div>
                  <p class="text-xs text-slate-400 max-w-sm mx-auto">${dict.map?.noFavsDesc || (currentLang === 'en' ? 'Add rivals or friends to favorites in Settings to compare your times on every map.' : 'Добавьте друзей или соперников в избранное в настройках, чтобы сравнивать времена на любой карте.')}</p>
                  <button type="button" onclick="document.getElementById('map-favorites-modal').classList.add('hidden'); openSettingsModal();" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer">
                    ⚙️ ${dict.map?.openSettingsBtn || (currentLang === 'en' ? 'Open Settings' : 'Открыть настройки')}
                  </button>
                </div>
              `;
              return;
            }

            const mapBasePts = mapInfo ? (mapInfo.points || 0) : 0;
            const pMaxBonus = mapBasePts * 5.0;

            listEl.innerHTML = favs.map(favName => {
              const favLower = favName.toLowerCase();
              let run = (data.leaderboard || []).find(r => {
                const pNames = (Array.isArray(r.players) ? r.players : String(r.player || '').split(/[,/&]+/)).map(n => n.trim().toLowerCase());
                return pNames.includes(favLower);
              });

              const cachedProfile = favProfilesCache.get(favLower);
              let isFetching = !run && !cachedProfile;

              if (!run && cachedProfile && Array.isArray(cachedProfile.finishDetails)) {
                const finish = cachedProfile.finishDetails.find(f => (f.mapName || f.map || '').toLowerCase() === (data.mapName || '').toLowerCase());
                if (finish) {
                  run = {
                    time: finish.time,
                    rank: finish.rank || '—',
                    players: [favName]
                  };
                }
              }

              let timeFormatted = '<span class="text-slate-500 font-normal">' + (currentLang === 'en' ? 'Not finished' : 'Не пройдено') + '</span>';
              let rankBadge = '<span class="text-[0.65rem] text-slate-500">—</span>';
              let skillPtsText = '';
              let compHtml = '';

              if (isFetching) {
                timeFormatted = `<span class="text-amber-400/70 text-xs flex items-center gap-1"><span class="animate-spin text-[0.7rem]">⏳</span> ${currentLang === 'en' ? 'Checking...' : 'Проверка...'}</span>`;
              } else if (run) {
                const timeVal = run.time;
                timeFormatted = `<span class="text-amber-300 font-mono font-bold">${formatTime(timeVal)}</span>`;
                rankBadge = `<span class="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[0.68rem] font-bold">#${run.rank || '—'}</span>`;

                const timeRatio = data.tBest > 0 ? timeVal / data.tBest : 1;
                const pSkill = Math.floor(pMaxBonus * Math.exp(-data.s * (Math.max(1, timeRatio) - 1)));
                skillPtsText = `<span class="text-emerald-400 font-mono font-bold text-xs">+${pSkill} PTS</span>`;

                if (myTime) {
                  const diffSec = myTime - timeVal;
                  if (Math.abs(diffSec) < 0.01) {
                    compHtml = `<span class="text-slate-400 text-[0.68rem]">${currentLang === 'en' ? 'Equal time' : 'Одинаковое время'}</span>`;
                  } else if (diffSec > 0) {
                    compHtml = `<span class="text-rose-400 text-[0.68rem] font-bold">-${formatTime(diffSec)} ${currentLang === 'en' ? 'slower than you' : 'медленнее вас'}</span>`;
                  } else {
                    compHtml = `<span class="text-emerald-400 text-[0.68rem] font-bold">+${formatTime(Math.abs(diffSec))} ${currentLang === 'en' ? 'faster than you' : 'быстрее вас'}</span>`;
                  }
                } else {
                  const gapPct = Math.max(0, (timeRatio - 1) * 100);
                  compHtml = `<span class="text-slate-400 text-[0.68rem] font-mono">+${gapPct.toFixed(1)}% WR</span>`;
                }
              }

              const pvpUrl = `/pvp?p1=${encodeURIComponent(myNick || 'stone')}&p2=${encodeURIComponent(favName)}`;
              const playerUrl = `/player?name=${encodeURIComponent(favName)}`;

              return `
                <div class="glass-panel p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-amber-500/40 hover:bg-white/[0.04] transition-all flex items-center justify-between gap-3" id="fav-modal-card-${encodeURIComponent(favLower)}">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm shrink-0">⭐</div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <a href="${playerUrl}" class="text-white font-bold text-sm hover:text-amber-400 transition-colors truncate block max-w-[160px] sm:max-w-[220px]" title="${escapeHtml(favName)}">
                          ${escapeHtml(favName)}
                        </a>
                        ${rankBadge}
                      </div>
                      <div class="flex items-center gap-2 mt-0.5">
                        ${compHtml}
                      </div>
                    </div>
                  </div>

                  <div class="text-right shrink-0">
                    <div>${timeFormatted}</div>
                    <div>${skillPtsText}</div>
                  </div>

                  <div class="flex items-center gap-1.5 shrink-0">
                    <a href="${pvpUrl}" class="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1" title="${currentLang === 'en' ? 'Duel PvP' : 'PvP Дуэль'}">
                      ⚔️ <span class="hidden sm:inline">PvP</span>
                    </a>
                  </div>
                </div>
              `;
            }).join('');
          };

          const fetchMissingFavorites = async (forceRefresh = false) => {
            const missing = favs.filter(favName => {
              const favLower = favName.toLowerCase();
              if (forceRefresh) return true;
              const inLeaderboard = (data.leaderboard || []).some(r => {
                const pNames = (Array.isArray(r.players) ? r.players : String(r.player || '').split(/[,/&]+/)).map(n => n.trim().toLowerCase());
                return pNames.includes(favLower);
              });
              return !inLeaderboard && !favProfilesCache.has(favLower);
            });

            if (missing.length === 0) return;

            await Promise.all(missing.map(async (name) => {
              try {
                if (window.api && typeof window.api.fetchPlayerPts === 'function') {
                  const res = await window.api.fetchPlayerPts(name, forceRefresh);
                  if (res) {
                    favProfilesCache.set(name.toLowerCase(), res);
                  }
                }
              } catch (err) {
                console.warn(`Could not load favorite player profile for ${name}`, err);
              }
            }));

            renderFavCards();
          };

          const openModal = () => {
            renderFavCards();
            fetchMissingFavorites();
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
          };

          const closeModal = () => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
          };

          if (refreshModalBtn) {
            refreshModalBtn.onclick = async () => {
              const icon = document.getElementById('fav-modal-refresh-icon');
              if (icon) icon.classList.add('animate-spin');
              refreshModalBtn.disabled = true;
              await fetchMissingFavorites(true);
              if (icon) icon.classList.remove('animate-spin');
              refreshModalBtn.disabled = false;
            };
          }

          btn.onclick = openModal;
          if (closeBtn) closeBtn.onclick = closeModal;
          if (closeBottomBtn) closeBottomBtn.onclick = closeModal;
          if (openSettingsBtn) {
            openSettingsBtn.onclick = () => {
              closeModal();
              if (typeof openSettingsModal === 'function') openSettingsModal();
            };
          }
          modal.onclick = (e) => {
            if (e.target === modal) closeModal();
          };
        };

        renderMapFavorites();

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

        const mapYieldCalcInput = document.getElementById('calc-time-input');
        const mapYieldCalcResult = document.getElementById('calc-yield-result');
        if (mapYieldCalcInput && mapYieldCalcResult) {
          const parseTimeInputToSeconds = (val) => {
            if (!val) return 0;
            const parts = val.split(':');
            if (parts.length === 2) {
              const m = parseInt(parts[0], 10) || 0;
              const s = parseFloat(parts[1]) || 0;
              return m * 60 + s;
            } else if (parts.length === 3) {
              const h = parseInt(parts[0], 10) || 0;
              const m = parseInt(parts[1], 10) || 0;
              const s = parseFloat(parts[2]) || 0;
              return h * 3600 + m * 60 + s;
            }
            return parseFloat(val) || 0;
          };

          mapYieldCalcInput.addEventListener('input', (e) => {
            const timeInSecs = parseTimeInputToSeconds(e.target.value);
            const curTbest = data.tBest || 0;
            const curStrictness = data.s || 2.0;
            const curBasePts = (mapInfo && mapInfo.points) ? mapInfo.points : 0;
            if (timeInSecs > 0 && curTbest > 0) {
              const ratio = timeInSecs / curTbest;
              const decay = Math.exp(-curStrictness * (Math.max(1, ratio) - 1));
              const total = Math.floor(curBasePts * 5.0 * decay);
              mapYieldCalcResult.textContent = `+${total} Skill PTS`;
            } else {
              mapYieldCalcResult.textContent = '0';
            }
          });
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
