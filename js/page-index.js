/* page-index.js — Logic for index.html */

(function () {
  'use strict';

  let playersData = [];
  let sortConfig = { key: 'newPtsTotal', direction: 'desc' };
  let displayLimit = 100;
  let loading = false;
  let currentTab = 'global';

  function getLoadMoreBtnText(limit) {
    const dict = getDict();
    if (limit < 250) return dict.home.showTop250 || (currentLang === 'en' ? 'Show Top 250' : 'Показать Топ 250');
    if (limit < 500) return dict.home.showTop500 || (currentLang === 'en' ? 'Show Top 500' : 'Показать Топ 500');
    return dict.home.showFull || (currentLang === 'en' ? 'Show full leaderboard' : 'Показать весь топ');
  }

  function updateExpansionControls() {
    const dict = getDict();
    const container = document.getElementById('load-more-container');
    const button = document.getElementById('load-more-btn');
    const info = document.getElementById('pagination-info');
    const shown = displayLimit === Infinity ? playersData.length : Math.min(displayLimit, playersData.length);

    if (info) {
      info.textContent = `${dict.home.showingTop || (currentLang === 'en' ? 'Showing Top' : 'Показан Топ')} ${shown}`;
    }
    if (button) button.textContent = getLoadMoreBtnText(displayLimit);
    if (container) {
      const hasMore = displayLimit !== Infinity && (displayLimit >= 500 || playersData.length >= displayLimit);
      container.classList.toggle('hidden', currentTab !== 'global' || !hasMore);
    }
  }


  // ── Sort ──────────────────────────────────────────────────────────────────
  window.requestSort = function (key) {
    if (key === 'rank') {
      sortConfig = { key: 'newPtsTotal', direction: 'desc' };
    } else {
      const direction = (sortConfig.key === key && sortConfig.direction === 'desc') ? 'asc' : 'desc';
      sortConfig = { key, direction };
    }
    renderTable();
  };

  function getSortValue(player, key) {
    if (key === 'level') {
      return player.newPtsTotal || 0;
    }
    if (key === 'league') {
      const base = player.newPtsBase || 0;
      const skill = player.newPtsSkill || 0;
      return base > 0 ? skill / base : 0;
    }
    return player[key] || 0;
  }

  const favoritePlayersCache = new Map();
  let loadingFavorites = false;

  async function loadFavoritePlayers(forceRefresh = false) {
    const favSettings = (typeof getSettings === 'function' ? getSettings() : { favorites: [] });
    const rawFavs = favSettings.favorites || [];
    if (rawFavs.length === 0) return [];

    const missing = [];

    rawFavs.forEach(favName => {
      const lower = favName.toLowerCase();
      if (forceRefresh) {
        missing.push(favName);
        return;
      }
      if (favoritePlayersCache.has(lower)) return;

      // Check loaded playersData
      const fromPlayers = playersData.find(p => (p.name || '').toLowerCase() === lower);
      if (fromPlayers) {
        favoritePlayersCache.set(lower, fromPlayers);
        return;
      }

      // Check full static leaderboardData
      if (window.leaderboardData) {
        const idx = window.leaderboardData.findIndex(p => (p.name || '').toLowerCase() === lower);
        if (idx !== -1) {
          const p = { ...window.leaderboardData[idx], rank: idx + 1 };
          favoritePlayersCache.set(lower, p);
          return;
        }
      }

      missing.push(favName);
    });

    if (missing.length > 0) {
      loadingFavorites = true;
      if (currentTab === 'favorites') renderTable();

      await Promise.all(missing.map(async (name) => {
        try {
          if (window.api && typeof window.api.fetchPlayerPts === 'function') {
            const res = await window.api.fetchPlayerPts(name, forceRefresh);
            if (res) {
              let rank = '—';
              if (window.leaderboardData) {
                const idx = window.leaderboardData.findIndex(p => (p.name || '').toLowerCase() === name.toLowerCase());
                if (idx !== -1) rank = idx + 1;
              }
              const pObj = {
                name: res.name,
                rank: rank,
                level: res.masteryLevel ? res.masteryLevel.level : (typeof getMasteryLevel === 'function' ? getMasteryLevel(res.newPtsTotal).level : 1),
                league: res.skillLeague ? res.skillLeague.id : (typeof getSkillLeague === 'function' ? getSkillLeague(res.newPtsBase, res.newPtsSkill).id : 'bronze'),
                newPtsBase: res.newPtsBase || 0,
                newPtsSkill: res.newPtsSkill || 0,
                newPtsTotal: res.newPtsTotal || 0,
                skin: res.skinName || 'default',
                skinColorBody: res.skinColorBody,
                skinColorFeet: res.skinColorFeet
              };
              favoritePlayersCache.set(name.toLowerCase(), pObj);
            }
          }
        } catch (err) {
          console.warn(`Could not load favorite player ${name}`, err);
        }
      }));

      loadingFavorites = false;
      if (currentTab === 'favorites') renderTable();
    }
  }

  // ── Render global leaderboard table ───────────────────────────────────────
  function renderTable() {
    const tbody = document.getElementById('leaderboard-body');
    tbody.classList.remove('banlist-mode');
    tbody.innerHTML = '';

    const favSettings = (typeof getSettings === 'function' ? getSettings() : { favorites: [] });
    const favsList = (favSettings.favorites || []).map(f => f.toLowerCase());
    const favCountEl = document.getElementById('home-fav-count');
    if (favCountEl) favCountEl.textContent = favsList.length;

    let dataToRender = playersData;
    if (currentTab === 'favorites') {
      if (favsList.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="p-8 text-center">
              <div class="max-w-md mx-auto space-y-3">
                <div class="text-3xl">⭐</div>
                <div class="text-white font-bold text-base">${currentLang === 'en' ? 'No favorite players yet' : 'У вас пока нет избранных игроков'}</div>
                <p class="text-xs text-slate-400 leading-relaxed">${currentLang === 'en' ? 'Add players to favorites in Settings to quickly track their ranking and scores.' : 'Добавьте игроков в избранное в настройках, чтобы быстро отслеживать их позиции в таблице.'}</p>
                <button type="button" onclick="openSettingsModal()" class="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md">
                  ⚙️ ${currentLang === 'en' ? 'Open Settings' : 'Открыть настройки'}
                </button>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      const favListObjs = [];
      favsList.forEach(lower => {
        if (favoritePlayersCache.has(lower)) {
          favListObjs.push(favoritePlayersCache.get(lower));
        } else {
          const fromPlayers = playersData.find(p => (p.name || '').toLowerCase() === lower);
          if (fromPlayers) {
            favoritePlayersCache.set(lower, fromPlayers);
            favListObjs.push(fromPlayers);
          } else if (window.leaderboardData) {
            const idx = window.leaderboardData.findIndex(p => (p.name || '').toLowerCase() === lower);
            if (idx !== -1) {
              const p = { ...window.leaderboardData[idx], rank: idx + 1 };
              favoritePlayersCache.set(lower, p);
              favListObjs.push(p);
            }
          }
        }
      });

      if (favListObjs.length < favsList.length && !loadingFavorites) {
        loadFavoritePlayers();
      }

      if (loadingFavorites && favListObjs.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="p-8 text-center text-slate-400">
              <div class="flex items-center justify-center gap-2 text-sm font-bold">
                <span class="animate-spin text-amber-400">⏳</span>
                <span>${currentLang === 'en' ? 'Loading favorite players...' : 'Загрузка избранных игроков...'}</span>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      if (favListObjs.length === 0 && !loadingFavorites) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="p-8 text-center text-slate-400 text-sm font-medium">
              ${currentLang === 'en' ? 'None of your favorite players are in the current loaded leaderboard.' : 'Ваши избранные игроки не найдены среди загруженных мест таблицы.'}
            </td>
          </tr>
        `;
        return;
      }

      dataToRender = favListObjs;
    }

    if (dataToRender.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-500">${getDict().home.empty}</td></tr>`;
      return;
    }

    const mobileSelect = document.getElementById('mobile-ranking-sort');
    if (mobileSelect && sortConfig.key) {
      mobileSelect.value = sortConfig.key;
    }

    const setArrow = (id, targetKey) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (sortConfig.key === targetKey) {
        el.textContent = sortConfig.direction === 'asc' ? '▲' : '▼';
        el.style.opacity = '1';
      } else {
        el.textContent = '';
        el.style.opacity = '0.3';
      }
    };
    setArrow('icon-arrow-1', 'newPtsBase');
    setArrow('icon-arrow-2', 'newPtsSkill');
    setArrow('icon-arrow-3', 'newPtsTotal');
    setArrow('icon-arrow-level', 'level');
    setArrow('icon-arrow-league', 'league');

    const sortedData = [...dataToRender].sort((a, b) => {
      const aVal = getSortValue(a, sortConfig.key);
      const bVal = getSortValue(b, sortConfig.key);
      if (aVal !== bVal) {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return (b.newPtsTotal || 0) - (a.newPtsTotal || 0);
    });

    let currentDisplayRank = 1;
    const fragment = document.createDocumentFragment();
    const renderLimit = displayLimit === Infinity ? sortedData.length : displayLimit;
    sortedData.slice(0, renderLimit).forEach((p, idx) => {
      if (idx > 0) {
        const prevP = sortedData[idx - 1];
        const prevVal = getSortValue(prevP, sortConfig.key);
        const curVal = getSortValue(p, sortConfig.key);
        if (curVal !== prevVal) {
          currentDisplayRank++;
        }
      }

      const tr = document.createElement('tr');
      tr.className = 'premium-table-row';
      if (currentDisplayRank <= 3) tr.classList.add(`top-rank-row`, `top-rank-${currentDisplayRank}`);

      let rankHtml = `<span class="global-rank-badge">#${currentDisplayRank}</span>`;
      if (currentDisplayRank <= 3) rankHtml = `<span class="global-rank-badge ranking-position-${currentDisplayRank}">#${currentDisplayRank}</span>`;

      const mastery = p.masteryLevel || window.api.getMasteryLevel(p.newPtsTotal || 0);
      const league = p.skillLeague || window.api.getSkillLeague(p.newPtsBase || 0, p.newPtsSkill || 0);
      const dict = getDict();
      const rankDict = (dict.player && dict.player.skillLeague) || {};
      const leagueName = rankDict[league.id] || league.id;

      const staticBadge = p.isStatic ? `<span title="${currentLang === 'en' ? 'Cached data' : 'Кэшированные данные'}" style="font-size:0.7em;color:#9a9a9a;margin-left:4px;">📦</span>` : '';

      const ptsToNextText = currentLang === 'en'
        ? `${mastery.pointsToNext.toLocaleString()} PTS to Level ${mastery.level + 1}`
        : `${mastery.pointsToNext.toLocaleString()} PTS до ${mastery.level + 1} ур.`;

      const levelBadgeHtml = `
        <div class="mastery-level-pill transition-all" title="${ptsToNextText} (${Math.floor(mastery.progressPercent)}%)">
          <span class="level-pill-tag">LVL ${mastery.level}</span>
          <div class="level-pill-track">
            <div class="level-pill-bar" style="width:${mastery.progressPercent}%"></div>
          </div>
        </div>
      `;
      const leagueBadgeHtml = `<span class="skill-league-badge skill-league-${league.id} text-xs px-2.5 py-0.5">${escapeHtml(leagueName)}</span>`;

      tr.innerHTML = `
        <td class="p-4">${rankHtml}</td>
        <td class="p-4 font-bold text-lg player-name-cell">
          <div class="player-tee-watermark" data-skin="${escapeHtml(p.skin || 'default')}" data-color-body="${p.skinColorBody ?? ''}" data-color-feet="${p.skinColorFeet ?? ''}"></div>
          <div class="player-name-content flex items-center gap-2">
            <a href="/player?name=${encodeURIComponent(p.name)}" class="player-link text-slate-400 hover:text-white transition-colors">
              ${escapeHtml(p.name)}
            </a>${staticBadge}
          </div>
        </td>
        <td class="p-4 text-center">${levelBadgeHtml}</td>
        <td class="p-4 text-center">${leagueBadgeHtml}</td>
        <td class="p-4 text-right font-mono text-emerald-400/80">${(p.newPtsBase || 0).toLocaleString()}</td>
        <td class="p-4 text-right font-mono text-purple-400/80">${(p.newPtsSkill || 0).toLocaleString()}</td>
        <td class="p-4 text-right font-mono font-bold text-amber-400 text-lg">${(p.newPtsTotal || 0).toLocaleString()}</td>
      `;
      fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
    queueWatermarkRendering();
  }

  // ── Tee Skin Avatar Rendering for Leaderboard ─────────────────────────────
  const skinUrlCache = new Map();

  async function resolveSkinUrl(skinName) {
    let skin = (skinName && skinName !== 'null' && skinName !== 'undefined') ? skinName : 'default';
    if (skinUrlCache.has(skin)) return skinUrlCache.get(skin);

    const localUrl = `data/skins/${encodeURIComponent(skin)}.png`;
    const remoteUrl = `https://skins.ddstats.tw/${encodeURIComponent(skin)}.png`;
    const defaultUrl = `data/skins/default.png`;

    const check = (url) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });

    let finalUrl = localUrl;
    if (!(await check(localUrl))) {
      if (await check(remoteUrl)) {
        finalUrl = remoteUrl;
      } else {
        finalUrl = defaultUrl;
      }
    }
    skinUrlCache.set(skin, finalUrl);
    return finalUrl;
  }

  const skinCanvasCache = new Map();

  async function renderTeeWatermark(container, skinName, colorBody, colorFeet) {
    if (!container || container.getAttribute('data-rendered')) return;
    container.setAttribute('data-rendered', 'true');

    let skin = (skinName && skinName !== 'null' && skinName !== 'undefined') ? skinName : 'default';
    const body = (colorBody !== undefined && colorBody !== null && colorBody !== '') ? Number(colorBody) : null;
    const feet = (colorFeet !== undefined && colorFeet !== null && colorFeet !== '') ? Number(colorFeet) : null;

    const cacheKey = `${skin}_${body}_${feet}`;
    if (skinCanvasCache.has(cacheKey)) {
      const srcCanvas = skinCanvasCache.get(cacheKey);
      if (srcCanvas) {
        const c = document.createElement('canvas');
        c.width = srcCanvas.width;
        c.height = srcCanvas.height;
        c.className = 'tee-watermark-canvas';
        const ctx = c.getContext('2d');
        ctx.drawImage(srcCanvas, 0, 0);
        container.innerHTML = '';
        container.appendChild(c);
      }
      return;
    }

    try {
      const skinUrl = await resolveSkinUrl(skin);

      if (window.TeeSkinRenderer && window.TeeSkinRenderer.renderer && window.TeeSkinRenderer.renderer.TeeRenderer) {
        const dummy = document.createElement('div');
        const config = {
          skinUrl,
          followMouse: false,
          eyes: 'normal',
          direction: 'right',
        };
        if (body !== null) {
          config.colorBody = body;
          config.useCustomColor = true;
        }
        if (feet !== null) {
          config.colorFeet = feet;
          config.useCustomColor = true;
        }

        const teeRenderer = new window.TeeSkinRenderer.renderer.TeeRenderer(dummy, config);
        await teeRenderer.loadSkin(skinUrl, true);

        const masterCanvas = document.createElement('canvas');
        masterCanvas.width = 96;
        masterCanvas.height = 96;
        teeRenderer.renderToCanvas(masterCanvas, { size: 96, direction: 'right', eyes: 'normal' });
        skinCanvasCache.set(cacheKey, masterCanvas);

        const c = document.createElement('canvas');
        c.width = 96;
        c.height = 96;
        c.className = 'tee-watermark-canvas';
        const ctx = c.getContext('2d');
        ctx.drawImage(masterCanvas, 0, 0);
        container.innerHTML = '';
        container.appendChild(c);
      } else {
        const img = document.createElement('img');
        img.src = skinUrl;
        img.className = 'w-10 h-10 object-contain opacity-70';
        container.innerHTML = '';
        container.appendChild(img);
      }
    } catch (e) {
      console.warn('Failed to render leaderboard Tee watermark:', e);
    }
  }

  function queueWatermarkRendering() {
    const watermarks = document.querySelectorAll('.player-tee-watermark:not([data-rendered])');
    if (watermarks.length === 0) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            observer.unobserve(el);
            if (!el.getAttribute('data-rendered')) {
              const skin = el.getAttribute('data-skin');
              const body = el.getAttribute('data-color-body');
              const feet = el.getAttribute('data-color-feet');
              renderTeeWatermark(el, skin, body, feet);
            }
          }
        });
      }, { rootMargin: '300px' });

      watermarks.forEach(el => observer.observe(el));
    } else {
      watermarks.forEach(el => {
        const skin = el.getAttribute('data-skin');
        const body = el.getAttribute('data-color-body');
        const feet = el.getAttribute('data-color-feet');
        renderTeeWatermark(el, skin, body, feet);
      });
    }
  }

  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  const setHtml = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };

  // ── Load leaderboard ──────────────────────────────────────────────────────
  async function loadLeaderboard() {
    loading = true;
    const loaderEl = document.getElementById('leaderboard-loader');
    if (loaderEl) loaderEl.classList.remove('hidden');

    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
      loadMoreBtn.innerHTML = icons.loader;
    }

    try {
      playersData = await window.api.getTopPlayersLive(displayLimit, (done, total) => {
        setTxt('status-message', `${currentLang === 'en' ? 'Loading' : 'Загрузка'} ${done} / ${total}...`);
      });
      setTxt('status-message', '');

      // Populate Global Stats Dashboard
      if (window.leaderboardData && window.mapsData) {
        setTxt('stat-total-players', window.leaderboardData.length.toLocaleString());
        setTxt('stat-total-wrs', window.mapsData.length.toLocaleString());
        const totalBase = window.mapsData.reduce((sum, m) => sum + (m.pBase || 0), 0);
        const maxSkill = window.mapsData.reduce((sum, m) => sum + Math.round((m.pBase || 0) * (m.s || 1.0)), 0);
        setTxt('stat-total-skill', (totalBase + maxSkill).toLocaleString());
        
        const dash = document.getElementById('global-dashboard');
        if (dash) dash.classList.remove('hidden');
      }

      // Warn if all data is cached (DDStats unreachable)
      const allStatic = playersData.length > 0 && playersData.every(p => p.isStatic);
      if (allStatic) {
        const msgEl = document.getElementById('status-message');
        if (msgEl) {
          msgEl.textContent = currentLang === 'en'
            ? '⚠ DDStats unreachable — showing cached data'
            : '⚠ DDStats недоступен — показаны кэшированные данные';
          msgEl.style.color = '#f59e0b';
        }
      }

      renderTable();
    } catch (err) {
      setTxt('empty-state', 'Error loading data');
    } finally {
      loading = false;
      if (loaderEl) loaderEl.classList.add('hidden');
      if (loadMoreBtn) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = getLoadMoreBtnText(displayLimit);
      }

      const loadMoreContainer = document.getElementById('load-more-container');
      if (loadMoreContainer) updateExpansionControls();
    }
  }

  // ── DOMContentLoaded ──────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    renderHeader('home');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('[data-reveal]').forEach((element) => {
      if (reducedMotion) {
        element.classList.add('is-visible');
        return;
      }
      new IntersectionObserver(([entry], observer) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.disconnect();
      }, { threshold: 0.12 }).observe(element);
    });

    const dict = getDict();
    document.documentElement.lang = currentLang;

    // Set texts from i18n
    const rawTitle = dict.home.title || 'DDNet Map Mastery';
    const titleHtml = rawTitle
      .replace(/\bMap\b/i, '<span class="inline-block whitespace-nowrap"><img src="icon.png" alt="M" class="inline-hero-m">ap</span>')
      .replace(/\bMAP\b/, '<span class="inline-block whitespace-nowrap"><img src="icon.png" alt="M" class="inline-hero-m">AP</span>');
    setHtml('home-title', titleHtml);
    setTxt('home-subtitle', dict.home.subtitle);
    setTxt('home-about-btn', dict.home.aboutBtn);
    setTxt('home-compare-btn', dict.home.compareBtn);
    setTxt('player-scan-label', currentLang === 'en' ? 'PLAYER SEARCH / 01' : 'ПОИСК ИГРОКА / 01');
    setTxt('global-telemetry-label', dict.home.globalTelemetryLabel || (currentLang === 'en' ? 'GLOBAL RANKING / ALL PLAYERS' : 'ОБЩИЙ РЕЙТИНГ / ВСЕ ИГРОКИ'));

    setTxt('search-title', currentLang === 'en' ? 'Find Player' : 'Найти игрока');
    setTxt('home-leaderboard-title', dict.home.leaderboardTitle);
    setTxt('table-rank', dict.home.tableRank);
    setTxt('table-player', dict.home.tablePlayer);
    setTxt('table-level', dict.home.tableLevel || (currentLang === 'en' ? 'Level' : 'Уровень'));
    setTxt('table-league', dict.home.tableLeague || (currentLang === 'en' ? 'Rank' : 'Ранг'));
    setTxt('table-base', dict.home.tableBase);
    setTxt('table-skill', dict.home.tableSkill);
    setTxt('table-total', dict.home.tableTotal);
    setTxt('empty-state', dict.home.empty);
    setTxt('status-message', '');
    
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) loadMoreBtn.textContent = getLoadMoreBtnText(displayLimit);

    setTxt('home-tools-title', dict.home.toolsTitle || (currentLang === 'en' ? 'Player Tools' : 'Инструменты игрока'));
    setTxt('home-tools-label', dict.home.toolsLabel || (currentLang === 'en' ? 'SEARCH & COMPARE' : 'ПОИСК И СРАВНЕНИЕ'));
    setTxt('home-map-search-title', dict.home.mapSearchTitle || (currentLang === 'en' ? 'Find a map' : 'Найти карту'));
    setTxt('home-map-search-desc', dict.home.mapSearchDesc || (currentLang === 'en' ? 'Open map records, times and leaderboard' : 'Откройте рекорды, времена и рейтинг карты'));
    setTxt('home-map-search-btn', dict.home.mapSearchBtn || (currentLang === 'en' ? 'Open Map' : 'Открыть карту'));
    setTxt('home-pvp-desc', dict.home.pvpDesc || (currentLang === 'en' ? 'Compare head-to-head performance on common maps' : 'Сравните результаты двух игроков на общих картах'));
    setTxt('home-pvp-btn', dict.home.pvpBtn || (currentLang === 'en' ? 'Open PvP ⚔️' : 'Открыть PvP ⚔️'));
    setTxt('home-tas-title', dict.home.tasTitle || (currentLang === 'en' ? 'TAS Ban List' : 'TAS Ban List'));
    setTxt('home-tas-desc', dict.home.tasDesc || (currentLang === 'en' ? 'Registry of banned players and purged records' : 'Реестр заблокированных читеров и аннулированных ТАС-рекордов'));
    setTxt('home-tas-btn', dict.home.tasBtn || (currentLang === 'en' ? 'Open Ban List 🛡️' : 'Открыть список 🛡️'));

    const homeMapInput = document.querySelector('.home-map-search-form input');
    if (homeMapInput) homeMapInput.placeholder = dict.home.mapSearchPlaceholder || (currentLang === 'en' ? 'Search map (e.g. Kintaro)...' : 'Поиск карты (например: Kintaro)...');

    const homeMapForm = document.querySelector('.home-map-search-form');
    if (homeMapForm) {
      homeMapForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const query = homeMapInput ? homeMapInput.value.trim() : '';
        if (!query) return;
        const bestMatch = findMapMatches(query, 1)[0];
        const mapName = bestMatch ? (bestMatch.map || bestMatch.name) : query;
        window.location.href = `/map?name=${encodeURIComponent(mapName)}`;
      });
    }

    const homePvpBtn = document.getElementById('home-pvp-btn');
    if (homePvpBtn) homePvpBtn.href = '/pvp';

    // Search result labels from i18n
    setTxt('search-result-base-label', dict.home.searchResultBase);
    setTxt('search-result-skill-label', dict.home.searchResultSkill);
    setTxt('search-result-total-label', dict.home.searchResultTotal);
    const copyTextEl = document.getElementById('search-result-copy-text');
    if (copyTextEl) copyTextEl.textContent = dict.home.copyBtn || 'Copy';

    // FAQ Text Population
    if (dict.faq) {
      setTxt('home-faq-title', dict.faq.title);
      setTxt('faq-q1', dict.faq.q1);
      setTxt('faq-a1', dict.faq.a1);
      setTxt('faq-q2', dict.faq.q2);
      setTxt('faq-a2', dict.faq.a2);
      setTxt('faq-q3', dict.faq.q3);
      setTxt('faq-a3', dict.faq.a3);
      setTxt('faq-q4', dict.faq.q4);
      setTxt('faq-a4', dict.faq.a4);
    }

    const mobileSortLabel = document.getElementById('mobile-ranking-sort-label');
    if (mobileSortLabel && dict.home.mobileSortLabel) {
      mobileSortLabel.textContent = dict.home.mobileSortLabel;
    }
    const mobileRankingSelect = document.getElementById('mobile-ranking-sort');
    if (mobileRankingSelect && dict.home.mobileSortOptions) {
      Array.from(mobileRankingSelect.options).forEach(opt => {
        if (dict.home.mobileSortOptions[opt.value]) {
          opt.textContent = dict.home.mobileSortOptions[opt.value];
        }
      });
    }

    // Icons
    setHtml('icon-arrow-right-1', icons.arrowRight);
    setHtml('icon-arrow-right-2', icons.arrowRight);
    setHtml('icon-arrow-1', icons.arrowUpDown);
    setHtml('icon-arrow-2', icons.arrowUpDown);
    setHtml('icon-arrow-3', icons.arrowUpDown);
    setHtml('search-btn', icons.search);
    setHtml('leaderboard-loader', icons.loader);

    // Player search
    let lastSearchResult = null;
    const copyBtn = document.getElementById('search-result-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (!lastSearchResult) return;
        const cardText = `${lastSearchResult.name} | base: ${lastSearchResult.newPtsBase} | skill: ${lastSearchResult.newPtsSkill} | total: ${lastSearchResult.newPtsTotal} | https://ddnetmm.ru/player?name=${encodeURIComponent(lastSearchResult.name)}`;
        navigator.clipboard.writeText(cardText).then(() => {
          if (copyTextEl) {
            const orig = dict.home.copyBtn || 'Copy';
            copyTextEl.textContent = dict.player.copied || 'Скопировано!';
            setTimeout(() => {
              copyTextEl.textContent = orig;
            }, 2000);
          }
        }).catch(err => console.error(err));
      });
    }

    const playerSearchForm = document.getElementById('player-search-form');
    if (playerSearchForm) {
      playerSearchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sInput = document.getElementById('search-input');
        const val = sInput ? sInput.value.trim() : '';
        if (!val) return;

        const btn = document.getElementById('search-btn');
        if (btn) {
          btn.innerHTML = icons.loader;
          btn.disabled = true;
        }
        const sErr = document.getElementById('search-error');
        if (sErr) sErr.classList.add('hidden');
        const sRes = document.getElementById('search-result');
        if (sRes) sRes.classList.add('hidden');

        let res = playersData.find(p => p.name === val);
        try {
          if (!res) res = await window.api.fetchPlayerPts(val);
          lastSearchResult = res;
          setTxt('search-result-name', res.name);
          const nameEl = document.getElementById('search-result-name');
          if (nameEl) nameEl.href = `/player?name=${encodeURIComponent(res.name)}`;
          setTxt('search-result-base', '+' + res.newPtsBase.toLocaleString());
          setTxt('search-result-skill', '+' + res.newPtsSkill.toLocaleString());
          setTxt('search-result-total', res.newPtsTotal.toLocaleString());
          if (sRes) sRes.classList.remove('hidden');
        } catch (err) {
          if (sErr) {
            sErr.textContent = (err.isBlacklisted || (window.isBlacklisted && window.isBlacklisted(val)))
              ? (currentLang === 'en' ? 'Player is blacklisted (TAS / Cheating)' : 'Игрок заблокирован в системе (TAS / Читы)')
              : (currentLang === 'en' ? 'Player not found or DDStats service temporarily unavailable' : 'Игрок не найден или сервис DDStats временно недоступен');
            sErr.classList.remove('hidden');
          }
        } finally {
          if (btn) {
            btn.innerHTML = icons.search;
            btn.disabled = false;
          }
        }
      });
    }

    // Load more
    const loadMoreBtnEl = document.getElementById('load-more-btn');
    if (loadMoreBtnEl) {
      loadMoreBtnEl.addEventListener('click', () => {
        if (displayLimit < 250) displayLimit = 250;
        else if (displayLimit < 500) displayLimit = 500;
        else displayLimit = Infinity;
        loadLeaderboard();
      });
    }

    if (window.setupPlayerAutocomplete) {
      window.setupPlayerAutocomplete('search-input', () => {
        const form = document.getElementById('player-search-form');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      });
    }

    // Tab Switching: All vs Favorites
    const tabAll = document.getElementById('tab-all-players');
    const tabFav = document.getElementById('tab-fav-players');

    const refreshFavBtn = document.getElementById('home-fav-refresh-btn');

    const switchLeaderboardTab = (tab) => {
      currentTab = tab;
      if (tab === 'favorites') {
        if (refreshFavBtn) refreshFavBtn.classList.remove('hidden');
        if (tabFav) tabFav.classList.add('active');
        if (tabAll) tabAll.classList.remove('active');
        loadFavoritePlayers();
      } else {
        if (refreshFavBtn) refreshFavBtn.classList.add('hidden');
        if (tabAll) tabAll.classList.add('active');
        if (tabFav) tabFav.classList.remove('active');
      }
      renderTable();
      updateExpansionControls();
    };

    if (tabAll) tabAll.onclick = () => switchLeaderboardTab('global');
    if (tabFav) tabFav.onclick = () => switchLeaderboardTab('favorites');

    if (refreshFavBtn) {
      refreshFavBtn.onclick = async () => {
        const icon = document.getElementById('home-fav-refresh-icon');
        if (icon) icon.classList.add('animate-spin');
        refreshFavBtn.disabled = true;
        await loadFavoritePlayers(true);
        if (icon) icon.classList.remove('animate-spin');
        refreshFavBtn.disabled = false;
      };
    }

    const banlist = window.blacklistData || [];
    setTxt('banlist-count', banlist.length);

    loadLeaderboard();
  });
})();

