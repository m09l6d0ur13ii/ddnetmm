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

  // ── Render global leaderboard table ───────────────────────────────────────
  function renderTable() {
    const tbody = document.getElementById('leaderboard-body');
    tbody.classList.remove('banlist-mode');
    tbody.innerHTML = '';

    if (playersData.length === 0) {
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

    const sortedData = [...playersData].sort((a, b) => {
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
        <td class="p-4 font-bold text-lg">
          <a href="/player?name=${encodeURIComponent(p.name)}" class="text-white hover:text-amber-400 transition-colors">
            ${escapeHtml(p.name)}
          </a>${staticBadge}
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

    const banlist = window.blacklistData || [];
    setTxt('banlist-count', banlist.length);

    loadLeaderboard();
  });
})();
