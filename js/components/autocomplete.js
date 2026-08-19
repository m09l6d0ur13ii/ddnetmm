/* Reusable Autocomplete UI Components */

window.setupMapAutocomplete = function (inputId, onSelect) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (onSelect) input._onSelect = onSelect;
  if (input.dataset.mapAcInit === 'true') return;
  input.dataset.mapAcInit = 'true';

  const wrap = input.parentElement;
  if (!wrap) return;
  wrap.style.position = 'relative';
  if (!wrap.style.zIndex || wrap.style.zIndex === 'auto') {
    wrap.style.zIndex = '100';
  }

  let dropdown = wrap.querySelector('.map-autocomplete-dropdown') || wrap.querySelector('#map-autocomplete');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'map-autocomplete-dropdown player-autocomplete';
    dropdown.style.display = 'none';
    wrap.appendChild(dropdown);
  }

  let activeIdx = -1;
  let currentItems = [];
  let currentQuery = '';

  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

    dropdown.innerHTML = currentItems.map((m, i) => {
      const mapName = m.map || m.name || '';
      const mapper = m.mapper || '';
      const server = m.server || m.type || 'DDNet';
      const points = (m.points !== undefined && m.points !== null) ? m.points : (m.pts || 0);

      return `
        <a class="ac-item ${i === activeIdx ? 'is-active' : ''}" data-idx="${i}" href="/map?name=${encodeURIComponent(mapName)}">
          <div class="ac-map-info">
            <span class="ac-map-name">${highlightMatch(mapName, currentQuery)}</span>
            ${mapper ? `<span class="ac-map-mapper">by ${highlightMatch(mapper, currentQuery)}</span>` : ''}
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
        const idx = Number(el.dataset.idx);
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
    const mapName = m.map || m.name || '';
    input.value = mapName;
    dropdown.style.display = 'none';
    activeIdx = -1;

    const callback = input._onSelect || onSelect;
    if (typeof callback === 'function') {
      callback(mapName, m);
    } else {
      window.location.href = `/map?name=${encodeURIComponent(mapName)}`;
    }
  }

  function triggerAutocomplete() {
    const q = input.value.trim();
    currentQuery = q;
    if (q.length < 1) {
      dropdown.style.display = 'none';
      activeIdx = -1;
      return;
    }

    if (typeof findMapMatches === 'function') {
      currentItems = findMapMatches(q, 10);
      renderDropdown();
    }
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

window.setupPlayerAutocomplete = function (inputId, onSelect) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (onSelect) input._onSelect = onSelect;
  if (input.dataset.playerAcInit === 'true') return;
  input.dataset.playerAcInit = 'true';

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
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    const callback = input._onSelect || onSelect;
    if (typeof callback === 'function') {
      callback(pName);
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
