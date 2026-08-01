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
    <header style="background:#222222;border-bottom:2px solid #ffa500;position:sticky;top:0;z-index:50;box-shadow:0 2px 8px rgba(0,0,0,0.6);">
      <div style="max-width:1280px;margin:0 auto;padding:0 0.25em 0 1em;height:3em;display:flex;align-items:center;justify-content:space-between;gap:0.75em;">

        <!-- Logo & Discord -->
        <div style="display:flex;align-items:center;gap:0.6em;flex-wrap:nowrap;">
          <a href="index.html" style="display:flex;align-items:center;gap:0.5em;text-decoration:none;color:#ffa500;font-weight:bold;font-size:1.1em;white-space:nowrap;">
            <img src="icon.png" alt="Logo" style="width:24px;height:24px;object-fit:contain;">
            <span>Map Mastery</span>
          </a>
          <span style="color:#555555;font-weight:bold;font-size:1em;user-select:none;">|</span>
          <a href="pvp.html" style="display:inline-flex;align-items:center;gap:0.35em;color:${activePage === 'pvp' ? '#ffa500' : '#dfdede'};font-weight:bold;font-size:0.9em;text-decoration:none;transition:color 0.2s;">
            <span>⚔️ Player vs Player</span>
          </a>
          <span style="color:#555555;font-weight:bold;font-size:1em;user-select:none;">|</span>
          <a href="https://discord.gg/d5FyWS7Tpv" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:0.35em;color:#5865F2;font-weight:bold;font-size:0.95em;text-decoration:none;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 127.14 96.36" fill="#5865F2"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.68 1.76 1.36 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.91-72.14zM42.45 65.69c-6.58 0-12-6.04-12-13.44s5.3-13.44 12-13.44c6.74 0 12.07 6.09 12 13.44 0 7.4-5.26 13.44-12 13.44zm42.24 0c-6.58 0-12-6.04-12-13.44s5.3-13.44 12-13.44c6.74 0 12.07 6.09 12 13.44 0 7.4-5.26 13.44-12 13.44z"/></svg>
            <span>teeproject discord</span>
          </a>
        </div>

        <!-- Language Toggles & Map Search -->
        <div style="display:flex;align-items:center;gap:0.75em;flex:1;justify-content:flex-end;">
          <!-- Language Toggles -->
          <div style="display:flex;gap:2px;background:#1a1a1a;border:1px solid rgba(0,0,0,0.6);padding:2px;flex-shrink:0;">
            <button onclick="setLang('ru')" style="padding:0.25em 0.7em;font-size:0.8em;font-weight:bold;background:${currentLang === 'ru' ? '#ffa500' : 'transparent'};color:${currentLang === 'ru' ? '#111' : '#9a9a9a'};border:none;">RU</button>
            <button onclick="setLang('en')" style="padding:0.25em 0.7em;font-size:0.8em;font-weight:bold;background:${currentLang === 'en' ? '#ffa500' : 'transparent'};color:${currentLang === 'en' ? '#111' : '#9a9a9a'};border:none;">EN</button>
          </div>

          <!-- Map Search -->
          <form id="header-map-search-form" style="width:100%;max-width:28em;display:none;margin-right:0;" class="sm-show">
            <div style="position:relative;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#9a9a9a;pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
              <input
                type="text"
                id="header-map-search-input"
                placeholder="${currentLang === 'ru' ? 'Поиск карты (напр: Kintaro)' : 'Search map (e.g. Kintaro)'}"
                style="width:100%;padding:0.35em 0.75em 0.35em 2.2em;font-size:0.9em;box-sizing:border-box;background:#ffffff;color:#000000;border:2px solid rgba(0,0,0,0.4);font-weight:600;"
              />
            </div>
          </form>
        </div>

      </div>
    </header>
    <style>
      @media(min-width:600px){ .sm-show{ display:block !important; } }
    </style>
  `;
  document.getElementById('header-container').innerHTML = headerHtml;

  setTimeout(() => {
    const mapSearchForm = document.getElementById('header-map-search-form');
    if (mapSearchForm) {
      mapSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('header-map-search-input');
        if (input && input.value.trim()) {
          window.location.href = `map.html?name=${encodeURIComponent(input.value.trim())}`;
        }
      });
    }

    // ── Autocomplete ────────────────────────────────────────────────
    const input = document.getElementById('header-map-search-input');
    if (!input || !window.mapsData) return;

    // Build dropdown container
    const wrap = input.parentElement;
    wrap.style.position = 'relative';

    const dropdown = document.createElement('div');
    dropdown.id = 'map-autocomplete';
    dropdown.style.cssText = [
      'display:none',
      'position:absolute',
      'top:calc(100% + 4px)',
      'left:0',
      'right:0',
      'background:#1e1e1e',
      'border:1px solid rgba(255,165,0,0.6)',
      'border-radius:4px',
      'max-height:280px',
      'overflow-y:auto',
      'z-index:9999',
      'box-shadow:0 8px 24px rgba(0,0,0,0.8)',
      'font-size:0.88em'
    ].join(';');
    wrap.appendChild(dropdown);

    let activeIdx = -1;
    let currentItems = [];

    function escHtml(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function highlightMatch(text, query) {
      const idx = text.toLowerCase().indexOf(query.toLowerCase());
      if (idx === -1) return escHtml(text);
      return escHtml(text.slice(0, idx))
        + '<strong class="ac-hl" style="color:#ffa500;font-weight:bold">' + escHtml(text.slice(idx, idx + query.length)) + '</strong>'
        + escHtml(text.slice(idx + query.length));
    }

    function renderDropdown(items, query) {
      activeIdx = -1;
      currentItems = items;
      if (!items.length) { dropdown.style.display = 'none'; return; }

      dropdown.innerHTML = items.map((m, i) => `
        <div
          class="ac-item"
          data-idx="${i}"
          style="padding:0.45em 0.75em;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;gap:0.5em;color:#e2e8f0;"
        >
          <div style="display:flex;flex-direction:column;overflow:hidden;">
            <span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${highlightMatch(m.map, query)}</span>
            ${m.mapper ? `<span style="font-size:0.75em;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">by ${highlightMatch(m.mapper, query)}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:0.4em;white-space:nowrap;flex-shrink:0;">
            <span style="font-size:0.75em;padding:0.1em 0.4em;border-radius:3px;background:rgba(255,255,255,0.08);color:#cbd5e1;border:1px solid rgba(255,255,255,0.1);">${escHtml(m.server)}</span>
            <span style="font-size:0.8em;color:#ffa500;font-weight:bold;">${m.points}pts</span>
          </div>
        </div>
      `).join('');

      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.ac-item').forEach(el => {
        el.addEventListener('mouseenter', () => setActive(+el.dataset.idx));
        el.addEventListener('mouseleave', () => setActive(-1));
        el.addEventListener('mousedown', (e) => {
          e.preventDefault();
          selectItem(+el.dataset.idx);
        });
      });
    }

    function setActive(idx) {
      activeIdx = idx;
      dropdown.querySelectorAll('.ac-item').forEach((el, i) => {
        const isAct = i === idx;
        el.style.background = isAct ? '#ffa500' : 'transparent';
        el.style.color      = isAct ? '#111111' : '#e2e8f0';
        
        const hls = el.querySelectorAll('.ac-hl');
        hls.forEach(h => {
          h.style.color = isAct ? '#000000' : '#ffa500';
        });
        
        const sub = el.querySelector('span[style*="font-size:0.75em"]');
        if (sub) sub.style.color = isAct ? '#333333' : '#94a3b8';
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
      input.value = m.map;
      dropdown.style.display = 'none';
      window.location.href = `map.html?name=${encodeURIComponent(m.map)}`;
    }

    function closeDropdown() {
      dropdown.style.display = 'none';
      activeIdx = -1;
    }

    function triggerAutocomplete() {
      const q = input.value.trim();
      if (q.length < 1) { closeDropdown(); return; }
      const lower = q.toLowerCase();
      const starts = [], contains = [], mappers = [];
      for (const m of window.mapsData) {
        const name = m.map.toLowerCase();
        const mapper = (m.mapper || '').toLowerCase();
        if (name.startsWith(lower)) starts.push(m);
        else if (name.includes(lower)) contains.push(m);
        else if (mapper.includes(lower)) mappers.push(m);
        if (starts.length + contains.length + mappers.length >= 60) break;
      }
      renderDropdown([...starts, ...contains, ...mappers].slice(0, 12), q);
    }

    input.addEventListener('input', triggerAutocomplete);
    input.addEventListener('focus', triggerAutocomplete);

    input.addEventListener('keydown', (e) => {
      if (dropdown.style.display === 'none') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(Math.min(activeIdx + 1, currentItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(Math.max(activeIdx - 1, -1));
      } else if (e.key === 'Enter') {
        if (activeIdx >= 0) { e.preventDefault(); selectItem(activeIdx); }
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) closeDropdown();
    });
  }, 100);
}

function setupPlayerAutocomplete(inputId, onSelect = null) {
  setTimeout(() => {
    const input = document.getElementById(inputId);
    if (!input) return;

    const playersList = window.uniquePlayersData || (window.leaderboardData ? window.leaderboardData.map(p => p.name) : []);
    if (!playersList || playersList.length === 0) return;

    let wrap = input.parentElement;
    if (!wrap || getComputedStyle(wrap).position === 'static') {
      const parent = input.parentNode;
      const newWrap = document.createElement('div');
      newWrap.style.position = 'relative';
      newWrap.style.flex = '1';
      newWrap.style.minWidth = '0';
      newWrap.style.display = 'block';
      parent.insertBefore(newWrap, input);
      newWrap.appendChild(input);
      wrap = newWrap;
      input.style.width = '100%';
      input.style.boxSizing = 'border-box';
    }

    const dropdown = document.createElement('div');
    dropdown.id = inputId + '-autocomplete';
    dropdown.style.cssText = 'position:absolute;left:0;top:100%;right:0;z-index:999;background:#1a1a1a;border:2px solid #ffa500;max-height:180px;overflow-y:auto;display:none;box-shadow:0 4px 16px rgba(0,0,0,0.8);margin-top:2px;box-sizing:border-box;';
    wrap.appendChild(dropdown);

    let activeIdx = -1;
    let currentItems = [];

    function renderDropdown(items, query) {
      currentItems = items;
      dropdown.innerHTML = '';
      activeIdx = -1;
      if (items.length === 0) {
        dropdown.style.display = 'none';
        return;
      }

      const lowerQ = query.toLowerCase();
      items.forEach((pName, idx) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'ac-player-item';
        itemEl.style.cssText = 'padding:0.35em 0.7em;cursor:pointer;font-size:0.85em;color:#ffffff;font-weight:600;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.05);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

        const pLower = pName.toLowerCase();
        const matchIndex = pLower.indexOf(lowerQ);
        let nameHtml = escapeHtml(pName);
        if (matchIndex >= 0) {
          const before = escapeHtml(pName.substring(0, matchIndex));
          const match = escapeHtml(pName.substring(matchIndex, matchIndex + lowerQ.length));
          const after = escapeHtml(pName.substring(matchIndex + lowerQ.length));
          nameHtml = `${before}<span style="color:#ffa500;font-weight:bold;">${match}</span>${after}`;
        }

        itemEl.innerHTML = `<div style="overflow:hidden;text-overflow:ellipsis;">${nameHtml}</div>`;

        itemEl.addEventListener('mouseenter', () => setActive(idx));
        itemEl.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectItem(idx);
        });

        dropdown.appendChild(itemEl);
      });

      dropdown.style.display = 'block';
    }

    function setActive(idx) {
      activeIdx = idx;
      const items = dropdown.querySelectorAll('.ac-player-item');
      items.forEach((el, i) => {
        const isAct = i === idx;
        el.style.background = isAct ? '#ffa500' : 'transparent';
        el.style.color = isAct ? '#111111' : '#ffffff';
        const hl = el.querySelector('span[style*="color:#ffa500"]');
        if (hl) hl.style.color = isAct ? '#000000' : '#ffa500';
      });
      if (idx >= 0 && items[idx]) {
        items[idx].scrollIntoView({ block: 'nearest' });
      }
    }

    function selectItem(idx) {
      const pName = currentItems[idx];
      if (!pName) return;
      input.value = pName;
      dropdown.style.display = 'none';
      if (typeof onSelect === 'function') {
        onSelect(pName);
      } else {
        window.location.href = `player.html?name=${encodeURIComponent(pName)}`;
      }
    }

    function closeDropdown() {
      dropdown.style.display = 'none';
      activeIdx = -1;
    }

    function triggerAutocomplete() {
      const q = input.value.trim();
      if (q.length < 1) { closeDropdown(); return; }
      const lower = q.toLowerCase();
      const cleanQ = lower.replace(/^[^a-zA-Z0-9а-яА-Я0-9]+/, '');
      const starts = [], contains = [];

      for (const pName of playersList) {
        if (window.isBlacklisted && window.isBlacklisted(pName)) continue;
        const lowerName = pName.toLowerCase();
        const cleanName = lowerName.replace(/^[^a-zA-Z0-9а-яА-Я0-9]+/, '');

        if (lowerName.startsWith(lower) || (cleanQ && cleanName.startsWith(cleanQ))) {
          starts.push(pName);
        } else if (lowerName.includes(lower)) {
          contains.push(pName);
        }
        if (starts.length + contains.length >= 40) break;
      }
      renderDropdown([...starts, ...contains].slice(0, 10), q);
    }

    input.addEventListener('input', triggerAutocomplete);
    input.addEventListener('focus', triggerAutocomplete);

    input.addEventListener('keydown', (e) => {
      if (dropdown.style.display === 'none') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(Math.min(activeIdx + 1, currentItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(Math.max(activeIdx - 1, -1));
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
