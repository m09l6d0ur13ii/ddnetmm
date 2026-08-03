/* page-index.js — Logic for index.html */

(function () {
  'use strict';

  let playersData = [];
  let sortConfig = { key: 'newPtsTotal', direction: 'desc' };
  let displayLimit = Infinity;
  let loading = false;
  let currentTab = 'global';

  function getLoadMoreBtnText(limit) {
    return '';
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
    const dict = getDict();

    if (tab === 'global') {
      btnGlobal.style.background = '#ffa500';
      btnGlobal.style.color = '#111111';
      btnGlobal.style.border = 'none';

      btnBanlist.style.background = 'rgba(255,255,255,0.05)';
      btnBanlist.style.color = '#9a9a9a';
      btnBanlist.style.border = '1px solid rgba(255,255,255,0.15)';

      headGlobal.classList.remove('hidden');
      headBanlist.classList.add('hidden');
      mobileBanlistSort.classList.add('hidden');
      loadMoreContainer.classList.add('hidden');
      renderTable();
    } else {
      btnBanlist.style.background = '#ef4444';
      btnBanlist.style.color = '#ffffff';
      btnBanlist.style.border = 'none';

      btnGlobal.style.background = 'rgba(255,255,255,0.05)';
      btnGlobal.style.color = '#9a9a9a';
      btnGlobal.style.border = '1px solid rgba(255,255,255,0.15)';

      headGlobal.classList.add('hidden');
      headBanlist.classList.remove('hidden');
      mobileBanlistSort.classList.remove('hidden');

      loadMoreContainer.classList.add('hidden');
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
    sortedData.slice(0, displayLimit).forEach((p, idx) => {
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
          <a href="player.html?name=${encodeURIComponent(p.name)}" class="text-white hover:text-blue-400 transition-colors">
            ${escapeHtml(p.name)}
          </a>${staticBadge}
        </td>
        <td class="p-4 text-right font-mono text-emerald-400/80">${(p.newPtsBase || 0).toLocaleString()}</td>
        <td class="p-4 text-right font-mono text-purple-400/80">${(p.newPtsSkill || 0).toLocaleString()}</td>
        <td class="p-4 text-right font-mono font-bold text-amber-400 text-lg">${(p.newPtsTotal || 0).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
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
    const tbody = document.getElementById('leaderboard-body');
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

      let badgeContent = currentLang === 'en' ? 'Banned' : 'Заблокирован';
      if (count > 0) {
        badgeContent = `
          <span class="ban-stat ban-stat-total">${currentLang === 'en' ? 'Total' : 'Всего'} ${count.toLocaleString()}</span>
          <span class="ban-stat ban-stat-wr">#1 ${wr1}</span>
          <span class="ban-stat">#2-10 ${top10}</span>
          <span class="ban-stat">#11-50 ${top50}</span>
        `;
      }

      const tr = document.createElement('tr');
      tr.className = 'premium-table-row transition-colors';
      tr.innerHTML = `
        <td class="p-4">${rankBadge}</td>
        <td class="p-4 font-bold">
          <a href="player.html?name=${encodeURIComponent(name)}" class="text-red-400 hover:text-red-300 transition-colors" style="${blurStyle}">
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

  // ── Load leaderboard ──────────────────────────────────────────────────────
  async function loadLeaderboard() {
    loading = true;
    document.getElementById('leaderboard-loader').classList.remove('hidden');
    document.getElementById('load-more-btn').disabled = true;
    document.getElementById('load-more-btn').innerHTML = icons.loader;

    try {
      playersData = await window.api.getTopPlayersLive(displayLimit, (done, total) => {
        document.getElementById('status-message').textContent =
          `${currentLang === 'en' ? 'Loading' : 'Загрузка'} ${done} / ${total}...`;
      });
      document.getElementById('status-message').textContent = '';

      // Warn if all data is cached (DDStats unreachable)
      const allStatic = playersData.length > 0 && playersData.every(p => p.isStatic);
      if (allStatic) {
        document.getElementById('status-message').textContent =
          currentLang === 'en'
            ? '⚠ DDStats unreachable — showing cached data'
            : '⚠ DDStats недоступен — показаны кэшированные данные';
        document.getElementById('status-message').style.color = '#f59e0b';
      }

      renderTable();
    } catch (err) {
      document.getElementById('empty-state').textContent = 'Error loading data';
    } finally {
      loading = false;
      document.getElementById('leaderboard-loader').classList.add('hidden');
      document.getElementById('load-more-btn').disabled = false;
      document.getElementById('load-more-btn').textContent = getLoadMoreBtnText(displayLimit);

      if (currentTab === 'global' && displayLimit < 100 && playersData.length >= displayLimit) {
        document.getElementById('load-more-container').classList.remove('hidden');
      } else {
        document.getElementById('load-more-container').classList.add('hidden');
      }
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
    document.getElementById('home-title').textContent = dict.home.title;
    document.getElementById('home-subtitle').textContent = dict.home.subtitle;
    document.getElementById('home-about-btn').textContent = dict.home.aboutBtn;
    document.getElementById('home-compare-btn').textContent = dict.home.compareBtn;
    document.getElementById('home-how-it-works').textContent = dict.home.howItWorks;
    document.getElementById('home-base-pts-title').textContent = dict.home.basePtsTitle;
    document.getElementById('home-base-pts-desc').textContent = dict.home.basePtsDesc;
    document.getElementById('home-skill-pts-title').textContent = dict.home.skillPtsTitle;
    document.getElementById('home-skill-pts-desc').textContent = dict.home.skillPtsDesc;
    document.getElementById('scoring-logic-label').textContent = currentLang === 'en' ? 'SCORING LOGIC' : 'ЛОГИКА НАЧИСЛЕНИЯ';
    document.getElementById('player-scan-label').textContent = currentLang === 'en' ? 'PLAYER SEARCH / 02' : 'ПОИСК ИГРОКА / 02';
    document.getElementById('global-telemetry-label').textContent = currentLang === 'en' ? 'GLOBAL RANKING / ALL PLAYERS' : 'ОБЩИЙ РЕЙТИНГ / ВСЕ ИГРОКИ';

    document.getElementById('home-skill-pts-and').textContent = currentLang === 'en' ? 'and record' : 'и рекорда';
    document.getElementById('home-skill-pts-where').textContent = currentLang === 'en' ? 'Where' : 'Где';
    document.getElementById('home-skill-pts-and2').textContent = currentLang === 'en' ? 'and' : 'и';
    document.getElementById('home-skill-pts-s-desc').textContent = currentLang === 'en'
      ? 'dynamic strictness coefficient (0.5 to 3.0 based on variance)'
      : 'динамический коэффициент строгости (от 0.5 до 3.0 в зависимости от дисперсии)';

    document.getElementById('search-title').textContent = currentLang === 'en' ? 'Find Player' : 'Найти игрока';
    document.getElementById('home-leaderboard-title').textContent = dict.home.leaderboardTitle;
    document.getElementById('table-rank').textContent = dict.home.tableRank;
    document.getElementById('table-player').textContent = dict.home.tablePlayer;
    document.getElementById('table-base').textContent = dict.home.tableBase;
    document.getElementById('table-skill').textContent = dict.home.tableSkill;
    document.getElementById('table-total').textContent = dict.home.tableTotal;
    document.getElementById('empty-state').textContent = dict.home.empty;
    document.getElementById('status-message').textContent = '';
    document.getElementById('load-more-btn').textContent = getLoadMoreBtnText(displayLimit);

    // Search result labels from i18n (no more hardcode)
    document.getElementById('search-result-base-label').textContent = dict.home.searchResultBase;
    document.getElementById('search-result-skill-label').textContent = dict.home.searchResultSkill;
    document.getElementById('search-result-total-label').textContent = dict.home.searchResultTotal;
    const copyTextEl = document.getElementById('search-result-copy-text');
    if (copyTextEl) copyTextEl.textContent = dict.home.copyBtn || 'Copy';

    // Icons
    document.getElementById('icon-arrow-right-1').innerHTML = icons.arrowRight;
    document.getElementById('icon-arrow-right-2').innerHTML = icons.arrowRight;
    document.getElementById('icon-arrow-1').innerHTML = icons.arrowUpDown;
    document.getElementById('icon-arrow-2').innerHTML = icons.arrowUpDown;
    document.getElementById('icon-arrow-3').innerHTML = icons.arrowUpDown;
    document.getElementById('search-btn').innerHTML = icons.search;
    document.getElementById('leaderboard-loader').innerHTML = icons.loader;

    // Render Math
    katex.render('P_{total} = P_{base} + P_{skill}', document.getElementById('math-1'), { displayMode: true });
    katex.render('P_{base} = P_{DDNet}', document.getElementById('math-2'), { displayMode: false });
    katex.render('t_{player}', document.getElementById('math-3'), { displayMode: false });
    katex.render('t_{best}', document.getElementById('math-4'), { displayMode: false });
    katex.render('P_{skill} = \\lfloor P_{max\\_bonus} \\times e^{-s(\\frac{t_{player}}{t_{best}} - 1)} \\rfloor',
      document.getElementById('math-5'), { displayMode: true });
    katex.render('P_{max\\_bonus} = P_{DDNet} \\times 5', document.getElementById('math-6'), { displayMode: false });
    katex.render('s', document.getElementById('math-7'), { displayMode: false });

    // Player search
    let lastSearchResult = null;
    const copyBtn = document.getElementById('search-result-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (!lastSearchResult) return;
        const cardText = `${lastSearchResult.name} | base: ${lastSearchResult.newPtsBase} | skill: ${lastSearchResult.newPtsSkill} | total: ${lastSearchResult.newPtsTotal} | https://m09l6d0ur13ii.github.io/ddnetmm`;
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

    document.getElementById('player-search-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = document.getElementById('search-input').value.trim();
      if (!val) return;

      const btn = document.getElementById('search-btn');
      btn.innerHTML = icons.loader;
      btn.disabled = true;
      document.getElementById('search-error').classList.add('hidden');
      document.getElementById('search-result').classList.add('hidden');

      let res = playersData.find(p => p.name === val);
      try {
        if (!res) res = await window.api.fetchPlayerPts(val);
        lastSearchResult = res;
        document.getElementById('search-result-name').textContent = res.name;
        document.getElementById('search-result-name').href = `player.html?name=${encodeURIComponent(res.name)}`;
        document.getElementById('search-result-base').textContent = '+' + res.newPtsBase.toLocaleString();
        document.getElementById('search-result-skill').textContent = '+' + res.newPtsSkill.toLocaleString();
        document.getElementById('search-result-total').textContent = res.newPtsTotal.toLocaleString();
        document.getElementById('search-result').classList.remove('hidden');
      } catch (err) {
        const errEl = document.getElementById('search-error');
        errEl.textContent = (err.isBlacklisted || (window.isBlacklisted && window.isBlacklisted(val)))
          ? (currentLang === 'en' ? 'Player is blacklisted (TAS / Cheating)' : 'Игрок заблокирован в системе (TAS / Читы)')
          : (currentLang === 'en' ? 'Player not found or DDStats service temporarily unavailable' : 'Игрок не найден или сервис DDStats временно недоступен');
        errEl.classList.remove('hidden');
      } finally {
        btn.innerHTML = icons.search;
        btn.disabled = false;
      }
    });

    // Load more
    document.getElementById('load-more-btn').addEventListener('click', () => {
      if (displayLimit < 20) displayLimit = 20;
      else if (displayLimit < 40) displayLimit = 40;
      else displayLimit = 100;
      loadLeaderboard();
    });

    setupPlayerAutocomplete('search-input', () => {
      const form = document.getElementById('player-search-form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    const banlist = window.blacklistData || [];
    document.getElementById('banlist-count').textContent = banlist.length;

    loadLeaderboard();
  });
})();
