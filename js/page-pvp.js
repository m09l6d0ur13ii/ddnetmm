/* page-pvp.js — Logic for pvp.html (Player vs Player Comparison) */

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

  document.addEventListener('DOMContentLoaded', () => {
    renderHeader('pvp');

    if (window.setupPlayerAutocomplete) {
      window.setupPlayerAutocomplete('pvp-player1-input', (val) => {
        const input1 = document.getElementById('pvp-player1-input');
        if (input1) input1.value = val;
      });
      window.setupPlayerAutocomplete('pvp-player2-input', (val) => {
        const input2 = document.getElementById('pvp-player2-input');
        if (input2) input2.value = val;
      });
    }

    applyPvpTranslations();

    if (typeof renderBreadcrumbs === 'function') {
      const dict = getDict();
      const homeLabel = dict.breadcrumbs ? dict.breadcrumbs.home : 'Home';
      const pvpLabel = dict.breadcrumbs ? dict.breadcrumbs.pvp : 'PvP Duel';
      renderBreadcrumbs([
        { label: homeLabel, url: '/' },
        { label: pvpLabel }
      ]);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const p1Url = urlParams.get('p1') || urlParams.get('player1');
    const p2Url = urlParams.get('p2') || urlParams.get('player2');

    if (p1Url && document.getElementById('pvp-player1-input')) {
      document.getElementById('pvp-player1-input').value = p1Url;
    }
    if (p2Url && document.getElementById('pvp-player2-input')) {
      document.getElementById('pvp-player2-input').value = p2Url;
    }

    if (p1Url && p2Url) {
      runComparison(p1Url, p2Url);
    }

    const pvpForm = document.getElementById('pvp-form');
    if (pvpForm) {
      pvpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const p1 = (document.getElementById('pvp-player1-input')?.value || '').trim();
        const p2 = (document.getElementById('pvp-player2-input')?.value || '').trim();

        if (!p1 || !p2) return;
        if (p1.toLowerCase() === p2.toLowerCase()) {
          showError(getDict().pvp ? getDict().pvp.errorDiff : 'Выберите двух разных игроков');
          return;
        }

        window.history.pushState({}, '', `/pvp?p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}`);
        runComparison(p1, p2);
      });
    }
  });

  function applyPvpTranslations() {
    const dict = getDict();
    const pvp = dict.pvp || {};

    const setTxt = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setTxt('pvp-back', pvp.back || 'На главную');
    setTxt('pvp-title-text', (pvp.title || 'Player vs Player').replace(/\s*⚔️?\s*/g, ' ').trim());
    setTxt('pvp-subtitle', pvp.subtitle || '');
    setTxt('lbl-pvp-p1', pvp.player1 || 'Игрок 1');
    setTxt('lbl-pvp-p2', pvp.player2 || 'Игрок 2');
    setTxt('pvp-submit-btn', pvp.compareBtn || 'Сравнить ⚔️');
    setTxt('pvp-loading-text', pvp.loading || 'Загрузка...');

    setTxt('p1-card-label', pvp.player1 || 'Player 1');
    setTxt('p2-card-label', pvp.player2 || 'Player 2');
    setTxt('p1-wins-label', pvp.wins || 'Побед на картах');
    setTxt('p2-wins-label', pvp.wins || 'Побед на картах');

    setTxt('h2h-score-label', pvp.h2hScore || 'СЧЕТ ДУЭЛИ');
    setTxt('common-count-label', pvp.commonMaps || 'Общих карт');

    const searchInput = document.getElementById('pvp-map-search');
    if (searchInput) searchInput.placeholder = pvp.searchPlaceholder || 'Поиск карты...';

    setTxt('th-map', pvp.map || 'Карта');
    setTxt('th-server', pvp.server || 'Сервер');
    setTxt('th-diff', pvp.winner || 'Победитель & Разница');
  }

  function showError(msg) {
    const errBox = document.getElementById('pvp-error');
    errBox.textContent = msg;
    errBox.classList.remove('hidden');
    document.getElementById('pvp-loading').classList.add('hidden');
    document.getElementById('pvp-results').classList.add('hidden');
  }

  async function runComparison(name1, name2) {
    const pvp = getDict().pvp || {};
    document.getElementById('pvp-error').classList.add('hidden');
    document.getElementById('pvp-results').classList.add('hidden');
    document.getElementById('pvp-loading').classList.remove('hidden');

    try {
      const [data1, data2] = await Promise.all([
        window.api.fetchPlayerPts(name1),
        window.api.fetchPlayerPts(name2)
      ]);

      document.getElementById('pvp-loading').classList.add('hidden');
      renderPvpResults(data1, data2);
    } catch (err) {
      console.error(err);
      showError(err.isBlacklisted
        ? (pvp.errorBlacklist || 'Один из игроков находится в чёрном списке (TAS / Читы)')
        : (pvp.errorFetch || 'Не удалось загрузить данные игроков')
      );
    }
  }

  function renderPvpResults(d1, d2) {
    const dict = getDict();
    const pvp = dict.pvp || {};

    const mapMap1 = new Map();
    (d1.finishDetails || []).forEach(m => mapMap1.set(m.mapName, m));

    const commonMaps = [];
    let p1Wins = 0;
    let p2Wins = 0;

    (d2.finishDetails || []).forEach(m2 => {
      if (mapMap1.has(m2.mapName)) {
        const m1 = mapMap1.get(m2.mapName);
        const timeDiff = Math.abs(m1.time - m2.time);
        const winner = m1.time < m2.time ? 1 : (m2.time < m1.time ? 2 : 0);

        if (winner === 1) p1Wins++;
        if (winner === 2) p2Wins++;

        commonMaps.push({
          mapName: m1.mapName,
          server: m1.server,
          t1: m1.time,
          t2: m2.time,
          pSkill1: m1.pSkill,
          pSkill2: m2.pSkill,
          timeDiff,
          winner
        });
      }
    });

    commonMaps.sort((a, b) => b.timeDiff - a.timeDiff);

    document.getElementById('p1-card-name').textContent  = d1.name;
    document.getElementById('p1-card-total').textContent = d1.newPtsTotal.toLocaleString() + ' PTS';
    document.getElementById('p1-card-base').textContent  = '+' + d1.newPtsBase.toLocaleString();
    document.getElementById('p1-card-skill').textContent = '+' + d1.newPtsSkill.toLocaleString();
    document.getElementById('p1-wins').textContent       = p1Wins;

    document.getElementById('p2-card-name').textContent  = d2.name;
    document.getElementById('p2-card-total').textContent = d2.newPtsTotal.toLocaleString() + ' PTS';
    document.getElementById('p2-card-base').textContent  = '+' + d2.newPtsBase.toLocaleString();
    document.getElementById('p2-card-skill').textContent = '+' + d2.newPtsSkill.toLocaleString();
    document.getElementById('p2-wins').textContent       = p2Wins;

    document.getElementById('th-p1-name').textContent = `${d1.name} Time`;
    document.getElementById('th-p2-name').textContent = `${d2.name} Time`;

    document.getElementById('score-p1').textContent = p1Wins;
    document.getElementById('score-p2').textContent = p2Wins;
    document.getElementById('common-count').textContent = commonMaps.length;
    document.getElementById('pvp-table-heading').innerHTML = `${pvp.duelTable || 'Дуэль на общих картах'} (<span id="table-common-total">${commonMaps.length}</span>)`;

    const card1 = document.getElementById('p1-card');
    const card2 = document.getElementById('p2-card');
    const badge1 = document.getElementById('p1-winner-badge-container');
    const badge2 = document.getElementById('p2-winner-badge-container');
    const box1 = document.getElementById('p1-wins-box');
    const box2 = document.getElementById('p2-wins-box');
    const score1El = document.getElementById('score-p1');
    const score2El = document.getElementById('score-p2');
    const winnerBanner = document.getElementById('h2h-winner-banner');

    badge1.innerHTML = '';
    badge2.innerHTML = '';

    const winnerBadgeHtml = `<div class="bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs px-3 py-1 uppercase tracking-wider rounded-full inline-block shadow-[0_0_10px_rgba(16,185,129,0.5)]">👑 ${pvp.winner || 'ПОБЕДИТЕЛЬ'}</div>`;

    if (p1Wins > p2Wins) {
      const diff = p1Wins - p2Wins;
      winnerBanner.className = 'block text-center p-4 rounded-xl border-2 border-emerald-500/60 bg-gradient-to-r from-emerald-500/15 via-teal-500/20 to-emerald-500/15 text-emerald-300 font-bold text-lg sm:text-2xl shadow-[0_0_25px_rgba(16,185,129,0.25)]';
      winnerBanner.innerHTML = `🏆 <strong class="text-white">${escapeHtml(d1.name)}</strong> ${pvp.leadsBy || 'лидирует с преимуществом в'} <strong class="text-emerald-400 font-black text-2xl sm:text-3xl px-1">+${diff}</strong> ${pvp.maps || 'карт'}!`;

      card1.className = 'glass-panel p-6 border-2 border-emerald-500 bg-emerald-950/20 shadow-[0_0_30px_rgba(16,185,129,0.3)] flex flex-col justify-between text-center space-y-4 relative overflow-hidden';
      badge1.innerHTML = winnerBadgeHtml;
      box1.className = 'bg-emerald-500/20 p-2 text-sm font-bold text-emerald-300 border border-emerald-500/40 rounded';
      score1El.className = 'text-emerald-400 font-black text-5xl sm:text-6xl drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]';

      card2.className = 'glass-panel p-6 border border-slate-700/80 bg-slate-900/60 opacity-80 flex flex-col justify-between text-center space-y-4';
      box2.className = 'bg-slate-800/40 p-2 text-sm font-bold text-rose-400 border border-rose-500/30 rounded';
      score2El.className = 'text-rose-500 font-bold text-4xl sm:text-5xl';
    } else if (p2Wins > p1Wins) {
      const diff = p2Wins - p1Wins;
      winnerBanner.className = 'block text-center p-4 rounded-xl border-2 border-emerald-500/60 bg-gradient-to-r from-emerald-500/15 via-teal-500/20 to-emerald-500/15 text-emerald-300 font-bold text-lg sm:text-2xl shadow-[0_0_25px_rgba(16,185,129,0.25)]';
      winnerBanner.innerHTML = `🏆 <strong class="text-white">${escapeHtml(d2.name)}</strong> ${pvp.leadsBy || 'лидирует с преимуществом в'} <strong class="text-emerald-400 font-black text-2xl sm:text-3xl px-1">+${diff}</strong> ${pvp.maps || 'карт'}!`;

      card2.className = 'glass-panel p-6 border-2 border-emerald-500 bg-emerald-950/20 shadow-[0_0_30px_rgba(16,185,129,0.3)] flex flex-col justify-between text-center space-y-4 relative overflow-hidden';
      badge2.innerHTML = winnerBadgeHtml;
      box2.className = 'bg-emerald-500/20 p-2 text-sm font-bold text-emerald-300 border border-emerald-500/40 rounded';
      score2El.className = 'text-emerald-400 font-black text-5xl sm:text-6xl drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]';

      card1.className = 'glass-panel p-6 border border-slate-700/80 bg-slate-900/60 opacity-80 flex flex-col justify-between text-center space-y-4';
      box1.className = 'bg-slate-800/40 p-2 text-sm font-bold text-rose-400 border border-rose-500/30 rounded';
      score1El.className = 'text-rose-500 font-bold text-4xl sm:text-5xl';
    } else {
      winnerBanner.className = 'block text-center p-4 rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-300 font-bold text-lg sm:text-xl';
      winnerBanner.innerHTML = pvp.tie || '🤝 Ничья на общих картах!';

      card1.className = 'glass-panel p-6 border border-amber-500/40 flex flex-col justify-between text-center space-y-4';
      card2.className = 'glass-panel p-6 border border-amber-500/40 flex flex-col justify-between text-center space-y-4';
      box1.className = 'bg-amber-500/10 p-2 text-sm font-bold text-amber-300 border border-amber-500/30 rounded';
      box2.className = 'bg-amber-500/10 p-2 text-sm font-bold text-amber-300 border border-amber-500/30 rounded';
      score1El.className = 'text-amber-400 font-bold text-5xl';
      score2El.className = 'text-amber-400 font-bold text-5xl';
    }

    let currentFilter = 'all';
    const ties = commonMaps.length - p1Wins - p2Wins;

    const mapSuggestions = document.getElementById('pvp-map-suggestions');
    if (mapSuggestions) {
      mapSuggestions.innerHTML = commonMaps
        .map(m => `<option value="${escapeHtml(m.mapName)}"></option>`)
        .join('');
    }

    // Filter Buttons Labels & Setup
    const btnAll = document.getElementById('btn-pvp-filter-all');
    const btnP1  = document.getElementById('btn-pvp-filter-p1');
    const btnP2  = document.getElementById('btn-pvp-filter-p2');
    const btnTie = document.getElementById('btn-pvp-filter-tie');

    if (btnAll) btnAll.textContent = `${pvp.filterAll || 'Все карт'} (${commonMaps.length})`;
    if (btnP1)  btnP1.textContent  = `🏆 ${d1.name} (${p1Wins})`;
    if (btnP2)  btnP2.textContent  = `🏆 ${d2.name} (${p2Wins})`;
    if (btnTie) btnTie.textContent = `🤝 ${pvp.filterTie || 'Ничьи'} (${ties})`;

    const filterBtns = document.querySelectorAll('[data-pvp-filter]');
    const updateFilterUI = () => {
      filterBtns.forEach(btn => {
        const type = btn.getAttribute('data-pvp-filter');
        if (type === currentFilter) {
          btn.className = 'px-3 py-1 text-xs font-bold rounded-lg border transition-all bg-amber-500 text-slate-950 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
        } else {
          btn.className = 'px-3 py-1 text-xs font-bold rounded-lg border transition-all bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500/50';
        }
      });
    };
    updateFilterUI();

    filterBtns.forEach(btn => {
      btn.onclick = () => {
        currentFilter = btn.getAttribute('data-pvp-filter');
        updateFilterUI();
        renderTable();
      };
    });

    const renderTable = () => {
      const searchQuery = (document.getElementById('pvp-map-search')?.value || '').toLowerCase().trim();
      const tbody = document.getElementById('pvp-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';

      const filtered = commonMaps.filter(m => {
        if (currentFilter === 'p1' && m.winner !== 1) return false;
        if (currentFilter === 'p2' && m.winner !== 2) return false;
        if (currentFilter === 'tie' && m.winner !== 0) return false;

        if (searchQuery && !m.mapName.toLowerCase().includes(searchQuery)) {
          return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">${pvp.noCommonMaps || 'Нет карт для отображения'}</td></tr>`;
        return;
      }

      const fragment = document.createDocumentFragment();
      filtered.forEach(m => {
        const tr = document.createElement('tr');
        tr.className = 'premium-table-row transition-colors';

        let winnerBadgeHtml = '';
        if (m.winner === 1) {
          winnerBadgeHtml = `<span class="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">🏆 ${escapeHtml(d1.name)} (+${formatTime(Math.abs(m.timeDiff))})</span>`;
        } else if (m.winner === 2) {
          winnerBadgeHtml = `<span class="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">🏆 ${escapeHtml(d2.name)} (+${formatTime(Math.abs(m.timeDiff))})</span>`;
        } else {
          winnerBadgeHtml = `<span class="px-2.5 py-1 rounded-md bg-slate-500/20 text-slate-300 text-xs font-bold">${pvp.equal || 'Ничья'}</span>`;
        }

        const t1Class = m.winner === 1 ? 'text-emerald-400 font-bold' : 'text-slate-200';
        const t2Class = m.winner === 2 ? 'text-emerald-400 font-bold' : 'text-slate-200';

        tr.innerHTML = `
          <td class="p-4 font-bold">
            <a href="/map?name=${encodeURIComponent(m.mapName)}" class="text-white hover:text-amber-400 transition-colors">
              ${escapeHtml(m.mapName)}
            </a>
          </td>
          <td class="p-4"><span class="server-badge ${getServerBadgeClass(m.server)}">${escapeHtml(m.server)}</span></td>
          <td class="p-4 font-mono text-right ${t1Class}">${formatTime(m.t1)} <span class="text-xs text-purple-400/80 pl-1">(+${m.pSkill1})</span></td>
          <td class="p-4 font-mono text-right ${t2Class}">${formatTime(m.t2)} <span class="text-xs text-purple-400/80 pl-1">(+${m.pSkill2})</span></td>
          <td class="p-4 text-center">${winnerBadgeHtml}</td>
        `;
        fragment.appendChild(tr);
      });
      tbody.appendChild(fragment);
    };

    const mapSearch = document.getElementById('pvp-map-search');
    if (mapSearch) {
      let searchTimer;
      mapSearch.oninput = () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(renderTable, 120);
      };
    }
    renderTable();

    const pvpResults = document.getElementById('pvp-results');
    if (pvpResults) pvpResults.classList.remove('hidden');
  }
})();
