/* page-maps.js — Global Maps Explorer */

(function () {
  'use strict';

  const ITEMS_PER_PAGE = 48;
  let currentPage = 1;
  let currentFilteredMaps = [];
  let debounceTimeout = null;

  const searchInput = document.getElementById('maps-search-input');
  const searchClear = document.getElementById('maps-search-clear');
  const serverFilter = document.getElementById('maps-server-filter');
  const starsFilter = document.getElementById('maps-stars-filter');
  const sortFilter = document.getElementById('maps-sort-filter');
  const mapsGrid = document.getElementById('maps-grid');
  const mapsLoading = document.getElementById('maps-loading');
  const countDisplay = document.getElementById('maps-count-display');
  const pageDisplay = document.getElementById('maps-page-display');
  const prevBtn = document.getElementById('maps-prev-btn');
  const nextBtn = document.getElementById('maps-next-btn');
  const firstBtn = document.getElementById('maps-first-btn');
  const lastBtn = document.getElementById('maps-last-btn');
  const bottomPagination = document.getElementById('maps-bottom-pagination');
  const bottomPrev = document.getElementById('maps-bottom-prev');
  const bottomNext = document.getElementById('maps-bottom-next');
  const bottomPageDisplay = document.getElementById('maps-bottom-page-display');

  const escapeHtml = (unsafe) => {
    if (!unsafe) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const formatTime = (t) => {
    if (t === null || t === undefined || isNaN(t)) return '—';
    const s = Number(t);
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(2);
    return `${m}:${sec.padStart(5, '0')}`;
  };

  const getServerBadgeClass = (server) => {
    if (!server) return 'server-default';
    const s = server.toLowerCase();
    if (s.includes('novice'))    return 'server-novice';
    if (s.includes('moderate'))  return 'server-moderate';
    if (s.includes('brutal'))    return 'server-brutal';
    if (s.includes('insane'))    return 'server-insane';
    if (s.includes('dummy'))     return 'server-dummy';
    if (s.includes('solo'))      return 'server-solo';
    if (s.includes('race'))      return 'server-race';
    if (s.includes('ddmax'))     return 'server-ddmax';
    if (s.includes('oldschool')) return 'server-oldschool';
    if (s.includes('fun'))       return 'server-fun';
    return 'server-default';
  };

  const getStrictnessBadgeClass = (s) => {
    if (s <= 0.8) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (s <= 1.3) return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    if (s <= 1.8) return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  };

  const getFarmScoreBadgeClass = (score) => {
    if (score >= 200) return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black';
    if (score >= 100) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold';
    if (score >= 50)  return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 font-bold';
    return 'bg-slate-800 text-slate-400 border-white/10';
  };

  const syncCategoryChips = (selectedServer) => {
    const chips = document.querySelectorAll('.cat-chip');
    chips.forEach(chip => {
      const chipServer = chip.getAttribute('data-server');
      if (chipServer === selectedServer) {
        chip.className = 'cat-chip px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm transition-all';
      } else {
        chip.className = 'cat-chip px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-slate-200 transition-all';
      }
    });
  };

  const init = async () => {
    if (typeof initLang === 'function') initLang();
    if (typeof renderHeader === 'function') renderHeader('maps');

    const dict = getDict();
    const mDict = dict.maps || {};
    const isEn = currentLang === 'en';

    document.title = `${mDict.title || 'Maps Explorer'} — DDNet Map Mastery`;

    if (typeof renderBreadcrumbs === 'function') {
      renderBreadcrumbs([
        { label: dict.breadcrumbs ? dict.breadcrumbs.home : (isEn ? 'Home' : 'Главная'), url: '/' },
        { label: dict.breadcrumbs ? dict.breadcrumbs.maps : (isEn ? 'Maps Explorer' : 'База карт') }
      ]);
    }

    if (searchInput && mDict.searchPlaceholder) {
      searchInput.placeholder = mDict.searchPlaceholder;
    }

    const heroTitle = document.getElementById('maps-hero-title');
    if (heroTitle && mDict.title) heroTitle.textContent = mDict.title;

    const heroSub = document.getElementById('maps-hero-subtitle');
    if (heroSub && mDict.subtitle) heroSub.textContent = mDict.subtitle;

    const catLabel = document.getElementById('maps-categories-label');
    if (catLabel && mDict.categoriesLabel) catLabel.textContent = mDict.categoriesLabel;

    const catAllChip = document.getElementById('maps-chip-all');
    if (catAllChip && mDict.catAll) catAllChip.textContent = mDict.catAll;

    if (serverFilter && mDict.categoryAll) {
      const allOpt = serverFilter.querySelector('option[value="ALL"]');
      if (allOpt) allOpt.textContent = mDict.categoryAll;
    }

    if (starsFilter) {
      const allStars = starsFilter.querySelector('option[value="ALL"]');
      if (allStars && mDict.starsAll) allStars.textContent = mDict.starsAll;
    }

    if (sortFilter) {
      const optMap = {
        'farm_desc': mDict.sortFarmDesc,
        'base_desc': mDict.sortBaseDesc,
        'base_asc': mDict.sortBaseAsc,
        'strictness_desc': mDict.sortStrictnessDesc,
        'strictness_asc': mDict.sortStrictnessAsc,
        'stars_desc': mDict.sortStarsDesc,
        'name_asc': mDict.sortNameAsc
      };
      Object.entries(optMap).forEach(([val, label]) => {
        if (label) {
          const opt = sortFilter.querySelector(`option[value="${val}"]`);
          if (opt) opt.textContent = label;
        }
      });
    }

    if (firstBtn && mDict.firstPage) firstBtn.title = mDict.firstPage;
    if (prevBtn && mDict.prevPage) prevBtn.title = mDict.prevPage;
    if (nextBtn && mDict.nextPage) nextBtn.title = mDict.nextPage;
    if (lastBtn && mDict.lastPage) lastBtn.title = mDict.lastPage;
    if (bottomPrev && mDict.prevPage) bottomPrev.textContent = `← ${mDict.prevPage}`;
    if (bottomNext && mDict.nextPage) bottomNext.textContent = `${mDict.nextPage} →`;

    // Wait for mapsData to be loaded
    const startRender = () => {
      if (window.mapsData && window.mapsData.length > 0) {
        if (mapsLoading) mapsLoading.classList.add('hidden');
        if (bottomPagination) bottomPagination.classList.remove('hidden');
        applyFiltersAndSort();
        return true;
      }
      return false;
    };

    if (!startRender()) {
      const checkMaps = setInterval(() => {
        if (startRender()) {
          clearInterval(checkMaps);
        }
      }, 50);
    }

    // Event listeners
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        if (searchClear) {
          searchClear.classList.toggle('hidden', !searchInput.value);
        }
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          currentPage = 1;
          applyFiltersAndSort();
        }, 150);
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchClear.classList.add('hidden');
          currentPage = 1;
          applyFiltersAndSort();
          searchInput.focus();
        }
      });
    }

    if (serverFilter) {
      serverFilter.addEventListener('change', () => {
        currentPage = 1;
        syncCategoryChips(serverFilter.value);
        applyFiltersAndSort();
      });
    }

    if (starsFilter) {
      starsFilter.addEventListener('change', () => {
        currentPage = 1;
        applyFiltersAndSort();
      });
    }

    if (sortFilter) {
      sortFilter.addEventListener('change', () => {
        currentPage = 1;
        applyFiltersAndSort();
      });
    }

    // Quick chips
    const chips = document.querySelectorAll('.cat-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const s = chip.getAttribute('data-server') || 'ALL';
        if (serverFilter) serverFilter.value = s;
        syncCategoryChips(s);
        currentPage = 1;
        applyFiltersAndSort();
      });
    });

    // Pagination handlers
    const goToPrev = () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage();
        window.scrollTo({ top: 200, behavior: 'smooth' });
      }
    };

    const goToNext = () => {
      const maxPages = Math.ceil(currentFilteredMaps.length / ITEMS_PER_PAGE);
      if (currentPage < maxPages) {
        currentPage++;
        renderPage();
        window.scrollTo({ top: 200, behavior: 'smooth' });
      }
    };

    if (prevBtn) prevBtn.addEventListener('click', goToPrev);
    if (nextBtn) nextBtn.addEventListener('click', goToNext);
    if (bottomPrev) bottomPrev.addEventListener('click', goToPrev);
    if (bottomNext) bottomNext.addEventListener('click', goToNext);

    if (firstBtn) {
      firstBtn.addEventListener('click', () => {
        if (currentPage !== 1) {
          currentPage = 1;
          renderPage();
          window.scrollTo({ top: 200, behavior: 'smooth' });
        }
      });
    }

    if (lastBtn) {
      lastBtn.addEventListener('click', () => {
        const maxPages = Math.ceil(currentFilteredMaps.length / ITEMS_PER_PAGE);
        if (currentPage !== maxPages) {
          currentPage = maxPages;
          renderPage();
          window.scrollTo({ top: 200, behavior: 'smooth' });
        }
      });
    }
  };

  const applyFiltersAndSort = () => {
    if (!window.mapsData || !Array.isArray(window.mapsData)) return;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const serverVal = serverFilter ? serverFilter.value : 'ALL';
    const starsVal = starsFilter ? starsFilter.value : 'ALL';
    const sortVal = sortFilter ? sortFilter.value : 'farm_desc';

    // Filter
    currentFilteredMaps = window.mapsData.filter(m => {
      if (query) {
        const nameMatch = m.map && m.map.toLowerCase().includes(query);
        const mapperMatch = m.mapper && m.mapper.toLowerCase().includes(query);
        if (!nameMatch && !mapperMatch) return false;
      }

      if (serverVal !== 'ALL') {
        if (serverVal === 'DDmaX') {
          if (!m.server || !m.server.toLowerCase().startsWith('ddmax')) return false;
        } else {
          if (m.server !== serverVal) return false;
        }
      }

      if (starsVal !== 'ALL') {
        const starsNum = parseInt(starsVal, 10);
        if (Number(m.stars) !== starsNum) return false;
      }

      return true;
    });

    // Sort
    currentFilteredMaps.sort((a, b) => {
      const pA = Number(a.points) || 0;
      const pB = Number(b.points) || 0;

      const starsA = Number(a.stars) || 0;
      const starsB = Number(b.stars) || 0;

      const statsA = (window.mapStatsData && window.mapStatsData[a.map]) || {};
      const statsB = (window.mapStatsData && window.mapStatsData[b.map]) || {};
      const sA = Number(statsA.s) || Number(a.s) || 2.0;
      const sB = Number(statsB.s) || Number(b.s) || 2.0;

      const farmA = pA > 0 ? Math.round((pA * 10) / sA) : 0;
      const farmB = pB > 0 ? Math.round((pB * 10) / sB) : 0;

      if (sortVal === 'farm_desc') return farmB - farmA || pB - pA || a.map.localeCompare(b.map);
      if (sortVal === 'base_desc') return pB - pA || farmB - farmA || a.map.localeCompare(b.map);
      if (sortVal === 'base_asc') return pA - pB || a.map.localeCompare(b.map);
      if (sortVal === 'strictness_desc') return sB - sA || pB - pA;
      if (sortVal === 'strictness_asc') return sA - sB || pB - pA;
      if (sortVal === 'stars_desc') return starsB - starsA || pB - pA;
      if (sortVal === 'name_asc') return a.map.localeCompare(b.map);
      return 0;
    });

    renderPage();
  };

  const renderPage = () => {
    if (!mapsGrid) return;

    const total = currentFilteredMaps.length;
    const maxPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    if (currentPage > maxPages) currentPage = maxPages;
    if (currentPage < 1) currentPage = 1;

    const isEn = currentLang === 'en';
    const dict = getDict();
    const mDict = dict.maps || {};
    const totalTemplate = mDict.foundCount || (isEn ? 'Found: {count} maps' : 'Найдено: {count} карт');
    const totalText = totalTemplate.replace('{count}', total.toLocaleString());

    if (countDisplay) countDisplay.textContent = totalText;
    if (pageDisplay) pageDisplay.textContent = `${currentPage} / ${maxPages}`;
    if (bottomPageDisplay) bottomPageDisplay.textContent = `${currentPage} / ${maxPages}`;

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === maxPages;
    if (firstBtn) firstBtn.disabled = currentPage === 1;
    if (lastBtn) lastBtn.disabled = currentPage === maxPages;
    if (bottomPrev) bottomPrev.disabled = currentPage === 1;
    if (bottomNext) bottomNext.disabled = currentPage === maxPages;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const slice = currentFilteredMaps.slice(start, start + ITEMS_PER_PAGE);

    if (slice.length === 0) {
      mapsGrid.innerHTML = `
        <div class="col-span-full text-center py-16 glass-panel border border-white/5 space-y-4">
          <div class="text-4xl">🗺️</div>
          <div class="text-lg font-bold text-slate-300">
            ${mDict.noMapsFound || (isEn ? 'No maps match your filters' : 'Карты по выбранным фильтрам не найдены')}
          </div>
          <p class="text-sm text-slate-500">
            ${mDict.noMapsFoundSub || (isEn ? 'Try adjusting your search query or category filters.' : 'Попробуйте изменить поисковый запрос или сбросить фильтры.')}
          </p>
          <button type="button" id="maps-reset-btn" class="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-sm font-bold transition-all">
            ${mDict.resetFilters || (isEn ? 'Reset All Filters' : 'Сбросить все фильтры')}
          </button>
        </div>
      `;

      const resetBtn = document.getElementById('maps-reset-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (searchInput) searchInput.value = '';
          if (searchClear) searchClear.classList.add('hidden');
          if (serverFilter) serverFilter.value = 'ALL';
          if (starsFilter) starsFilter.value = 'ALL';
          if (sortFilter) sortFilter.value = 'farm_desc';
          syncCategoryChips('ALL');
          currentPage = 1;
          applyFiltersAndSort();
        });
      }
      return;
    }

    mapsGrid.innerHTML = slice.map(m => {
      const stats = (window.mapStatsData && window.mapStatsData[m.map]) || {};
      const s = Number(stats.s) || Number(m.s) || 2.0;
      const pBase = Number(m.points) || 0;
      const stars = Number(m.stars) || 0;
      const farmScore = pBase > 0 ? Math.round((pBase * 10) / s) : 0;
      const maxPts = pBase * 6; // Base + 5x Base Skill Max

      const recordInfo = (window.mapRecordsData && window.mapRecordsData[m.map]) || null;
      let recordHtml = '';
      if (recordInfo && typeof recordInfo.time === 'number') {
        const wrHolder = recordInfo.name ? escapeHtml(recordInfo.name) : 'WR';
        const wrTitle = `${mDict.wrTooltip || (isEn ? 'World Record' : 'Мировой рекорд')}: ${formatTime(recordInfo.time)} (${wrHolder})`;
        recordHtml = `
          <div class="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400" title="${wrTitle}">
            <span class="flex items-center gap-1 text-amber-400/90 font-medium truncate">
              <span>👑</span>
              <span class="truncate max-w-[110px]">${wrHolder}</span>
            </span>
            <span class="font-mono font-bold text-slate-200">${formatTime(recordInfo.time)}</span>
          </div>
        `;
      }

      const starsStr = stars > 0 ? '★'.repeat(stars) : '';
      const byPrefix = mDict.by || (isEn ? 'by' : 'автор:');
      const mapperText = m.mapper ? `${byPrefix} ${escapeHtml(m.mapper)}` : '';

      return `
        <a href="/map/?name=${encodeURIComponent(m.map)}" class="block p-4 glass-panel border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all duration-200 group hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)] hover:border-amber-500/30 flex flex-col justify-between">
          <div>
            <!-- Top Card Header: Name & Server -->
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <span class="font-black text-white text-base truncate group-hover:text-amber-400 transition-colors" title="${escapeHtml(m.map)}">
                ${escapeHtml(m.map)}
              </span>
              <span class="server-badge ${getServerBadgeClass(m.server)} shrink-0 text-[0.65rem] px-2 py-0.5 font-bold">
                ${escapeHtml(m.server)}
              </span>
            </div>

            <!-- Mapper and Stars subline -->
            <div class="flex items-center justify-between gap-2 text-xs text-slate-400 min-h-[18px]">
              <span class="truncate text-[0.72rem] text-slate-400" title="${mapperText}">${mapperText}</span>
              ${starsStr ? `<span class="text-amber-400 tracking-tighter text-xs font-bold shrink-0">${starsStr}</span>` : ''}
            </div>
          </div>

          <!-- Bottom Card Stats -->
          <div class="mt-3">
            <div class="grid grid-cols-3 gap-1.5 bg-black/30 p-2 rounded-xl border border-white/5 text-center">
              <div>
                <div class="text-[0.62rem] text-slate-400 font-bold uppercase tracking-wider">Base</div>
                <div class="font-bold text-emerald-400 text-xs font-mono">+${pBase}</div>
              </div>
              <div>
                <div class="text-[0.62rem] text-slate-400 font-bold uppercase tracking-wider" title="Strictness Coefficient s">Strict s</div>
                <div class="font-bold text-xs font-mono text-purple-300">${s.toFixed(2)}</div>
              </div>
              <div>
                <div class="text-[0.62rem] text-amber-400/80 font-bold uppercase tracking-wider" title="Farm Score = (Base * 10) / s">Farm</div>
                <div class="font-bold text-xs font-mono text-amber-400">${farmScore}</div>
              </div>
            </div>

            ${recordHtml}
          </div>
        </a>
      `;
    }).join('');
  };

  document.addEventListener('DOMContentLoaded', init);

})();
