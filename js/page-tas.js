/* page-tas.js — Standalone TAS Ban List logic */

(function () {
  'use strict';

  let sortConfig = { key: 'count', direction: 'desc' };
  let searchQuery = '';

  function getRawList() {
    return window.blacklistData || [];
  }

  function renderSummaryStats(list) {
    let totalBanned = list.length;
    let totalDeleted = 0;
    let totalWr1 = 0;
    let totalTop10 = 0;
    let totalTop50 = 0;

    list.forEach(item => {
      if (typeof item === 'object') {
        totalDeleted += (item.count || 0);
        totalWr1 += (item.wr1 || 0);
        totalTop10 += (item.top10 || 0);
        totalTop50 += (item.top50 || 0);
      }
    });

    const elBanned = document.getElementById('stat-banned-count');
    if (elBanned) elBanned.textContent = totalBanned.toLocaleString();

    const elDeleted = document.getElementById('stat-deleted-count');
    if (elDeleted) elDeleted.textContent = totalDeleted.toLocaleString();

    const elWr1 = document.getElementById('stat-wr1-count');
    if (elWr1) elWr1.textContent = totalWr1.toLocaleString();

    const elTop10 = document.getElementById('stat-top10-count');
    if (elTop10) elTop10.textContent = totalTop10.toLocaleString();
  }

  function updateSortHeaderArrows() {
    ['count', 'wr1', 'top10', 'top50', 'name'].forEach(k => {
      const el = document.getElementById(`sort-arrow-${k}`);
      if (el) {
        if (sortConfig.key === k) {
          el.textContent = sortConfig.direction === 'desc' ? ' ▾' : ' ▴';
        } else {
          el.textContent = '';
        }
      }
    });
  }

  window.requestTasSort = function (key) {
    if (sortConfig.key === key) {
      sortConfig.direction = sortConfig.direction === 'desc' ? 'asc' : 'desc';
    } else {
      sortConfig = { key, direction: 'desc' };
    }
    renderTasTable();
  };

  function renderTasTable() {
    const tbody = document.getElementById('tas-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const rawList = getRawList();
    renderSummaryStats(rawList);
    updateSortHeaderArrows();

    // Map strings to objects if needed
    let list = rawList.map(item => typeof item === 'string' ? { name: item, count: 0, wr1: 0, top10: 0, top50: 0 } : item);

    // Apply Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(item => item.name && item.name.toLowerCase().includes(q));
    }

    const dict = getDict().tas || {};

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-8 text-center text-slate-500">
            ${dict.noResults || 'No banned players found'}
          </td>
        </tr>
      `;
      return;
    }

    // Sort
    list.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }

      aVal = aVal || 0;
      bVal = bVal || 0;
      if (aVal !== bVal) {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return (b.count || 0) - (a.count || 0);
    });

    let currentDisplayRank = 1;
    list.forEach((item, idx) => {
      if (idx > 0) {
        const prevItem = list[idx - 1];
        const prevVal = prevItem[sortConfig.key] || 0;
        const curVal = item[sortConfig.key] || 0;
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
      if (currentDisplayRank === 1) rankBadge = `<span class="bg-red-500/20 text-red-300 border border-red-500/50 px-2 py-0.5 rounded-md font-bold text-sm shadow-[0_0_10px_rgba(239,68,68,0.3)]">#1</span>`;
      else if (currentDisplayRank === 2) rankBadge = `<span class="bg-slate-300/20 text-slate-300 border border-slate-300/50 px-2 py-0.5 rounded-md font-bold text-sm">#2</span>`;
      else if (currentDisplayRank === 3) rankBadge = `<span class="bg-amber-700/20 text-amber-600 border border-amber-700/50 px-2 py-0.5 rounded-md font-bold text-sm">#3</span>`;

      const tr = document.createElement('tr');
      tr.className = 'premium-table-row transition-colors hover:bg-red-500/[0.03]';
      tr.innerHTML = `
        <td class="p-4">${rankBadge}</td>
        <td class="p-4 font-bold">
          <a href="/player?name=${encodeURIComponent(name)}" class="text-red-400 hover:text-red-300 transition-colors" style="${blurStyle}">
            ${escapeHtml(name)}
          </a>
        </td>
        <td class="p-4 text-right font-mono font-bold text-red-400 text-base">${count.toLocaleString()}</td>
        <td class="p-4 text-right font-mono text-amber-300 font-semibold">${wr1.toLocaleString()}</td>
        <td class="p-4 text-right font-mono text-purple-300">${top10.toLocaleString()}</td>
        <td class="p-4 text-right font-mono text-slate-400">${top50.toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderHeader('tas');

    const dict = getDict();
    document.documentElement.lang = currentLang;

    if (typeof renderBreadcrumbs === 'function') {
      const homeLabel = dict.breadcrumbs ? dict.breadcrumbs.home : 'Home';
      const tasLabel = dict.breadcrumbs ? dict.breadcrumbs.tas : 'TAS Ban List';
      renderBreadcrumbs([
        { label: homeLabel, url: '/' },
        { label: tasLabel }
      ]);
    }

    const t = dict.tas || {};
    const setTxt = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    setTxt('tas-back', t.back || 'Back');
    setTxt('tas-page-title', t.title || 'TAS Ban List');
    setTxt('tas-page-subtitle', t.subtitle);
    setTxt('lbl-stat-banned', t.totalBanned || 'Banned Cheaters');
    setTxt('lbl-stat-deleted', t.totalDeleted || 'Total Purged Records');
    setTxt('lbl-stat-wr1', t.wrCount || '#1 World Records');
    setTxt('lbl-stat-top10', t.top10Count || '#2-10 Ranks');

    const searchInput = document.getElementById('tas-search-input');
    if (searchInput) {
      searchInput.placeholder = t.searchPlaceholder || 'Search banned player...';
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderTasTable();
      });
    }

    renderTasTable();
  });
})();
