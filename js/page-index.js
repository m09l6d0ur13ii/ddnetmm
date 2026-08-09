/* page-index.js — Logic for index.html */

(function () {
  'use strict';

  let playersData = [];
  let sortConfig = { key: 'newPtsTotal', direction: 'desc' };
  let displayLimit = 100;
  let loading = false;
  let currentTab = 'global';

  function getLoadMoreBtnText(limit) {
    if (limit < 250) return currentLang === 'en' ? 'Show Top 250' : 'Показать Топ 250';
    if (limit < 500) return currentLang === 'en' ? 'Show Top 500' : 'Показать Топ 500';
    return currentLang === 'en' ? 'Show full leaderboard' : 'Показать весь топ';
  }

  function updateExpansionControls() {
    const container = document.getElementById('load-more-container');
    const button = document.getElementById('load-more-btn');
    const info = document.getElementById('pagination-info');
    const shown = displayLimit === Infinity ? playersData.length : Math.min(displayLimit, playersData.length);

    if (info) {
      info.textContent = currentLang === 'en'
        ? `Showing Top ${shown}`
        : `Показан Топ ${shown}`;
    }
    if (button) button.textContent = getLoadMoreBtnText(displayLimit);
    if (container) {
      const hasMore = displayLimit !== Infinity && (displayLimit >= 500 || playersData.length >= displayLimit);
      container.classList.toggle('hidden', currentTab !== 'global' || !hasMore);
    }
  }

  // ── Tab switching ──────────────────────────────────────────────────────────
  window.switchMainTab = function (tab) {
    currentTab = tab;
    const btnGlobal = document.getElementById('tab-btn-global');
    const btnBanlist = document.getElementById('tab-btn-banlist');
    const headGlobal = document.getElementById('table-header-global');
    const headBanlist = document.getElementById('table-header-banlist');
    const mobileBanlistSort = document.getElementById('banlist-mobile-sort');
    const loadMoreContainer = document.getElementById('load-more-container');
    const tbody = document.getElementById('leaderboard-body');

    if (tbody) tbody.innerHTML = '';

    if (tab === 'global') {
      if (btnGlobal) {
        btnGlobal.style.background = '#ffa500';
        btnGlobal.style.color = '#111111';
        btnGlobal.style.border = 'none';
      }
      if (btnBanlist) {
        btnBanlist.style.background = 'rgba(255,255,255,0.05)';
        btnBanlist.style.color = '#9a9a9a';
        btnBanlist.style.border = '1px solid rgba(255,255,255,0.15)';
      }

      if (headGlobal) headGlobal.classList.remove('hidden');
      if (headBanlist) headBanlist.classList.add('hidden');
      if (mobileBanlistSort) mobileBanlistSort.classList.add('hidden');
      renderTable();
      updateExpansionControls();
    } else {
      if (btnBanlist) {
        btnBanlist.style.background = '#ef4444';
        btnBanlist.style.color = '#ffffff';
        btnBanlist.style.border = 'none';
      }
      if (btnGlobal) {
        btnGlobal.style.background = 'rgba(255,255,255,0.05)';
        btnGlobal.style.color = '#9a9a9a';
        btnGlobal.style.border = '1px solid rgba(255,255,255,0.15)';
      }

      if (headGlobal) headGlobal.classList.add('hidden');
      if (headBanlist) headBanlist.classList.remove('hidden');
      if (mobileBanlistSort) mobileBanlistSort.classList.remove('hidden');
      if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
      renderBanlistTable();
    }
  };

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

  // ── Render global leaderboard table ───────────────────────────────────────
  function renderTable() {
    if (currentTab !== 'global') return;
    const tbody = document.getElementById('leaderboard-body');
    tbody.classList.remove('banlist-mode');
    tbody.innerHTML = '';

    if (playersData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">${getDict().home.empty}</td></tr>`;
      return;
    }

    const sortedData = [...playersData].sort((a, b) => {
      const aVal = a[sortConfig.key] || 0;
      const bVal = b[sortConfig.key] || 0;
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
        const prevVal = prevP[sortConfig.key] || 0;
        const curVal = p[sortConfig.key] || 0;
        if (curVal !== prevVal) {
          currentDisplayRank++;
        }
      }

      const tr = document.createElement('tr');
      tr.className = 'premium-table-row';
      if (currentDisplayRank <= 3) tr.classList.add(`top-rank-row`, `top-rank-${currentDisplayRank}`);

      let rankHtml = `<span class="global-rank-badge">#${currentDisplayRank}</span>`;
      if (currentDisplayRank <= 3) rankHtml = `<span class="global-rank-badge ranking-position-${currentDisplayRank}">#${currentDisplayRank}</span>`;

      const staticBadge = p.isStatic ? `<span title="${currentLang === 'en' ? 'Cached data' : 'Кэшированные данные'}" style="font-size:0.7em;color:#9a9a9a;margin-left:4px;">📦</span>` : '';

      tr.innerHTML = `
        <td class="p-4">${rankHtml}</td>
        <td class="p-4 font-bold text-lg">
          <a href="/player?name=${encodeURIComponent(p.name)}" class="text-white hover:text-blue-400 transition-colors">
            ${escapeHtml(p.name)}
          </a>${staticBadge}
        </td>
        <td class="p-4 text-right font-mono text-emerald-400/80">${(p.newPtsBase || 0).toLocaleString()}</td>
        <td class="p-4 text-right font-mono text-purple-400/80">${(p.newPtsSkill || 0).toLocaleString()}</td>
        <td class="p-4 text-right font-mono font-bold text-amber-400 text-lg">${(p.newPtsTotal || 0).toLocaleString()}</td>
      `;
      fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
  }

  // ── Render ban list table ─────────────────────────────────────────────────
  let banlistSortConfig = { key: 'count', direction: 'desc' };

  window.requestBanlistSort = function (key) {
    if (banlistSortConfig.key === key) {
      banlistSortConfig.direction = banlistSortConfig.direction === 'desc' ? 'asc' : 'desc';
    } else {
      banlistSortConfig = { key, direction: 'desc' };
    }
    renderBanlistTable();
  };

  function updateBanlistSortUI() {
    const keys = ['count', 'wr1', 'top10', 'top50'];
    keys.forEach(k => {
      const label = k === 'count' ? 'Total' : k === 'wr1' ? '#1 WRs' : k === 'top10' ? '#2-10' : '#11-50';
      const buttons = document.querySelectorAll(`#sort-btn-${k}, [data-banlist-sort="${k}"]`);
      buttons.forEach(btn => {
        if (banlistSortConfig.key === k) {
          const arrow = banlistSortConfig.direction === 'desc' ? '▾' : '▴';
          btn.classList.add('is-active');
          btn.setAttribute('aria-pressed', 'true');
          btn.textContent = `${label} ${arrow}`;
        } else {
          btn.classList.remove('is-active');
          btn.setAttribute('aria-pressed', 'false');
          btn.textContent = `${label} ▾`;
        }
      });
    });
  }

  function renderBanlistTable() {
    if (currentTab !== 'banlist') return;
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;
    tbody.classList.add('banlist-mode');
    tbody.innerHTML = '';

    const rawList = window.blacklistData || [];
    document.getElementById('banlist-count').textContent = rawList.length;
    document.getElementById('table-banned-player').textContent = currentLang === 'en' ? 'Banned Player' : 'Заблокированный игрок';
    document.getElementById('table-banned-status').textContent = currentLang === 'en' ? 'Deleted Records' : 'Удалено рекордов';
    document.getElementById('banlist-mobile-sort-label').textContent = currentLang === 'en' ? 'Deleted records:' : 'Удалено рекордов:';

    updateBanlistSortUI();

    if (rawList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-slate-500">${currentLang === 'en' ? 'No banned players' : 'Список бана пуст'}</td></tr>`;
      return;
    }

    // Support both string array and object array { name, count, wr1, top10, top50 }
    const list = rawList.map(item => typeof item === 'string' ? { name: item, count: 0, wr1: 0, top10: 0, top50: 0 } : item);

    list.sort((a, b) => {
      let aVal = a[banlistSortConfig.key];
      let bVal = b[banlistSortConfig.key];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
        if (aVal < bVal) return banlistSortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return banlistSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }

      aVal = aVal || 0;
      bVal = bVal || 0;
      if (aVal !== bVal) {
        return banlistSortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return (b.count || 0) - (a.count || 0);
    });

    let currentDisplayRank = 1;
    list.forEach((item, idx) => {
      if (idx > 0) {
        const prevItem = list[idx - 1];
        const prevVal = prevItem[banlistSortConfig.key] || 0;
        const curVal = item[banlistSortConfig.key] || 0;
        if (curVal !== prevVal) {
          currentDisplayRank++;
        }
      }

      const name = item.name;
      const count = item.count || 0;
      const wr1 = item.wr1 || 0;
      const top10 = item.top10 || 0;
      const top50 = item.top50 || 0;

      const isTgAd = /t\.me\//i.test(name);
      const blurStyle = isTgAd ? 'filter: blur(5px); user-select: none; display: inline-block; cursor: not-allowed;' : '';

      let rankBadge = `<span class="text-slate-500 font-mono">#${currentDisplayRank}</span>`;
      if (currentDisplayRank === 1) rankBadge = `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded-md font-bold text-sm shadow-[0_0_10px_rgba(251,191,36,0.3)]">#1</span>`;
      else if (currentDisplayRank === 2) rankBadge = `<span class="bg-slate-300/20 text-slate-300 border border-slate-300/50 px-2 py-0.5 rounded-md font-bold text-sm">#2</span>`;
      else if (currentDisplayRank === 3) rankBadge = `<span class="bg-amber-700/20 text-amber-600 border border-amber-700/50 px-2 py-0.5 rounded-md font-bold text-sm">#3</span>`;

      const badgeContent = `
        <span class="ban-stat ban-stat-total">${currentLang === 'en' ? 'Total' : 'Всего'} ${count.toLocaleString()}</span>
        <span class="ban-stat ban-stat-wr">#1 ${wr1}</span>
        <span class="ban-stat">#2-10 ${top10}</span>
        <span class="ban-stat">#11-50 ${top50}</span>
      `;

      const tr = document.createElement('tr');
      tr.className = 'premium-table-row transition-colors';
      tr.innerHTML = `
        <td class="p-4">${rankBadge}</td>
        <td class="p-4 font-bold">
          <a href="/player?name=${encodeURIComponent(name)}" class="text-red-400 hover:text-red-300 transition-colors" style="${blurStyle}">
            ${escapeHtml(name)}
          </a>
        </td>
        <td class="p-4 text-right">
          <span class="ban-record-stats">
            ${badgeContent}
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });
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
    setTxt('home-how-it-works', dict.home.howItWorks);
    setTxt('home-base-pts-title', dict.home.basePtsTitle);
    setTxt('home-base-pts-desc', dict.home.basePtsDesc);
    setTxt('home-skill-pts-title', dict.home.skillPtsTitle);
    setTxt('home-skill-pts-desc', dict.home.skillPtsDesc);
    setTxt('scoring-logic-label', currentLang === 'en' ? 'SCORING LOGIC' : 'ЛОГИКА НАЧИСЛЕНИЯ');
    setTxt('player-scan-label', currentLang === 'en' ? 'PLAYER SEARCH / 02' : 'ПОИСК ИГРОКА / 02');
    setTxt('global-telemetry-label', currentLang === 'en' ? 'GLOBAL RANKING / ALL PLAYERS' : 'ОБЩИЙ РЕЙТИНГ / ВСЕ ИГРОКИ');

    setTxt('home-skill-pts-and', currentLang === 'en' ? 'and record' : 'и рекорда');
    setTxt('home-skill-pts-where', currentLang === 'en' ? 'Where' : 'Где');
    setTxt('home-skill-pts-and2', currentLang === 'en' ? 'and' : 'и');
    setTxt('home-skill-pts-s-desc', currentLang === 'en'
      ? 'dynamic strictness coefficient (0.5 to 3.0 based on variance)'
      : 'динамический коэффициент строгости (от 0.5 до 3.0 в зависимости от дисперсии)');

    setTxt('search-title', currentLang === 'en' ? 'Find Player' : 'Найти игрока');
    setTxt('home-leaderboard-title', dict.home.leaderboardTitle);
    setTxt('table-rank', dict.home.tableRank);
    setTxt('table-player', dict.home.tablePlayer);
    setTxt('table-base', dict.home.tableBase);
    setTxt('table-skill', dict.home.tableSkill);
    setTxt('table-total', dict.home.tableTotal);
    setTxt('empty-state', dict.home.empty);
    setTxt('status-message', '');
    
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) loadMoreBtn.textContent = getLoadMoreBtnText(displayLimit);

    const toolsText = currentLang === 'en' ? {
      title: 'Search and compare', label: 'PLAYER TOOLS', mapTitle: 'Find a map',
      mapDesc: 'Open map records, times and leaderboard', mapPlaceholder: 'Map name, e.g. Kintaro', mapBtn: 'Open map',
      pvpDesc: 'Open the comparison tool and see who performs better', pvpBtn: 'Go and try'
    } : {
      title: 'Поиск и сравнение', label: 'ИНСТРУМЕНТЫ ИГРОКА', mapTitle: 'Найти карту',
      mapDesc: 'Откройте рекорды, времена и рейтинг карты', mapPlaceholder: 'Название карты, например Kintaro', mapBtn: 'Открыть карту',
      pvpDesc: 'Откройте сравнение и узнайте, кто показывает лучший результат', pvpBtn: 'Перейти и попробовать'
    };
    setTxt('home-tools-title', toolsText.title);
    setTxt('home-tools-label', toolsText.label);
    setTxt('home-map-search-title', toolsText.mapTitle);
    setTxt('home-map-search-desc', toolsText.mapDesc);
    setTxt('home-map-search-btn', toolsText.mapBtn);
    setTxt('home-pvp-desc', toolsText.pvpDesc);
    setTxt('home-pvp-btn', toolsText.pvpBtn);

    const homeMapInput = document.querySelector('.home-map-search-form input');
    if (homeMapInput) homeMapInput.placeholder = toolsText.mapPlaceholder;

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

    // Icons
    setHtml('icon-arrow-right-1', icons.arrowRight);
    setHtml('icon-arrow-right-2', icons.arrowRight);
    setHtml('icon-arrow-1', icons.arrowUpDown);
    setHtml('icon-arrow-2', icons.arrowUpDown);
    setHtml('icon-arrow-3', icons.arrowUpDown);
    setHtml('search-btn', icons.search);
    setHtml('leaderboard-loader', icons.loader);

    // Render Math
    const m1 = document.getElementById('math-1'); if (m1) katex.render('P_{total} = P_{base} + P_{skill}', m1, { displayMode: true });
    const m2 = document.getElementById('math-2'); if (m2) katex.render('P_{base} = P_{DDNet}', m2, { displayMode: false });
    const m3 = document.getElementById('math-3'); if (m3) katex.render('t_{player}', m3, { displayMode: false });
    const m4 = document.getElementById('math-4'); if (m4) katex.render('t_{best}', m4, { displayMode: false });
    const m5 = document.getElementById('math-5'); if (m5) katex.render('P_{skill} = \\lfloor P_{max\\_bonus} \\times e^{-s(\\frac{t_{player}}{t_{best}} - 1)} \\rfloor', m5, { displayMode: true });
    const m6 = document.getElementById('math-6'); if (m6) katex.render('P_{max\\_bonus} = P_{DDNet} \\times 5', m6, { displayMode: false });
    const m7 = document.getElementById('math-7'); if (m7) katex.render('s', m7, { displayMode: false });

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

    const banlist = window.blacklistData || [];
    setTxt('banlist-count', banlist.length);

    loadLeaderboard();
  });
})();
