/* Global UI and i18n scripts */

let currentLang = 'ru';

function initLang() {
  let lang = 'ru';
  try {
    if (localStorage.getItem('lang')) {
      // Пользователь уже выбирал язык вручную — уважаем его выбор
      lang = localStorage.getItem('lang');
    } else if (document.cookie.includes('lang=en')) {
      lang = 'en';
    } else {
      // Ничего не выбрано — определяем по языку браузера/системы
      const browserLang = (navigator.languages && navigator.languages[0]) || navigator.language || 'ru';
      lang = browserLang.toLowerCase().startsWith('en') ? 'en' : 'ru';
    }
  } catch (e) { }
  currentLang = lang === 'en' ? 'en' : 'ru';
  if (document.documentElement) {
    document.documentElement.lang = currentLang;
  }
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  window.location.reload();
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getDict() {
  return dictionaries[currentLang];
}

function renderHeader(activePage = 'home') {
  const dict = getDict().header;
  const headerHtml = `
    <header class="site-header">
      <div class="site-header-inner">

        <!-- Logo & Discord -->
        <div class="site-nav">
          <a href="/" class="site-nav-link${activePage === 'home' ? ' is-active' : ''}">
            <span>Home</span>
          </a>
          <span class="site-nav-divider">/</span>
          <a href="/pvp" class="site-nav-link site-pvp-link${activePage === 'pvp' ? ' is-active' : ''}">
            <span>Player vs Player</span>
          </a>
          <span class="site-nav-divider">/</span>
          <a href="/tas" class="site-nav-link site-tas-link${activePage === 'tas' ? ' is-active' : ''}" style="color:#ef4444;">
            <span>TAS Ban List</span>
          </a>
          <span class="site-nav-divider">/</span>
          <a href="https://discord.gg/BWmT3q96FP" class="site-discord-link" aria-label="teeproject Discord" target="_blank" rel="noopener noreferrer">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 127.14 96.36" fill="#5865F2"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.68 1.76 1.36 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.91-72.14zM42.45 65.69c-6.58 0-12-6.04-12-13.44s5.3-13.44 12-13.44c6.74 0 12.07 6.09 12 13.44 0 7.4-5.26 13.44-12 13.44zm42.24 0c-6.58 0-12-6.04-12-13.44s5.3-13.44 12-13.44c6.74 0 12.07 6.09 12 13.44 0 7.4-5.26 13.44-12 13.44z"/></svg>
            <span>teeproject discord</span>
          </a>
        </div>

        <!-- Language Toggles & Map Search -->
        <div class="site-header-tools">
          <!-- Language Toggles -->
          <div class="language-toggle">
            <button onclick="setLang('ru')" class="${currentLang === 'ru' ? 'is-active' : ''}">RU</button>
            <button onclick="setLang('en')" class="${currentLang === 'en' ? 'is-active' : ''}">EN</button>
          </div>

          <!-- Map Search -->
          <form id="header-map-search-form">
            <div class="header-search-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
              <input
                type="text"
                id="header-map-search-input"
                placeholder="${currentLang === 'ru' ? 'Поиск карты (напр: Kintaro)' : 'Search map (e.g. Kintaro)'}"
                autocomplete="off"
              />
            </div>
          </form>
      </div>
    </header>
  `;
  const headerContainer = document.getElementById('header-container');
  if (headerContainer) {
    headerContainer.innerHTML = headerHtml;
  }

  setTimeout(() => {
    const mapSearchForm = document.getElementById('header-map-search-form');
    if (mapSearchForm) {
      mapSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('header-map-search-input');
        if (input && input.value.trim()) {
          window.location.href = `/map?name=${encodeURIComponent(input.value.trim())}`;
        }
      });
    }

    // ── Autocomplete ────────────────────────────────────────────────
    const input = document.getElementById('header-map-search-input');
    if (input) {
      const wrap = input.parentElement;
      if (wrap) {
        wrap.style.position = 'relative';

        let dropdown = document.getElementById('map-autocomplete');
        if (!dropdown) {
          dropdown = document.createElement('div');
          dropdown.id = 'map-autocomplete';
          dropdown.style.display = 'none';
          wrap.appendChild(dropdown);
        }

        let activeIdx = -1;
        let currentItems = [];

        function escHtml(s) {
          return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }

        function highlightMatch(text, query) {
          if (!text || !query) return escHtml(text || '');
          const idx = text.toLowerCase().indexOf(query.toLowerCase());
          if (idx === -1) return escHtml(text);
          return escHtml(text.slice(0, idx))
            + '<strong class="ac-hl" style="color:var(--accent,#ffa500);font-weight:bold">' + escHtml(text.slice(idx, idx + query.length)) + '</strong>'
            + escHtml(text.slice(idx + query.length));
        }

        function renderDropdown(items, query) {
          activeIdx = -1;
          currentItems = items;
          if (!items.length) { dropdown.style.display = 'none'; return; }

          dropdown.innerHTML = items.map((m, i) => {
            const mapName = m.map || m.name || '';
            const mapper = m.mapper || '';
            const server = m.server || m.type || 'DDNet';
            const points = (m.points !== undefined && m.points !== null) ? m.points : (m.pts || 0);

            return `
              <a class="ac-item" data-idx="${i}" href="/map?name=${encodeURIComponent(mapName)}">
                <div class="ac-map-info">
                  <span class="ac-map-name">${highlightMatch(mapName, query)}</span>
                  ${mapper ? `<span class="ac-map-mapper">by ${highlightMatch(mapper, query)}</span>` : ''}
                </div>
                <div class="ac-map-meta">
                  <span class="ac-map-server">${escHtml(server)}</span>
                  <span class="ac-map-points">${points} PTS</span>
                </div>
              </a>
            `;
          }).join('');

          dropdown.style.display = 'block';

          dropdown.querySelectorAll('.ac-item').forEach(el => {
            el.addEventListener('mousedown', (e) => {
              e.preventDefault();
              const idx = parseInt(el.getAttribute('data-idx'), 10);
              selectItem(idx);
            });
            el.addEventListener('mouseenter', () => setActive(+el.dataset.idx));
          });
        }

        function setActive(idx) {
          activeIdx = idx;
          dropdown.querySelectorAll('.ac-item').forEach((el, i) => {
            const isAct = i === idx;
            el.classList.toggle('is-active', isAct);
          });

          if (idx >= 0) {
            const activeEl = dropdown.querySelectorAll('.ac-item')[idx];
            if (activeEl) {
              activeEl.scrollIntoView({ block: 'nearest' });
            }
          }
        }

        function selectItem(idx) {
          const m = currentItems[idx];
          if (!m) return;
          const mapName = m.map || m.name;
          input.value = mapName;
          dropdown.style.display = 'none';
          window.location.href = `/map?name=${encodeURIComponent(mapName)}`;
        }

        function closeDropdown() {
          dropdown.style.display = 'none';
          activeIdx = -1;
        }

        function triggerAutocomplete() {
          const q = input.value.trim();
          if (q.length < 1) { closeDropdown(); return; }

          const maps = window.mapsData || window.allMaps || window.mapStatsData || [];
          if (!maps.length) { closeDropdown(); return; }

          const lower = q.toLowerCase();
          const cleanQ = lower.replace(/^[^a-zA-Z0-9а-яА-Я0-9]+/, '');
          const startsMap = [], containsMap = [], mapperMatches = [];

          for (const m of maps) {
            if (!m) continue;
            const mName = String(m.map || m.name || '');
            if (!mName) continue;

            const lowerName = mName.toLowerCase();
            const cleanName = lowerName.replace(/^[^a-zA-Z0-9а-яА-Я0-9]+/, '');

            if (lowerName.startsWith(lower) || (cleanQ && cleanName.startsWith(cleanQ))) {
              startsMap.push(m);
            } else if (lowerName.includes(lower) || (cleanQ && cleanName.includes(cleanQ))) {
              containsMap.push(m);
            } else if (m.mapper && String(m.mapper).toLowerCase().includes(lower)) {
              mapperMatches.push(m);
            }

            if (startsMap.length + containsMap.length + mapperMatches.length >= 50) break;
          }

          const combined = [...startsMap, ...containsMap, ...mapperMatches];
          const uniqueMaps = [];
          const seen = new Set();
          for (const item of combined) {
            const name = (item.map || item.name).toLowerCase();
            if (!seen.has(name)) {
              seen.add(name);
              uniqueMaps.push(item);
            }
          }

          renderDropdown(uniqueMaps.slice(0, 10), q);
        }

        input.addEventListener('input', triggerAutocomplete);
        input.addEventListener('focus', triggerAutocomplete);

        input.addEventListener('keydown', (e) => {
          if (dropdown.style.display === 'none' || currentItems.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = activeIdx + 1 >= currentItems.length ? 0 : activeIdx + 1;
            setActive(nextIdx);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIdx = activeIdx - 1 < 0 ? currentItems.length - 1 : activeIdx - 1;
            setActive(prevIdx);
          } else if (e.key === 'Enter') {
            if (activeIdx >= 0) {
              e.preventDefault();
              selectItem(activeIdx);
            }
          } else if (e.key === 'Escape') {
            closeDropdown();
          }
        });

        document.addEventListener('click', (e) => {
          if (!wrap.contains(e.target)) closeDropdown();
        });
      }
    }
  }, 100);
}



const icons = {
  search: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>',
  loader: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>',
  trophy: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffa500" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>',
  arrowRight: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>',
  arrowUpDown: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><path d="m21 16-4 4-4-4"></path><path d="M17 20V4"></path><path d="m3 8 4-4 4 4"></path><path d="M7 4v16"></path></svg>'
};

initLang();

document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const panels = document.querySelectorAll('.glass-panel:not(.leaderboard-panel)');

  if (hasFinePointer && !reducedMotion) {
    panels.forEach(panel => {
      let frame = 0;
      panel.addEventListener('pointermove', event => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          const rect = panel.getBoundingClientRect();
          panel.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
          panel.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
          frame = 0;
        });
      }, { passive: true });
    });
  }

  if (reducedMotion) return;

  const targets = document.querySelectorAll('.inner-page-shell > *, .page-about .glass-panel, .compare-scenario');
  targets.forEach((target, index) => {
    target.classList.add('ui-reveal');
    target.style.setProperty('--reveal-delay', `${Math.min(index, 7) * 55}ms`);
  });

  requestAnimationFrame(() => document.body.classList.add('ui-ready'));
});

window.setupPlayerAutocomplete = function (inputId, onSelect) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const wrap = input.parentElement;
  if (!wrap) return;
  wrap.style.position = 'relative';
  wrap.style.zIndex = '100';

  // Ensure dropdown container with class 'player-autocomplete' (matches css/style.css!)
  let dropdown = wrap.querySelector('.player-autocomplete');
  if (!dropdown) {
    const oldDrop = wrap.querySelector('.player-autocomplete-dropdown');
    if (oldDrop) oldDrop.remove();

    dropdown = document.createElement('div');
    dropdown.className = 'player-autocomplete';
    dropdown.style.display = 'none';
    wrap.appendChild(dropdown);
  }

  let activeIdx = -1;
  let currentItems = [];
  let currentQuery = '';

  function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function highlightMatch(text, query) {
    if (!text || !query) return escHtml(text || '');
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escHtml(text);
    return escHtml(text.slice(0, idx))
      + '<strong class="ac-hl" style="color:var(--accent,#ffa500);font-weight:bold">' + escHtml(text.slice(idx, idx + query.length)) + '</strong>'
      + escHtml(text.slice(idx + query.length));
  }

  function renderDropdown() {
    if (currentItems.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    dropdown.innerHTML = currentItems.map((name, i) => `
      <a class="ac-player-item ${i === activeIdx ? 'is-active' : ''}" data-idx="${i}" href="/player?name=${encodeURIComponent(name)}">
        <span class="ac-player-name">${highlightMatch(name, currentQuery)}</span>
      </a>
    `).join('');

    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.ac-player-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = Number(el.dataset.idx);
        selectItem(idx);
      });
      el.addEventListener('mouseenter', () => setActive(+el.dataset.idx));
    });
  }

  function setActive(idx) {
    activeIdx = idx;
    dropdown.querySelectorAll('.ac-player-item').forEach((el, i) => {
      const isAct = i === idx;
      el.classList.toggle('is-active', isAct);
    });

    if (idx >= 0) {
      const activeEl = dropdown.querySelectorAll('.ac-player-item')[idx];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  function selectItem(idx) {
    const pName = currentItems[idx];
    if (!pName) return;
    input.value = pName;
    dropdown.style.display = 'none';
    activeIdx = -1;
    if (typeof onSelect === 'function') {
      onSelect(pName);
    } else {
      window.location.href = `/player?name=${encodeURIComponent(pName)}`;
    }
  }

  function triggerAutocomplete() {
    const sErr = document.getElementById('search-error');
    if (sErr) sErr.classList.add('hidden');

    const q = input.value.trim();
    currentQuery = q;
    if (q.length < 1) {
      currentItems = [];
      dropdown.style.display = 'none';
      activeIdx = -1;
      return;
    }

    const playersList = window.uniquePlayersData || window.uniquePlayers || (window.playersData ? window.playersData.map(p => p.name) : []);
    if (!playersList || !playersList.length) {
      currentItems = [];
      dropdown.style.display = 'none';
      return;
    }

    const lower = q.toLowerCase();
    const cleanQ = lower.replace(/^[^a-zA-Z0-9а-яА-Я0-9]+/, '');
    const starts = [];
    const contains = [];

    for (const pName of playersList) {
      if (!pName) continue;
      if (window.isBlacklisted && window.isBlacklisted(pName)) continue;

      const lowerName = String(pName).toLowerCase();
      const cleanName = lowerName.replace(/^[^a-zA-Z0-9а-яА-Я0-9]+/, '');

      if (lowerName.startsWith(lower) || (cleanQ && cleanName.startsWith(cleanQ))) {
        starts.push(pName);
      } else if (lowerName.includes(lower) || (cleanQ && cleanName.includes(cleanQ))) {
        contains.push(pName);
      }

      if (starts.length + contains.length >= 40) break;
    }

    const combined = [...starts, ...contains];
    const uniqueList = [];
    const seen = new Set();
    for (const p of combined) {
      const k = p.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        uniqueList.push(p);
      }
    }

    currentItems = uniqueList.slice(0, 10);
    activeIdx = -1;
    renderDropdown();
  }

  input.addEventListener('input', triggerAutocomplete);
  input.addEventListener('focus', triggerAutocomplete);

  input.addEventListener('keydown', (e) => {
    if (dropdown.style.display === 'none' || currentItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = activeIdx + 1 >= currentItems.length ? 0 : activeIdx + 1;
      setActive(nextIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = activeIdx - 1 < 0 ? currentItems.length - 1 : activeIdx - 1;
      setActive(prevIdx);
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && currentItems[activeIdx]) {
        e.preventDefault();
        selectItem(activeIdx);
      }
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      activeIdx = -1;
    }
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      dropdown.style.display = 'none';
      activeIdx = -1;
    }
  });
};

